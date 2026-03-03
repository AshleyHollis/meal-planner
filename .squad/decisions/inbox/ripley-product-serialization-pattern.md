# Decision: Product Mapping Routes — Manual Serialization Pattern

**Author:** Ripley (Backend Dev)  
**Date:** 2026-03-03  
**Status:** Implemented

## Context

The `ProductResponse` Pydantic model includes an `ingredient_name: str` field that is not a column
on the `Product` ORM model — it must be populated from the eagerly-loaded `ingredient` relationship.

`model_validate(product)` with `from_attributes=True` cannot populate `ingredient_name` because
it's not an ORM attribute. Passing `**product.__dict__` also fails because SQLAlchemy's internal
state dict (`_sa_instance_state`, unloaded attributes) is unreliable for direct dict unpacking.

## Decision

Use a `_to_response(product: Product) -> ProductResponse` helper that explicitly maps every field:

```python
def _to_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        household_id=product.household_id,
        ...
        ingredient_name=product.ingredient.name if product.ingredient else "",
        created_at=product.created_at,
        updated_at=product.updated_at,
    )
```

Also: after `session.flush()`, call bare `session.refresh(product)` (not with `attribute_names`)
to ensure `updated_at` is reloaded from the DB server default before the route handler accesses it.

## Rationale

- Explicit is better than implicit — no hidden ORM state bugs
- `ingredient` is `lazy="selectin"` so it's always loaded; safe to access directly
- The `refresh()` pattern ensures server-side timestamps are available without greenlet errors

## Impact

- Pattern to use in any future route where a response model includes derived/joined fields
- Applies to: ProductResponse; may apply to future response models that embed joined data
