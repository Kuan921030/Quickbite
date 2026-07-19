import { restaurants, dummyMenuItems } from '../data/restaurants';
import { Restaurant, MenuItem } from '../types/index';

export const restaurantRepository = {
  getAllRestaurants(): Restaurant[] {
    return restaurants;
  },

  getRestaurantByName(name: string): Restaurant | undefined {
    return restaurants.find(r => r.name === name);
  },

  getMenuItems(): MenuItem[] {
    return dummyMenuItems;
  }
};
