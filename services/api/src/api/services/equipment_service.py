"""Equipment CRUD service -- scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models.equipment import Equipment, EquipmentMode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.equipment import CreateEquipment


class EquipmentService:
    """Household-scoped equipment operations."""

    @staticmethod
    async def list_equipment(
        session: AsyncSession,
        household_id: UUID,
    ) -> list[Equipment]:
        """Return all equipment for a household."""
        stmt = (
            select(Equipment).where(Equipment.household_id == household_id).order_by(Equipment.name)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def register_equipment(
        session: AsyncSession,
        household_id: UUID,
        data: CreateEquipment,
    ) -> Equipment:
        """Register new equipment with its modes."""
        equipment = Equipment(
            household_id=household_id,
            name=data.name,
        )
        session.add(equipment)
        await session.flush()

        for mode_data in data.modes:
            mode = EquipmentMode(
                equipment_id=equipment.id,
                name=mode_data.name,
                category=mode_data.category,
                min_temp=mode_data.min_temp,
                max_temp=mode_data.max_temp,
            )
            session.add(mode)

        await session.flush()
        await session.refresh(equipment, attribute_names=["modes"])
        return equipment
