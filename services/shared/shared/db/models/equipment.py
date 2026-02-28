"""Equipment and EquipmentMode models."""

from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, generate_uuid


class Equipment(Base, TimestampMixin):
    __tablename__ = "Equipment"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("Households.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    modes: Mapped[list["EquipmentMode"]] = relationship(
        "EquipmentMode",
        back_populates="equipment",
        lazy="selectin",
    )

    __table_args__ = (Index("ix_equipment_household", "household_id"),)


class EquipmentMode(Base):
    __tablename__ = "EquipmentModes"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=generate_uuid,
    )
    equipment_id: Mapped[UUID] = mapped_column(
        ForeignKey("Equipment.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # air, combi, slow, steam, etc.
    min_temp: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )  # Celsius
    max_temp: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    equipment: Mapped["Equipment"] = relationship(
        "Equipment",
        back_populates="modes",
    )

    __table_args__ = (Index("ix_modes_equipment", "equipment_id"),)
