"use client";

import type { GroceryItem } from "@/types";
import { getStoreBrand } from "@/lib/store-branding";

interface ShopFilterProps {
  items: GroceryItem[];
  selectedShop: string | null;
  onFilterChange: (shop: string | null) => void;
}

function normalizeShopName(shop: string): string {
  return shop.toLowerCase().trim();
}

function ShopFilter({ items, selectedShop, onFilterChange }: ShopFilterProps) {
  // Derive distinct shops from product?.shop
  const shopCounts: Record<string, number> = {};
  let otherCount = 0;
  let allCount = items.length;

  for (const item of items) {
    const shop = item.product?.shop;
    if (shop) {
      const key = normalizeShopName(shop);
      shopCounts[key] = (shopCounts[key] ?? 0) + 1;
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
            {shopKey.charAt(0).toUpperCase() + shopKey.slice(1)}
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
              {shopCounts[shopKey]}
            </span>
          </button>
        );
      })}

      {/* Other */}
      {otherCount > 0 && (
        <button
          type="button"
          onClick={() => onFilterChange("__other__")}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedShop === "__other__"
              ? "bg-gray-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Other
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
