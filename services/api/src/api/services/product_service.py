"""Product CRUD service – scoped by household."""

from __future__ import annotations

from uuid import UUID

from shared.db.models.ingredient import Ingredient
from shared.db.models.product import Product
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.product import CreateProduct, UpdateProduct


class ProductService:
    """Household-scoped product mapping operations."""

    def __init__(self, session: AsyncSession, household_id: UUID) -> None:
        self.session = session
        self.household_id = household_id

    async def list_products(self) -> list[Product]:
        """Return all product mappings for a household, ordered by ingredient name."""
        stmt = (
            select(Product)
            .join(Ingredient, Product.ingredient_id == Ingredient.id)
            .where(Product.household_id == self.household_id)
            .order_by(Ingredient.name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_product(self, data: CreateProduct) -> Product:
        """Create a product mapping for the household.

        Raises ValueError if the ingredient does not exist, or if a mapping
        already exists for this household + ingredient combination.
        """
        # Verify ingredient exists
        ing_result = await self.session.execute(
            select(Ingredient).where(Ingredient.id == data.ingredient_id)
        )
        if ing_result.scalar_one_or_none() is None:
            raise ValueError("Ingredient not found")

        product = Product(
            household_id=self.household_id,
            ingredient_id=data.ingredient_id,
            brand=data.brand,
            product_name=data.product_name,
            size_desc=data.size_desc,
            price=data.price,
            shop=data.shop,
            notes=data.notes,
        )
        self.session.add(product)
        try:
            await self.session.flush()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ValueError("Product mapping already exists for this ingredient") from exc

        await self.session.refresh(product, attribute_names=["ingredient"])
        return product

    async def update_product(self, product_id: UUID, data: UpdateProduct) -> Product | None:
        """Update a product mapping. Returns None if not found."""
        stmt = select(Product).where(
            Product.id == product_id,
            Product.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        product = result.scalar_one_or_none()
        if product is None:
            return None

        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(product, field, value)

        await self.session.flush()
        await self.session.refresh(product)
        return product

    async def delete_product(self, product_id: UUID) -> bool:
        """Delete a product mapping. Returns True if deleted, False if not found."""
        stmt = select(Product).where(
            Product.id == product_id,
            Product.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        product = result.scalar_one_or_none()
        if product is None:
            return False

        await self.session.delete(product)
        await self.session.flush()
        return True

    async def get_product(self, product_id: UUID) -> Product | None:
        """Return a single product by ID for the household. Returns None if not found."""
        stmt = select(Product).where(
            Product.id == product_id,
            Product.household_id == self.household_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search_products(self, query: str) -> list[Product]:
        """Search products by brand, product_name, or shop (case-insensitive)."""
        pattern = f"%{query}%"
        stmt = (
            select(Product)
            .where(
                Product.household_id == self.household_id,
                or_(
                    Product.brand.ilike(pattern),
                    Product.product_name.ilike(pattern),
                    Product.shop.ilike(pattern),
                ),
            )
            .order_by(Product.brand)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
