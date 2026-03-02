"""Tests for favorites endpoints."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import AsyncClient
from shared.db.models import Recipe
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture()
async def sample_recipe(session: AsyncSession) -> Recipe:
    """Seed a recipe for favorite tests."""
    now = datetime.now(UTC)
    recipe = Recipe(
        id=uuid4(),
        title="Test Recipe",
        description="A delicious test recipe",
        servings=4,
        prep_time_min=15,
        cook_time_min=30,
        created_at=now,
        updated_at=now,
    )
    session.add(recipe)
    await session.commit()  # Commit so it's available to API calls
    return recipe


@pytest.mark.asyncio()
async def test_add_favorite(client: AsyncClient, sample_recipe: Recipe) -> None:
    """Test adding a recipe to favorites."""
    response = await client.post(f"/api/v1/recipes/{sample_recipe.id}/favorite")
    assert response.status_code == 201
    data = response.json()
    assert data["recipe_id"] == str(sample_recipe.id)
    assert data["recipe_title"] == "Test Recipe"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio()
async def test_add_favorite_idempotent(client: AsyncClient, sample_recipe: Recipe) -> None:
    """Test that adding a favorite twice is idempotent."""
    # Add first time
    response1 = await client.post(f"/api/v1/recipes/{sample_recipe.id}/favorite")
    assert response1.status_code == 201
    favorite_id_1 = response1.json()["id"]

    # Add second time - should return same favorite
    response2 = await client.post(f"/api/v1/recipes/{sample_recipe.id}/favorite")
    assert response2.status_code == 201
    favorite_id_2 = response2.json()["id"]
    assert favorite_id_1 == favorite_id_2


@pytest.mark.asyncio()
async def test_add_favorite_recipe_not_found(client: AsyncClient) -> None:
    """Test adding a non-existent recipe returns 404."""
    fake_id = uuid4()
    response = await client.post(f"/api/v1/recipes/{fake_id}/favorite")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio()
async def test_remove_favorite(client: AsyncClient, sample_recipe: Recipe) -> None:
    """Test removing a favorite."""
    # Add favorite first
    await client.post(f"/api/v1/recipes/{sample_recipe.id}/favorite")

    # Remove it
    response = await client.delete(f"/api/v1/recipes/{sample_recipe.id}/favorite")
    assert response.status_code == 204

    # Verify it's gone by listing
    list_response = await client.get("/api/v1/favorites")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 0


@pytest.mark.asyncio()
async def test_remove_favorite_not_found(client: AsyncClient) -> None:
    """Test removing a non-existent favorite returns 404."""
    fake_id = uuid4()
    response = await client.delete(f"/api/v1/recipes/{fake_id}/favorite")
    assert response.status_code == 404


@pytest.mark.asyncio()
async def test_list_favorites_empty(client: AsyncClient) -> None:
    """Test listing favorites when none exist."""
    response = await client.get("/api/v1/favorites")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio()
async def test_list_favorites(
    client: AsyncClient, sample_recipe: Recipe, session: AsyncSession
) -> None:
    """Test listing multiple favorites."""
    # Add first favorite
    await client.post(f"/api/v1/recipes/{sample_recipe.id}/favorite")

    # Add second recipe and favorite it
    now = datetime.now(UTC)
    recipe2 = Recipe(
        id=uuid4(),
        title="Second Recipe",
        description="Another test recipe",
        servings=2,
        prep_time_min=10,
        cook_time_min=20,
        created_at=now,
        updated_at=now,
    )
    session.add(recipe2)
    await session.flush()
    await session.commit()  # Commit to make it available to the API calls
    await client.post(f"/api/v1/recipes/{recipe2.id}/favorite")

    # List favorites
    response = await client.get("/api/v1/favorites")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    titles = {item["recipe_title"] for item in data}
    assert titles == {"Test Recipe", "Second Recipe"}
