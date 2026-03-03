# API Contracts: Grocery Enhancements

## Products API

### POST /api/v1/products

Create a product mapping.

**Request**:
```json
{
  "ingredient_id": "uuid",
  "brand": "Tyson",
  "product_name": "Boneless Skinless Chicken Breast",
  "size_desc": "2.5 lb bag",
  "price": 8.99,
  "shop": "Kroger",
  "notes": null
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "household_id": "uuid",
  "ingredient_id": "uuid",
  "ingredient_name": "chicken breast",
  "brand": "Tyson",
  "product_name": "Boneless Skinless Chicken Breast",
  "size_desc": "2.5 lb bag",
  "price": 8.99,
  "shop": "Kroger",
  "notes": null,
  "created_at": "2026-03-03T12:00:00Z",
  "updated_at": "2026-03-03T12:00:00Z"
}
```

**Errors**: 404 if ingredient not found. 409 if mapping already exists for this ingredient+household.

### GET /api/v1/products

List all product mappings for the household.

**Response** (200): Array of ProductResponse objects (same shape as POST response).

### PUT /api/v1/products/{product_id}

Update a product mapping. All fields optional (partial update).

**Request**:
```json
{
  "brand": "Perdue",
  "price": 9.49
}
```

**Response** (200): Updated ProductResponse.

**Errors**: 404 if product not found or doesn't belong to household.

### DELETE /api/v1/products/{product_id}

**Response**: 204 No Content.

### GET /api/v1/products/search?q={query}

Search products by brand, product name, or shop. Case-insensitive partial match.

**Response** (200): Array of ProductResponse matching the query.

---

## Extended Grocery List Response

### GET /api/v1/meal-plans/{meal_plan_id}/grocery-list

**Response** (200) — extended item shape:
```json
{
  "id": "uuid",
  "meal_plan_id": "uuid",
  "created_at": "2026-03-03T12:00:00Z",
  "items": [
    {
      "id": "uuid",
      "ingredient_id": "uuid",
      "ingredient_name": "chicken breast",
      "ingredient_category": "meat",
      "quantity_needed": 2.0,
      "unit": "lbs",
      "is_checked": false,
      "preferred_store": "Kroger",
      "product": {
        "id": "uuid",
        "brand": "Tyson",
        "product_name": "Boneless Skinless Chicken Breast",
        "size_desc": "2.5 lb bag",
        "price": 8.99,
        "shop": "Kroger"
      }
    },
    {
      "id": "uuid",
      "ingredient_id": "uuid",
      "ingredient_name": "olive oil",
      "ingredient_category": "pantry",
      "quantity_needed": 1.0,
      "unit": "tbsp",
      "is_checked": false,
      "preferred_store": null,
      "product": null
    }
  ]
}
```

Items with a product mapping include the `product` object. Items without a mapping have `product: null` and display as they do today.
