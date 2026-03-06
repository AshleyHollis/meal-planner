"use client";

import type { GroceryItem } from "@/types";
import { getStoreBrand } from "@/lib/store-branding";
import {
  getItemShop,
  getShopDisplayName,
  normalizeShopName,
  OTHER_SHOP_LABEL,
  OTHER_SHOP_VALUE,
} from "@/lib/shop-utils";

interface ShopFilterProps {
  items: GroceryItem[];
  selectedShop: string | null;
  onFilterChange: (shop: string | null) => void;
}

function ShopFilter({ items, selectedShop, onFilterChange }: ShopFilterProps) {
  const shopCounts: Record<string, { count: number; label: string }> = {};
  let otherCount = 0;
  const allCount = items.length;

  for (const item of items) {
    const shop = getItemShop(item);
    if (shop) {
      const key = normalizeShopName(shop);
      const existing = shopCounts[key] ?? {
        count: 0,
        label: getShopDisplayName(shop),
      };
      existing.count += 1;
      shopCounts[key] = existing;
    } else {
      otherCount++;
    }
  }

  const shops = Object.keys(shopCounts).sort();

  return (
    <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
      {/* All */}
      <button
        type="button"
        onClick={() => onFilterChange(null)}
        className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          selectedShop === null
            ? "bg-gray-800 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
        <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
          {allCount}
        </span>
      </button>

      {/* Per-shop */}
      {shops.map((shopKey) => {
        const brand = getStoreBrand(shopKey);
        const shop = shopCounts[shopKey];
        const isActive = selectedShop
          ? normalizeShopName(selectedShop) === shopKey
          : false;
        return (
          <button
            key={shopKey}
            type="button"
            onClick={() => onFilterChange(shopKey)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? `${brand.color} ${brand.textColor}`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {shop.label}
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
              {shop.count}
            </span>
          </button>
        );
      })}

      {/* Other */}
      {otherCount > 0 && (
        <button
          type="button"
          onClick={() => onFilterChange(OTHER_SHOP_VALUE)}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedShop === OTHER_SHOP_VALUE
              ? "bg-gray-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {OTHER_SHOP_LABEL}
          <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
            {otherCount}
          </span>
        </button>
      )}
    </div>
  );
}

export { ShopFilter };
export type { ShopFilterProps };
