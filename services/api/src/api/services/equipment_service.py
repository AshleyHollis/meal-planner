"""Equipment CRUD service -- scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models.equipment import Equipment, EquipmentMode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.equipment import CreateEquipment


class EquipmentService:
    """Household-scoped equipment operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def list_equipment(self) -> list[Equipment]:
        """Return all equipment for a household."""
        stmt = (
            select(Equipment)
            .where(Equipment.household_id == self.household_id)
            .order_by(Equipment.name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def register_equipment(
        self,
        data: CreateEquipment,
    ) -> Equipment:
        """Register new equipment with its modes."""
        equipment = Equipment(
            household_id=self.household_id,
            name=data.name,
        )
        self.session.add(equipment)
        await self.session.flush()

        for mode_data in data.modes:
            mode = EquipmentMode(
                equipment_id=equipment.id,
                name=mode_data.name,
                category=mode_data.category,
                min_temp=mode_data.min_temp,
                max_temp=mode_data.max_temp,
            )
            self.session.add(mode)

        await self.session.flush()
        await self.session.refresh(equipment, attribute_names=["modes"])
        return equipment
