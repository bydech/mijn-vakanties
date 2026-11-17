export const AVAILABLE_CATEGORY_ICONS = [
  "i-lucide-utensils",
  "i-lucide-shopping-cart",
  "i-lucide-car",
  "i-lucide-bed",
  "i-lucide-ticket",
  "i-lucide-shopping-bag",
  "i-lucide-beer",
  "i-lucide-coffee",
  "i-lucide-fuel",
  "i-lucide-plane",
  "i-lucide-train",
  "i-lucide-receipt",
];

export const AVAILABLE_CATEGORY_COLORS = [
  "#f97316", // Oranje
  "#10b981", // Smaragd
  "#3b82f6", // Blauw
  "#8b5cf6", // Paars
  "#ec4899", // Roze
  "#eab308", // Geel
  "#06b6d4", // Cyaan
  "#ef4444", // Rood
  "#6b7280", // Grijs
];

export const DEFAULT_TRIP_CATEGORIES = [
  { name: "Horeca", icon: "i-lucide-utensils", color: "#f97316" },
  { name: "Boodschappen", icon: "i-lucide-shopping-cart", color: "#10b981" },
  { name: "Vervoer & Brandstof", icon: "i-lucide-car", color: "#3b82f6" },
  { name: "Accommodatie", icon: "i-lucide-bed", color: "#8b5cf6" },
  { name: "Activiteiten & Tickets", icon: "i-lucide-ticket", color: "#ec4899" },
  { name: "Overig", icon: "i-lucide-receipt", color: "#6b7280" },
] as const;
