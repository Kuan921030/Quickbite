export interface UserProfile {
  id: string; // stable independent ID, e.g. "user-demo-ntu"
  username: string; // the email/username used for login
  nickname: string;
  points: number;
  tier: string;
  mealsOrdered: number;
  visitedCount: { [key: string]: number };
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  photoURL?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  restaurantId: string; // stable unique restaurantId
  createdAt: string; // ISO 8601 string
}

export interface RecommendationSession {
  id: string;
  userId?: string;
  budget: number;
  distance: number;
  cuisine: string;
  group: string;
  hurry: boolean;
  recommendedRestaurantIds?: string[]; // for Firestore analytic session logging
  createdAt: string; // ISO 8601 string
}

export interface RecommendationEvent {
  id: string;
  sessionId: string;
  userId?: string;
  restaurantId: string; // stable unique restaurantId
  eventType?: 'recommendation_shown' | 'restaurant_opened' | 'menu_opened' | 'google_maps_clicked' | 'rating_submitted' | 'mock_order_completed';
  ratingValue?: number; // only for rating_submitted
  waitTimeCategory?: string; // only for rating_submitted
  createdAt: string; // ISO 8601 string
  // keep for backwards compatibility with local implementations:
  actionType?: 'view' | 'pick' | 'order' | 'rate';
  ratingEmoji?: string;
  ratingLabel?: string;
  waitTime?: string;
}

export interface Coupon {
  id: string;
  name: string;
  discount: string;
  description: string;
  code: string;
}

export interface Redemption {
  id: string;
  userId: string;
  couponId: string;
  status: 'claimed' | 'used' | 'expired';
  claimedAt: string; // ISO 8601 string
  usedAt?: string; // ISO 8601 string
}

// Runtime/UI Interface used by existing React components
export interface UICoupon {
  id: string; // redemption id
  name: string;
  discount: string;
  description: string;
  code: string;
  isUsed: boolean; // Keep for backward compatibility with existing components
  status: 'claimed' | 'used' | 'expired';
  claimedAt: string;
  usedAt?: string;
}

export interface UserSession {
  username: string;
  points: number;
  tier: string;
  nickname: string;
  coupons: UICoupon[];
  mealsOrdered: number;
  visitedCount: { [key: string]: number };
  photoURL?: string;
}

export interface Restaurant {
  restaurantId: string; // stable unique ID
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
