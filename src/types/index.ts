export interface Coupon {
  id: string;
  name: string;
  discount: string;
  description: string;
  code: string;
  isUsed: boolean;
}

export interface UserSession {
  username: string;
  points: number;
  tier: string;
  nickname: string;
  coupons: Coupon[];
  mealsOrdered: number;
  visitedCount: { [key: string]: number };
}

export interface Restaurant {
  name: string;
  location: string;
  genre: string;
  rawGenre: string; // The original English genre string
  price: number;
  onePerson: boolean;
  dating: boolean;
  gathering: boolean;
  fastServe: boolean;
  slowEat: boolean;
  coordinates: string;
  comments: string;
  estimatedDiningTime: number;
  tags: string[];
  contexts: string[];
  queueLevel: string;
  spicyLevel: string;
  weatherFit: string;
  demoMenuAvailable: boolean;
  image: string;
  ratingStable: number; // Google rating (e.g., 4.2 - 4.9)
  isClassic: boolean; // For "Stable" logic
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  description: string;
}

export interface Recommendation {
  fast: Restaurant;
  safe: Restaurant;
  new: Restaurant;
}

export interface Favorite {
  id: string;
  username: string;
  restaurantName: string;
  createdAt: string;
}
