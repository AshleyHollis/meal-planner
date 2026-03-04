"""Service layer for recurring meal template management."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from shared.db.models.recurring_meal import RecurringMealTemplate
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.recurring_meal import CreateRecurringMealTemplate, UpdateRecurringMealTemplate


class RecurringMealService:
    """Household-scoped recurring meal template operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def list_templates(self) -> list[RecurringMealTemplate]:
        """Return all recurring meal templates for the household.

        Active templates are returned first, then ordered by day and meal_type.
        """
        stmt = (
            select(RecurringMealTemplate)
            .where(RecurringMealTemplate.household_id == self.household_id)
            .order_by(
                RecurringMealTemplate.is_active.desc(),
                RecurringMealTemplate.day,
                RecurringMealTemplate.meal_type,
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_template(self, data: CreateRecurringMealTemplate) -> RecurringMealTemplate:
        """Create a new recurring meal template.

        Raises:
            HTTPException 409: If a template already exists for the same
                household/day/meal_type combination.
        """
        template = RecurringMealTemplate(
            household_id=self.household_id,
            day=data.day,
            meal_type=data.meal_type,
            recipe_id=data.recipe_id,
            recipe_title=data.recipe_title,
            is_active=True,
        )
        self.session.add(template)
        try:
            await self.session.flush()
        except IntegrityError:
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A recurring template already exists for day={data.day}, "
                f"meal_type='{data.meal_type}'",
            ) from None
        return template

    async def update_template(
        self,
        template_id: UUID,
        data: UpdateRecurringMealTemplate,
    ) -> RecurringMealTemplate:
        """Partially update a recurring meal template.

        Raises:
            HTTPException 404: If the template is not found.
        """
        stmt = select(RecurringMealTemplate).where(
            RecurringMealTemplate.id == template_id,
            RecurringMealTemplate.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        template = result.scalar_one_or_none()
        if template is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recurring meal template not found",
            )

        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(template, field, value)
        await self.session.flush()
        return template

    async def delete_template(self, template_id: UUID) -> None:
        """Delete a recurring meal template.

        Raises:
            HTTPException 404: If the template is not found.
        """
        stmt = select(RecurringMealTemplate).where(
            RecurringMealTemplate.id == template_id,
            RecurringMealTemplate.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        template = result.scalar_one_or_none()
        if template is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recurring meal template not found",
            )

        await self.session.delete(template)
        await self.session.flush()
