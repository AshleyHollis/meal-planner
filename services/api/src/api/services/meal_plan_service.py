"""Meal plan service – create, read, update plans and slots."""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from shared.config import get_settings
from shared.db.models.inventory import InventoryItem
from shared.db.models.meal_plan import MealPlan, MealSlot
from shared.db.models.recipe import Recipe, RecipeIngredient, RecipeStep
from shared.logging.config import get_logger
from shared.queue.client import enqueue_message
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.meal_plan import (
    CreateMealPlan,
    SaveVariationRequest,
    UpdateMealSlot,
    UpdatePlanStatus,
    UpdateSlotStatus,
)

logger = get_logger(__name__)

# LLM defaults for cook-time adaptation
_ADAPT_TIMEOUT = 10
_ADAPT_MAX_TOKENS = 2048
_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
}

_ADAPT_PROMPT_TEMPLATE = """You are a cooking assistant. Adapt the following recipe for a {effort_level} cooking session.

EFFORT LEVELS:
- quick: Simplify steps, reduce cook time, suggest shortcuts (e.g. pre-made ingredients, microwave)
- standard: Keep the recipe as-is with minor optimizations
- elaborate: Add extra steps for better flavor (e.g. marinating, toasting spices, homemade sauces)

RECIPE: {title}
Description: {description}

CURRENT STEPS:
{steps_text}

AVAILABLE EQUIPMENT:
{equipment_text}

Respond ONLY with a JSON array of adapted steps. Each step object must have:
- "step_order": int (1-based)
- "instruction": string
- "duration_min": int or null

Example: [{{"step_order": 1, "instruction": "Preheat oven to 200C", "duration_min": 5}}]

Adapt the recipe now."""


class MealPlanService:
    """Household-scoped meal plan operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def create_plan(
        self,
        data: CreateMealPlan,
    ) -> MealPlan:
        """Create a draft meal plan and enqueue generation request.

        Raises:
            HTTPException 409: If the household already has an active or draft plan.
        """
        existing = await self.session.execute(
            select(MealPlan).where(
                MealPlan.household_id == self.household_id,
                MealPlan.status.in_(["draft", "active"]),
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Household already has an active or in-progress meal plan",
            )

        plan = MealPlan(
            household_id=self.household_id,
            week_start_date=data.week_start_date,
            status="draft",
        )
        self.session.add(plan)
        await self.session.flush()

        message = {
            "meal_plan_id": str(plan.id),
            "household_id": str(self.household_id),
            "week_start_date": data.week_start_date.isoformat(),
        }
        if data.cuisine_preferences:
            message["cuisine_preferences"] = data.cuisine_preferences
        if data.meal_types:
            message["meal_types"] = data.meal_types

        enqueue_message(message)

        return plan

    async def get_plan(
        self,
        plan_id: UUID,
    ) -> MealPlan | None:
        """Return a single meal plan with slots, or None if not found."""
        stmt = select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_plan(self) -> MealPlan | None:
        """Return the current active meal plan for the household."""
        stmt = select(MealPlan).where(
            MealPlan.household_id == self.household_id,
            MealPlan.status == "active",
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_plans(
        self,
        status: str | None = None,
        sort: str = "created_at",
        order: str = "desc",
    ) -> list[MealPlan]:
        """Return all meal plans for the household with optional filtering and sorting."""
        _sort_cols = {
            "created_at": MealPlan.created_at,
            "week_start_date": MealPlan.week_start_date,
        }
        sort_col = _sort_cols.get(sort, MealPlan.created_at)
        stmt = select(MealPlan).where(MealPlan.household_id == self.household_id)
        if status:
            stmt = stmt.where(MealPlan.status == status)
        stmt = stmt.order_by(sort_col.asc()) if order == "asc" else stmt.order_by(sort_col.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_stats(self) -> dict:
        """Return aggregate stats for the household's meal plans."""
        # Plans grouped by status
        plans_stmt = (
            select(MealPlan.status, func.count(MealPlan.id))
            .where(MealPlan.household_id == self.household_id)
            .group_by(MealPlan.status)
        )
        plans_result = await self.session.execute(plans_stmt)
        plans_by_status: dict[str, int] = {row[0]: row[1] for row in plans_result.all()}

        # Total meals cooked across all plans
        cooked_stmt = (
            select(func.count(MealSlot.id))
            .join(MealPlan)
            .where(
                MealPlan.household_id == self.household_id,
                MealSlot.status == "cooked",
            )
        )
        cooked_result = await self.session.execute(cooked_stmt)
        total_meals_cooked: int = cooked_result.scalar() or 0

        # Inventory items expiring within 7 days
        soon = datetime.now(UTC) + timedelta(days=7)
        expiring_stmt = select(func.count(InventoryItem.id)).where(
            InventoryItem.household_id == self.household_id,
            InventoryItem.expiry_date.isnot(None),
            InventoryItem.expiry_date <= soon,
        )
        expiring_result = await self.session.execute(expiring_stmt)
        items_expiring_soon: int = expiring_result.scalar() or 0

        return {
            "plans_by_status": plans_by_status,
            "total_meals_cooked": total_meals_cooked,
            "items_expiring_soon": items_expiring_soon,
        }

    async def update_slot(
        self,
        plan_id: UUID,
        slot_id: UUID,
        data: UpdateMealSlot,
    ) -> MealSlot | None:
        """Update a meal slot's recipe. Returns None if not found."""
        stmt = (
            select(MealSlot)
            .join(MealPlan)
            .where(
                MealSlot.id == slot_id,
                MealSlot.meal_plan_id == plan_id,
                MealPlan.household_id == self.household_id,
            )
        )
        result = await self.session.execute(stmt)
        slot = result.scalar_one_or_none()
        if slot is None:
            return None

        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(slot, field, value)
        await self.session.flush()
        return slot

    async def update_slot_status(
        self,
        plan_id: UUID,
        slot_id: UUID,
        data: UpdateSlotStatus,
    ) -> tuple[MealSlot, list[dict] | None]:
        """Mark a slot as cooked/skipped with timestamp.

        Returns tuple of (slot, deductions). Deductions is None unless transitioning to cooked.
        """
        stmt = (
            select(MealSlot)
            .join(MealPlan)
            .where(
                MealSlot.id == slot_id,
                MealSlot.meal_plan_id == plan_id,
                MealPlan.household_id == self.household_id,
            )
        )
        result = await self.session.execute(stmt)
        slot = result.scalar_one_or_none()
        if slot is None:
            return None, None

        deductions = None

        # 409 guard: prevent double-cook
        if data.status == "cooked" and slot.cooked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Meal slot already marked as cooked",
            )

        # If transitioning to cooked and wasn't already cooked
        if data.status == "cooked" and slot.status != "cooked" and slot.recipe_id is not None:
            from .inventory_service import InventoryService

            inv_service = InventoryService(self.session, self.household_id)
            deductions = await inv_service.deduct_for_recipe(slot.recipe_id)

        slot.status = data.status
        if data.status == "cooked":
            slot.cooked_at = datetime.now(UTC)
        else:
            slot.cooked_at = None
        await self.session.flush()
        return slot, deductions

    async def update_plan_status(
        self,
        plan_id: UUID,
        data: UpdatePlanStatus,
    ) -> MealPlan | None:
        """Transition plan status: draft -> active -> completed."""
        stmt = select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        plan = result.scalar_one_or_none()
        if plan is None:
            return None

        plan.status = data.status
        await self.session.flush()
        return plan

    async def delete_plan(self, plan_id: UUID) -> None:
        """Delete a meal plan and its slots.

        Only plans with status "failed" or "completed" can be deleted.

        Raises:
            HTTPException 404: If plan not found.
            HTTPException 409: If plan status is not failed or completed.
        """
        stmt = select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        plan = result.scalar_one_or_none()

        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meal plan not found",
            )

        if plan.status not in ("failed", "completed"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete meal plan with status '{plan.status}'. Only 'failed' or 'completed' plans can be deleted.",
            )

        # Delete the plan (cascade will delete slots automatically)
        await self.session.delete(plan)
        await self.session.flush()

    async def adapt_slot(
        self,
        plan_id: UUID,
        slot_id: UUID,
        effort_level: str,
    ) -> dict | None:
        """Adapt a meal slot's recipe for a different effort level via LLM.

        Loads the slot + recipe, calls adapt_recipe() in a thread pool (sync LLM call),
        and returns the adapted recipe dict. Returns None if slot or recipe not found.
        """
        stmt = (
            select(MealSlot)
            .join(MealPlan)
            .where(
                MealSlot.id == slot_id,
                MealSlot.meal_plan_id == plan_id,
                MealPlan.household_id == self.household_id,
            )
        )
        result = await self.session.execute(stmt)
        slot = result.scalar_one_or_none()
        if slot is None or slot.recipe is None:
            return None

        recipe = slot.recipe
        recipe_dict = {
            "title": recipe.title,
            "description": recipe.description or "",
            "servings": recipe.servings,
            "steps": [
                {
                    "step_order": step.step_order,
                    "instruction": step.instruction,
                    "duration_min": step.duration_min,
                }
                for step in sorted(recipe.steps, key=lambda s: s.step_order)
            ],
        }

        adapted = await asyncio.to_thread(self.adapt_recipe, recipe_dict, effort_level)
        return {
            "plan_id": str(plan_id),
            "slot_id": str(slot_id),
            "recipe_id": str(recipe.id),
            "title": recipe.title,
            "effort_level": effort_level,
            "adapted_steps": adapted.get("steps", []),
        }

    async def save_variation(
        self,
        recipe_id: UUID,
        data: SaveVariationRequest,
    ) -> dict | None:
        """Save a recipe variation as a new recipe row for future reuse.

        Creates a copy of the original recipe with source_recipe_id pointing back.
        Copies all ingredients and steps. Returns None if original not found.
        """
        stmt = select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        original = result.scalar_one_or_none()
        if original is None:
            return None

        variation = Recipe(
            household_id=self.household_id,
            title=data.title or f"{original.title} (variation)",
            description=data.notes or original.description,
            servings=original.servings,
            prep_time_min=original.prep_time_min,
            cook_time_min=original.cook_time_min,
            is_ai_generated=original.is_ai_generated,
            source_recipe_id=original.id,
            cuisine_type=original.cuisine_type,
        )
        self.session.add(variation)
        await self.session.flush()

        for ri in original.ingredients:
            self.session.add(
                RecipeIngredient(
                    recipe_id=variation.id,
                    ingredient_id=ri.ingredient_id,
                    quantity=ri.quantity,
                    unit=ri.unit,
                    is_optional=ri.is_optional,
                )
            )
        for step in original.steps:
            self.session.add(
                RecipeStep(
                    recipe_id=variation.id,
                    step_order=step.step_order,
                    instruction=step.instruction,
                    equipment_mode_id=step.equipment_mode_id,
                    temperature=step.temperature,
                    duration_min=step.duration_min,
                )
            )
        await self.session.flush()

        return {
            "recipe_id": str(original.id),
            "variation_id": str(variation.id),
            "title": variation.title,
            "status": "saved",
        }

    @staticmethod
    def adapt_recipe(
        recipe: dict,
        effort_level: str,
        equipment: list[dict] | None = None,
    ) -> dict:
        """Adapt recipe steps based on effort level via direct LLM call.

        Args:
            recipe: Recipe data dict with title, description, steps.
            effort_level: One of "quick", "standard", "elaborate".
            equipment: Optional list of equipment dicts with name/modes.

        Returns:
            Recipe dict with adapted steps merged in.
        """
        steps_text = "\n".join(
            f"{s.get('step_order', i + 1)}. {s.get('instruction', '')}"
            f" ({s.get('duration_min', '?')} min)"
            for i, s in enumerate(recipe.get("steps", []))
        )

        equipment_text = (
            ", ".join(e.get("name", "") for e in equipment)
            if equipment
            else "Standard kitchen equipment"
        )

        prompt = _ADAPT_PROMPT_TEMPLATE.format(
            effort_level=effort_level,
            title=recipe.get("title", "Untitled"),
            description=recipe.get("description", ""),
            steps_text=steps_text or "No steps provided",
            equipment_text=equipment_text,
        )

        raw = _call_llm(prompt)
        adapted_steps = _parse_adapted_steps(raw)

        # Merge adapted steps back into recipe, preserving everything else
        result = dict(recipe)
        result["steps"] = adapted_steps
        return result


def _call_llm(prompt: str) -> str:
    """Call the configured LLM provider synchronously. Direct call for <10s adaptation."""
    settings = get_settings()
    provider = settings.llm.provider
    api_key = settings.llm.api_key
    temperature = settings.llm.temperature
    model_override = settings.llm.model

    logger.info("adapt_llm_call_start", provider=provider, temperature=temperature)

    if provider == "anthropic":
        import anthropic

        model = model_override or _MODELS["anthropic"]
        client = anthropic.Anthropic(api_key=api_key, timeout=_ADAPT_TIMEOUT)
        response = client.messages.create(
            model=model,
            max_tokens=_ADAPT_MAX_TOKENS,
            temperature=temperature,
            system="You are a recipe adaptation assistant. Respond ONLY with valid JSON.",
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
    elif provider == "openai":
        import openai

        model = model_override or _MODELS["openai"]
        client = openai.OpenAI(api_key=api_key, timeout=_ADAPT_TIMEOUT)
        response = client.chat.completions.create(
            model=model,
            max_tokens=_ADAPT_MAX_TOKENS,
            temperature=temperature,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are a recipe adaptation assistant. Respond ONLY with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        text = response.choices[0].message.content or ""
    else:
        msg = f"Unsupported LLM provider: {provider}"
        raise ValueError(msg)

    logger.info("adapt_llm_call_complete", provider=provider)
    return text


def _parse_adapted_steps(raw: str) -> list[dict]:
    """Parse LLM response into a list of step dicts.

    Handles cases where the LLM wraps JSON in markdown code fences.
    """
    text = raw.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        steps = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("adapt_parse_failed", raw_length=len(raw))
        return []

    if not isinstance(steps, list):
        return []

    return [
        {
            "step_order": s.get("step_order", i + 1),
            "instruction": s.get("instruction", ""),
            "duration_min": s.get("duration_min"),
        }
        for i, s in enumerate(steps)
        if isinstance(s, dict)
    ]
