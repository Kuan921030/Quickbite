import { UserSession, Favorite } from '../types/index';

const SESSION_KEY = 'quickbite_user_session';
const FAVORITES_KEY = 'quickbite_user_favorites';

export const userRepository = {
  getUserSession(): UserSession | null {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  },

  saveUserSession(session: UserSession | null): void {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  getFavorites(username: string): Favorite[] {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (!saved) return [];
    try {
      const allFavs: Favorite[] = JSON.parse(saved);
      return allFavs.filter(f => f.username === username);
    } catch (e) {
      return [];
    }
  },

  addFavorite(username: string, restaurantName: string): Favorite[] {
    const saved = localStorage.getItem(FAVORITES_KEY);
    let allFavs: Favorite[] = [];
    if (saved) {
      try {
        allFavs = JSON.parse(saved);
      } catch (e) {
        allFavs = [];
      }
    }
    
    // Check if already favorited
    const exists = allFavs.some(f => f.username === username && f.restaurantName === restaurantName);
    if (!exists) {
      const newFav: Favorite = {
        id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username,
        restaurantName,
        createdAt: new Date().toISOString()
      };
      allFavs.push(newFav);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
    }
    return allFavs.filter(f => f.username === username);
  },

  removeFavorite(username: string, restaurantName: string): Favorite[] {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (!saved) return [];
    try {
      let allFavs: Favorite[] = JSON.parse(saved);
      allFavs = allFavs.filter(f => !(f.username === username && f.restaurantName === restaurantName));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
      return allFavs.filter(f => f.username === username);
    } catch (e) {
      return [];
    }
  }
};
