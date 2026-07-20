import {
  AuthRepository,
  UserRepository,
  FavoriteRepository,
  RecommendationEventRepository,
  UnsubscribeFunction
} from './interfaces';
import {
  UserProfile,
  Favorite,
  RecommendationSession,
  RecommendationEvent,
  Coupon,
  Redemption
} from '../types/index';
import { restaurants, REST_ID_MIGRATION_MAP, RESTAURANT_ID_MAP } from '../data/restaurants';

const SESSION_KEY = 'quickbite_user_session';
const PROFILES_KEY = 'quickbite_user_profiles';
const REDEMPTIONS_KEY = 'quickbite_user_redemptions';

// Stable user ID generator: "user-demo-ntu" for demo, and stable "user_xxx" for others
export function getStableUserId(username: string): string {
  if (username === "ntu_student@example.com") {
    return "user-demo-ntu";
  }
  return "user_" + username.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

type AuthCallback = (user: UserProfile | null) => void;

export class LocalAuthRepository implements AuthRepository {
  private listeners: Set<AuthCallback> = new Set();

  async getCurrentUser(): Promise<UserProfile | null> {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      const username = parsed.username;
      const id = parsed.id || getStableUserId(username);
      return {
        id,
        username,
        nickname: parsed.nickname,
        points: parsed.points,
        tier: parsed.tier,
        mealsOrdered: parsed.mealsOrdered || 0,
        visitedCount: parsed.visitedCount || {},
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: parsed.updatedAt || new Date().toISOString()
      };
    } catch (e) {
      return null;
    }
  }

  async setCurrentUser(user: UserProfile | null): Promise<void> {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    // Notify listeners
    this.listeners.forEach(cb => cb(user));
  }

  subscribeToAuthState(callback: AuthCallback): UnsubscribeFunction {
    this.listeners.add(callback);
    // Call callback immediately with current user state (async)
    this.getCurrentUser().then(user => {
      if (this.listeners.has(callback)) {
        callback(user);
      }
    });
    return () => {
      this.listeners.delete(callback);
    };
  }

  async signInWithGoogle(): Promise<UserProfile> {
    throw new Error("Local authentication does not support Google login. Please use FirebaseAuthRepository.");
  }

  async signOut(): Promise<void> {
    await this.setCurrentUser(null);
  }
}

let profileSaveCount = 0;
let lastProfileSaveTime = 0;

export class LocalUserRepository implements UserRepository {
  private readonly DEFAULT_COUPONS: Coupon[] = [
    { id: "tpl-welcome", name: "新會員見面禮", discount: "全站折價 10 元", description: "無金額限制，有效期限 30 定", code: "NTU-WELCOME-10" },
    { id: "tpl-c1", name: "水源市場水餃", discount: "送小菜 1 份", description: "限水源市場指定攤位使用", code: "NTU-DUMPLING-01" },
    { id: "tpl-c2", name: "小木屋鬆餅", discount: "九折折價券", description: "台大校內店限定，外送不適用", code: "NTU-WAFFLE-90" },
    { id: "tpl-c3", name: "公館陳三鼎（陳記）", discount: "免費折抵 10 元", description: "搭配推薦主餐使用", code: "NTU-MILKTEA-10" },
    { id: "tpl-chicken", name: "姐妹花雞排", discount: "折價 10 元", description: "台大校內名店限定", code: "NTU-CHICKEN-10" },
    { id: "tpl-mcd", name: "活大麥當勞", discount: "大薯買一送一", description: "限活動期間台大店兌換", code: "NTU-MCD-FRIES" },
    { id: "tpl-water", name: "公館水源街水餃", discount: "滿百折 $15 元", description: "午餐時段特惠", code: "NTU-PIECE-15" },
    { id: "tpl-women9", name: "台大女九自助餐", discount: "免費招待湯品", description: "憑券享每日例湯升級", code: "NTU-SOUP-FREE" },
  ];

  async getUserProfile(username: string): Promise<UserProfile | null> {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (!saved) {
      const active = localStorage.getItem(SESSION_KEY);
      if (active) {
        try {
          const parsed = JSON.parse(active);
          if (parsed.username === username) {
            const profile: UserProfile = {
              id: parsed.id || getStableUserId(parsed.username),
              username: parsed.username,
              nickname: parsed.nickname,
              points: parsed.points,
              tier: parsed.tier,
              mealsOrdered: parsed.mealsOrdered || 0,
              visitedCount: parsed.visitedCount || {},
              createdAt: parsed.createdAt || new Date().toISOString(),
              updatedAt: parsed.updatedAt || new Date().toISOString()
            };
            await this.saveUserProfile(profile);
            return profile;
          }
        } catch (e) {}
      }
      return null;
    }
    try {
      const all: { [key: string]: UserProfile } = JSON.parse(saved);
      // Fallback searches for old keys (which were usernames)
      let profile = all[username] || all[getStableUserId(username)];
      if (!profile) {
        const found = Object.values(all).find(p => p.username === username);
        if (found) profile = found;
      }
      if (profile) {
        return {
          id: profile.id || getStableUserId(profile.username),
          username: profile.username,
          nickname: profile.nickname,
          points: profile.points,
          tier: profile.tier,
          mealsOrdered: profile.mealsOrdered || 0,
          visitedCount: profile.visitedCount || {},
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: profile.updatedAt || new Date().toISOString()
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async getUserProfileById(userId: string): Promise<UserProfile | null> {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (!saved) return null;
    try {
      const all: { [key: string]: UserProfile } = JSON.parse(saved);
      const profile = all[userId] || Object.values(all).find(p => p.id === userId || p.username === userId);
      if (profile) {
        return {
          id: profile.id || getStableUserId(profile.username),
          username: profile.username,
          nickname: profile.nickname,
          points: profile.points,
          tier: profile.tier,
          mealsOrdered: profile.mealsOrdered || 0,
          visitedCount: profile.visitedCount || {},
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: profile.updatedAt || new Date().toISOString()
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    profileSaveCount++;
    if (import.meta.env.DEV) {
      if (profileSaveCount <= 50) {
        console.log(`[Dev Audit] profile save count: ${profileSaveCount}`);
      } else if (profileSaveCount === 51) {
        console.warn(`[Dev Audit] profile save called at extremely high frequency! Stopped logging.`);
      }
    }

    const nowMs = Date.now();
    if (profileSaveCount > 25 && nowMs - lastProfileSaveTime < 2000) {
      console.error(`[Security Guard] Profile save loop detected! Blocked writing to localStorage to prevent freeze.`);
      return;
    }
    lastProfileSaveTime = nowMs;

    const saved = localStorage.getItem(PROFILES_KEY);
    let all: { [key: string]: UserProfile } = {};
    if (saved) {
      try { all = JSON.parse(saved); } catch (e) {}
    }
    const now = new Date().toISOString();
    const preparedProfile: UserProfile = {
      ...profile,
      id: profile.id || getStableUserId(profile.username),
      createdAt: profile.createdAt || now,
      updatedAt: now
    };
    all[preparedProfile.id] = preparedProfile;
    // Also support username keying to prevent breaking previous session loaders
    all[preparedProfile.username] = preparedProfile;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  }

  async getCoupons(): Promise<Coupon[]> {
    return this.DEFAULT_COUPONS;
  }

  async getUserRedemptions(userId: string): Promise<Redemption[]> {
    const saved = localStorage.getItem(REDEMPTIONS_KEY);
    const stableUserId = userId.includes('@') ? getStableUserId(userId) : userId;

    if (!saved) {
      const active = localStorage.getItem(SESSION_KEY);
      if (active) {
        try {
          const parsed = JSON.parse(active);
          const activeStableId = getStableUserId(parsed.username);
          if ((parsed.username === userId || activeStableId === stableUserId) && Array.isArray(parsed.coupons)) {
            const redemptions: Redemption[] = parsed.coupons.map((c: any) => {
              const template = this.DEFAULT_COUPONS.find(tc => tc.code === c.code);
              const isUsed = c.isUsed || c.status === 'used';
              const status = c.status || (isUsed ? 'used' : 'claimed');
              return {
                id: c.id,
                userId: stableUserId,
                couponId: template?.id || "tpl-welcome",
                status: status as 'claimed' | 'used' | 'expired',
                claimedAt: c.claimedAt || c.redeemedAt || new Date().toISOString(),
                usedAt: c.usedAt || (status === 'used' ? new Date().toISOString() : undefined)
              };
            });
            localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptions));
            return redemptions;
          }
        } catch (e) {}
      }
      return [];
    }
    try {
      const all: any[] = JSON.parse(saved);
      return all
        .map((r: any) => {
          const rUserId = r.userId && r.userId.includes('@') ? getStableUserId(r.userId) : r.userId;
          const isUsed = r.isUsed || r.status === 'used';
          const status = r.status || (isUsed ? 'used' : 'claimed');
          return {
            id: r.id,
            userId: rUserId,
            couponId: r.couponId,
            status: status as 'claimed' | 'used' | 'expired',
            claimedAt: r.claimedAt || r.redeemedAt || new Date().toISOString(),
            usedAt: r.usedAt || (status === 'used' ? r.claimedAt || new Date().toISOString() : undefined)
          };
        })
        .filter(r => r.userId === stableUserId);
    } catch (e) {
      return [];
    }
  }

  async addRedemption(redemption: Redemption): Promise<void> {
    const saved = localStorage.getItem(REDEMPTIONS_KEY);
    let all: Redemption[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        all = parsed.map((r: any) => {
          const isUsed = r.isUsed || r.status === 'used';
          const status = r.status || (isUsed ? 'used' : 'claimed');
          return {
            id: r.id,
            userId: r.userId && r.userId.includes('@') ? getStableUserId(r.userId) : r.userId,
            couponId: r.couponId,
            status: status as 'claimed' | 'used' | 'expired',
            claimedAt: r.claimedAt || r.redeemedAt || new Date().toISOString(),
            usedAt: r.usedAt || (status === 'used' ? r.claimedAt || new Date().toISOString() : undefined)
          };
        });
      } catch (e) {}
    }
    const cleanedRedemption: Redemption = {
      ...redemption,
      userId: redemption.userId.includes('@') ? getStableUserId(redemption.userId) : redemption.userId
    };
    all = all.filter(r => !(r.id === cleanedRedemption.id && r.userId === cleanedRedemption.userId));
    all.push(cleanedRedemption);
    localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(all));
  }

  async updateRedemption(redemption: Redemption): Promise<void> {
    const saved = localStorage.getItem(REDEMPTIONS_KEY);
    if (!saved) return;
    try {
      let all: any[] = JSON.parse(saved);
      const cleanedRedemption: Redemption = {
        ...redemption,
        userId: redemption.userId.includes('@') ? getStableUserId(redemption.userId) : redemption.userId
      };
      all = all.map(r => {
        const rUserId = r.userId && r.userId.includes('@') ? getStableUserId(r.userId) : r.userId;
        return (r.id === cleanedRedemption.id && rUserId === cleanedRedemption.userId) ? cleanedRedemption : r;
      });
      localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(all));
    } catch (e) {}
  }
}

// Helper function to resolve/migrate old IDs or display names to new stable IDs
export function migrateRestaurantId(id: string): string {
  if (!id) return id;
  // 1. If it's an old index-based ID, e.g. "rest_1", migrate to new permanent ID
  if (REST_ID_MIGRATION_MAP[id]) {
    return REST_ID_MIGRATION_MAP[id];
  }
  // 2. If it's a restaurant display name, look it up in RESTAURANT_ID_MAP
  if (RESTAURANT_ID_MAP[id]) {
    return RESTAURANT_ID_MAP[id];
  }
  // 3. Fallback: try searching in restaurants array by name
  const matchedByName = restaurants.find(r => r.name === id);
  if (matchedByName) {
    return matchedByName.restaurantId;
  }
  return id;
}

export class LocalFavoriteRepository implements FavoriteRepository {
  private readonly FAVORITES_KEY = 'quickbite_user_favorites';

  async getFavorites(userId: string): Promise<Favorite[]> {
    const saved = localStorage.getItem(this.FAVORITES_KEY);
    const stableUserId = userId.includes('@') ? getStableUserId(userId) : userId;
    if (!saved) return [];
    try {
      const allFavs: any[] = JSON.parse(saved);
      return allFavs
        .map(f => {
          const fUserId = f.userId && f.userId.includes('@') ? getStableUserId(f.userId) : (f.userId || getStableUserId(f.username || ''));
          const fRestaurantId = migrateRestaurantId(f.restaurantId || f.restaurantName);
          return {
            id: f.id,
            userId: fUserId,
            restaurantId: fRestaurantId,
            createdAt: f.createdAt || new Date().toISOString()
          };
        })
        .filter(f => f.userId === stableUserId);
    } catch (e) {
      return [];
    }
  }

  async addFavorite(favorite: Favorite): Promise<void> {
    const saved = localStorage.getItem(this.FAVORITES_KEY);
    let allFavs: any[] = [];
    if (saved) {
      try { allFavs = JSON.parse(saved); } catch (e) { allFavs = []; }
    }

    const cleanedFavorite: Favorite = {
      id: favorite.id,
      userId: favorite.userId.includes('@') ? getStableUserId(favorite.userId) : favorite.userId,
      restaurantId: migrateRestaurantId(favorite.restaurantId),
      createdAt: favorite.createdAt || new Date().toISOString()
    };

    const exists = allFavs.some(f => {
      const fUserId = f.userId && f.userId.includes('@') ? getStableUserId(f.userId) : (f.userId || getStableUserId(f.username || ''));
      const fRestaurantId = migrateRestaurantId(f.restaurantId || f.restaurantName);
      return fUserId === cleanedFavorite.userId && fRestaurantId === cleanedFavorite.restaurantId;
    });

    if (!exists) {
      allFavs.push(cleanedFavorite);
      // Clean and migrate all saved favorites to new stable IDs to persist migration
      const migratedAllFavs = allFavs.map(f => ({
        ...f,
        userId: f.userId && f.userId.includes('@') ? getStableUserId(f.userId) : (f.userId || getStableUserId(f.username || '')),
        restaurantId: migrateRestaurantId(f.restaurantId || f.restaurantName)
      }));
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(migratedAllFavs));
    }
  }

  async removeFavorite(userId: string, restaurantId: string): Promise<void> {
    const saved = localStorage.getItem(this.FAVORITES_KEY);
    if (!saved) return;
    const stableUserId = userId.includes('@') ? getStableUserId(userId) : userId;
    const stableRestaurantId = migrateRestaurantId(restaurantId);

    try {
      let allFavs: any[] = JSON.parse(saved);
      allFavs = allFavs.filter(f => {
        const fUserId = f.userId && f.userId.includes('@') ? getStableUserId(f.userId) : (f.userId || getStableUserId(f.username || ''));
        const fRestaurantId = migrateRestaurantId(f.restaurantId || f.restaurantName);
        return !(fUserId === stableUserId && fRestaurantId === stableRestaurantId);
      });
      // Migrate remaining saved favorites as well
      const migratedAllFavs = allFavs.map(f => ({
        ...f,
        userId: f.userId && f.userId.includes('@') ? getStableUserId(f.userId) : (f.userId || getStableUserId(f.username || '')),
        restaurantId: migrateRestaurantId(f.restaurantId || f.restaurantName)
      }));
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(migratedAllFavs));
    } catch (e) {}
  }
}

export class LocalRecommendationEventRepository implements RecommendationEventRepository {
  private readonly SESSIONS_KEY = 'quickbite_recommendation_sessions';
  private readonly EVENTS_KEY = 'quickbite_recommendation_events';

  async saveSession(session: RecommendationSession): Promise<void> {
    const saved = localStorage.getItem(this.SESSIONS_KEY);
    let all: any[] = [];
    if (saved) {
      try { all = JSON.parse(saved); } catch (e) {}
    }
    const cleanedSession = {
      ...session,
      userId: session.userId ? (session.userId.includes('@') ? getStableUserId(session.userId) : session.userId) : undefined
    };
    all.push(cleanedSession);
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(all));
  }

  async saveEvent(event: RecommendationEvent): Promise<void> {
    const saved = localStorage.getItem(this.EVENTS_KEY);
    let all: any[] = [];
    if (saved) {
      try { all = JSON.parse(saved); } catch (e) {}
    }
    const cleanedEvent = {
      ...event,
      userId: event.userId ? (event.userId.includes('@') ? getStableUserId(event.userId) : event.userId) : undefined,
      restaurantId: migrateRestaurantId(event.restaurantId)
    };
    all.push(cleanedEvent);
    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(all));
  }

  async getSessions(userId?: string): Promise<RecommendationSession[]> {
    const saved = localStorage.getItem(this.SESSIONS_KEY);
    if (!saved) return [];
    try {
      const all: any[] = JSON.parse(saved);
      const mapped = all.map(s => ({
        ...s,
        userId: s.userId ? (s.userId.includes('@') ? getStableUserId(s.userId) : s.userId) : undefined
      }));
      if (userId) {
        const stableUserId = userId.includes('@') ? getStableUserId(userId) : userId;
        return mapped.filter(s => s.userId === stableUserId);
      }
      return mapped;
    } catch (e) {
      return [];
    }
  }

  async getEvents(sessionId: string): Promise<RecommendationEvent[]> {
    const saved = localStorage.getItem(this.EVENTS_KEY);
    if (!saved) return [];
    try {
      const all: any[] = JSON.parse(saved);
      return all
        .filter(e => e.sessionId === sessionId)
        .map(e => {
          const rId = migrateRestaurantId(e.restaurantId || e.restaurantName);
          return {
            id: e.id,
            sessionId: e.sessionId,
            userId: e.userId ? (e.userId.includes('@') ? getStableUserId(e.userId) : e.userId) : undefined,
            restaurantId: rId,
            actionType: e.actionType,
            ratingEmoji: e.ratingEmoji,
            ratingLabel: e.ratingLabel,
            waitTime: e.waitTime,
            createdAt: e.createdAt
          };
        });
    } catch (e) {
      return [];
    }
  }
}
