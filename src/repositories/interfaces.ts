import {
  UserProfile,
  Favorite,
  RecommendationSession,
  RecommendationEvent,
  Coupon,
  Redemption
} from '../types/index';

export type UnsubscribeFunction = () => void;

export interface AuthRepository {
  getCurrentUser(): Promise<UserProfile | null>;
  setCurrentUser(user: UserProfile | null): Promise<void>;
  subscribeToAuthState(callback: (user: UserProfile | null) => void): UnsubscribeFunction;
  signInWithGoogle(): Promise<UserProfile>;
  signOut(): Promise<void>;
}

export interface UserRepository {
  getUserProfile(username: string): Promise<UserProfile | null>;
  getUserProfileById(userId: string): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  
  // Coupon template operations
  getCoupons(): Promise<Coupon[]>;
  
  // Coupon redemption-related operations
  getUserRedemptions(userId: string): Promise<Redemption[]>;
  addRedemption(redemption: Redemption): Promise<void>;
  updateRedemption(redemption: Redemption): Promise<void>;
}

export interface FavoriteRepository {
  getFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: Favorite): Promise<void>;
  removeFavorite(userId: string, restaurantId: string): Promise<void>;
}

export interface RecommendationEventRepository {
  saveSession(session: RecommendationSession): Promise<void>;
  saveEvent(event: RecommendationEvent): Promise<void>;
  getSessions(userId?: string): Promise<RecommendationSession[]>;
  getEvents(sessionId: string): Promise<RecommendationEvent[]>;
}
