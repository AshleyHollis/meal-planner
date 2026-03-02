// Food categories with curated Unsplash photo IDs
// URL format: https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w={w}&h={h}&q=80

const FOOD_CATEGORIES: Record<string, string> = {
  chicken: "1604908177453-7462950a6a3b",
  beef: "1588168333986-5078d3ae3976",
  pasta: "1621996346565-e3dbc646d9a9",
  fish: "1606728035253-49e8a23146de",
  salmon: "1467003909585-2f8a72700288",
  salad: "1512621776951-a57141f2eefd",
  soup: "1547592166-23ac45744acd",
  steak: "1558030006-450675393462",
  rice: "1516684732162-798a0062be99",
  vegetable: "1540420773420-3366772f4999",
  pizza: "1565299624946-b28f40a0ae38",
  sandwich: "1528735602780-2552fd46c7af",
  curry: "1455619452474-d2be8b1e70cd",
  stirfry: "1512058564366-18510be2db19",
  roast: "1544025162-d76694265947",
  seafood: "1535140728325-a4d3707eee61",
  burger: "1568901346375-23c9450c58cd",
  tacos: "1565299585323-38d6b0865b47",
  breakfast: "1533089860892-a7c6f0a88666",
  dessert: "1488477181946-6428a0291777",
  default: "1504674900247-0877df9cc836",
};

// Keywords that map to categories
const KEYWORD_MAP: Record<string, string> = {
  chicken: "chicken",
  poultry: "chicken",
  thigh: "chicken",
  breast: "chicken",
  wing: "chicken",
  beef: "beef",
  steak: "steak",
  mince: "beef",
  roast: "roast",
  pasta: "pasta",
  spaghetti: "pasta",
  penne: "pasta",
  lasagna: "pasta",
  noodle: "pasta",
  fish: "fish",
  salmon: "salmon",
  tuna: "fish",
  cod: "fish",
  prawn: "seafood",
  shrimp: "seafood",
  salad: "salad",
  lettuce: "salad",
  caesar: "salad",
  soup: "soup",
  broth: "soup",
  chowder: "soup",
  rice: "rice",
  risotto: "rice",
  fried_rice: "rice",
  vegetable: "vegetable",
  vegan: "vegetable",
  veggie: "vegetable",
  pizza: "pizza",
  sandwich: "sandwich",
  wrap: "sandwich",
  sub: "sandwich",
  curry: "curry",
  thai: "curry",
  indian: "curry",
  masala: "curry",
  stirfry: "stirfry",
  stir: "stirfry",
  wok: "stirfry",
  burger: "burger",
  hamburger: "burger",
  taco: "tacos",
  burrito: "tacos",
  mexican: "tacos",
  enchilada: "tacos",
  pepper: "vegetable",
  stuffed: "roast",
  primavera: "pasta",
  lemon: "chicken",
  garlic: "chicken",
  grilled: "steak",
  baked: "roast",
  pancake: "breakfast",
  egg: "breakfast",
  toast: "breakfast",
  cake: "dessert",
  sweet: "dessert",
  brownie: "dessert",
  cookie: "dessert",
};

const CATEGORY_COLORS: Record<string, string> = {
  chicken: "from-orange-400 to-amber-500",
  beef: "from-red-700 to-red-900",
  pasta: "from-yellow-400 to-orange-400",
  fish: "from-blue-400 to-cyan-500",
  salmon: "from-orange-300 to-pink-400",
  salad: "from-green-400 to-emerald-500",
  soup: "from-amber-400 to-orange-500",
  steak: "from-red-600 to-red-800",
  rice: "from-yellow-200 to-amber-300",
  vegetable: "from-green-500 to-lime-500",
  pizza: "from-red-400 to-orange-500",
  sandwich: "from-amber-400 to-yellow-500",
  curry: "from-orange-500 to-yellow-600",
  stirfry: "from-green-400 to-yellow-500",
  roast: "from-amber-600 to-amber-800",
  seafood: "from-blue-500 to-teal-500",
  burger: "from-amber-500 to-orange-600",
  tacos: "from-yellow-500 to-orange-500",
  breakfast: "from-yellow-300 to-amber-400",
  dessert: "from-pink-400 to-rose-500",
  default: "from-gray-400 to-gray-600",
};

export function getMealCategory(mealName: string): string {
  const lower = mealName.toLowerCase();
  const words = lower.split(/\s+/);
  for (const word of words) {
    const category = KEYWORD_MAP[word];
    if (category) return category;
  }
  // Try substring match
  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return "default";
}

export function getMealImageUrl(
  mealName: string,
  width = 800,
  height = 600,
): string {
  const category = getMealCategory(mealName);
  const photoId = FOOD_CATEGORIES[category] ?? FOOD_CATEGORIES.default;
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
}
