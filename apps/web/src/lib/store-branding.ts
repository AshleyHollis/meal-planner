interface StoreBrand {
  abbreviation: string;
  color: string;     // Tailwind bg color class
  textColor: string; // Tailwind text color class
}

const STORE_BRANDS: Record<string, StoreBrand> = {
  costco: { abbreviation: "CO", color: "bg-red-600", textColor: "text-white" },
  woolworths: { abbreviation: "W", color: "bg-green-600", textColor: "text-white" },
  coles: { abbreviation: "C", color: "bg-red-500", textColor: "text-white" },
  aldi: { abbreviation: "A", color: "bg-blue-600", textColor: "text-white" },
  iga: { abbreviation: "IGA", color: "bg-red-700", textColor: "text-white" },
  "trader joe's": { abbreviation: "TJ", color: "bg-red-800", textColor: "text-white" },
  walmart: { abbreviation: "W", color: "bg-blue-700", textColor: "text-yellow-300" },
  kroger: { abbreviation: "K", color: "bg-blue-500", textColor: "text-white" },
  target: { abbreviation: "T", color: "bg-red-600", textColor: "text-white" },
  "whole foods": { abbreviation: "WF", color: "bg-green-700", textColor: "text-white" },
  generic: { abbreviation: "?", color: "bg-gray-500", textColor: "text-white" },
};

export function getStoreBrand(storeName: string): StoreBrand {
  const lower = storeName.toLowerCase().trim();
  return (
    STORE_BRANDS[lower] ?? {
      abbreviation: storeName.slice(0, 2).toUpperCase(),
      color: "bg-gray-500",
      textColor: "text-white",
    }
  );
}

export type { StoreBrand };
