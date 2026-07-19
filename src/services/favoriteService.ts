import { userRepository } from '../repositories/userRepository';
import { Favorite } from '../types/index';

export const favoriteService = {
  getFavorites(username: string): Favorite[] {
    return userRepository.getFavorites(username);
  },

  addFavorite(username: string, restaurantName: string): Favorite[] {
    return userRepository.addFavorite(username, restaurantName);
  },

  removeFavorite(username: string, restaurantName: string): Favorite[] {
    return userRepository.removeFavorite(username, restaurantName);
  },

  isFavorited(username: string, restaurantName: string): boolean {
    const favorites = userRepository.getFavorites(username);
    return favorites.some(f => f.restaurantName === restaurantName);
  }
};
