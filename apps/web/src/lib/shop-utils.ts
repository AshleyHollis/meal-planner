import type { GroceryItem } from "@/types";

export const OTHER_SHOP_VALUE = "__other__";
export const OTHER_SHOP_LABEL = "Other / Any Store";

export function normalizeShopName(shop: string): string {
  return shop.toLowerCase().trim();
}

export function getShopDisplayName(shop: string): string {
  if (shop === OTHER_SHOP_VALUE) {
    return OTHER_SHOP_LABEL;
  }

  return shop
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getItemShop(item: GroceryItem): string | null {
  const productShop = item.product?.shop?.trim();
  if (productShop) {
    return productShop;
  }

  const preferredStore = item.preferred_store?.trim();
  return preferredStore || null;
}
