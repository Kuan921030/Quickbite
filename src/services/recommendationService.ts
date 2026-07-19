import { restaurantRepository } from '../repositories/restaurantRepository';
import { Restaurant, Recommendation } from '../types/index';
import { calculateDistanceInMeters, matchCuisine } from '../utils/index';

export const recommendationService = {
  getRecommendations(params: {
    budget: number;
    distance: number;
    cuisine: string;
    group: string;
    hurry: boolean;
    refreshKey: number;
    userCoords: { lat: number; lng: number } | null;
  }): Recommendation {
    const { budget, distance, cuisine, group, hurry, refreshKey, userCoords } = params;
    const restaurants = restaurantRepository.getAllRestaurants();

    let basePool = restaurants.filter(r => {
      if (group === '一人食' && !r.onePerson) return false;
      if (group === '約會' && !r.dating) return false;
      if (group === '朋友聚餐' && !r.gathering) return false;
      if (hurry && !r.fastServe) return false;
      return true;
    });

    if (basePool.length === 0) {
      basePool = restaurants.filter(r => !hurry || r.fastServe);
    }
    if (basePool.length === 0) {
      basePool = restaurants;
    }

    let pool = basePool.filter(r => {
      // 1. Budget condition
      if (r.price > (budget + 1)) return false;

      // 2. Distance condition
      const dist = calculateDistanceInMeters(r.coordinates, userCoords);
      if (distance === 0 && dist > 120) return false;
      if (distance === 1 && dist > 550) return false;
      if (distance === 2 && dist > 1200) return false;

      // 3. Cuisine condition
      if (!matchCuisine(r.rawGenre, cuisine)) return false;

      return true;
    });

    // Relaxation path for empty pool to ensure App never fails to recommend
    if (pool.length === 0) {
      pool = basePool.filter(r => {
        if (!matchCuisine(r.rawGenre, cuisine)) return false;
        if (r.price > (budget + 1)) return false;
        const dist = calculateDistanceInMeters(r.coordinates, userCoords);
        if (distance === 0 && dist > 120) return false;
        if (distance === 1 && dist > 550) return false;
        if (distance === 2 && dist > 1200) return false;
        return true;
      });
    }

    if (pool.length === 0) {
      pool = basePool.filter(r => matchCuisine(r.rawGenre, cuisine) && r.price <= (budget + 1));
    }

    if (pool.length === 0) {
      pool = basePool.filter(r => matchCuisine(r.rawGenre, cuisine));
    }

    if (pool.length === 0) {
      const cuisineOnly = basePool.filter(r => matchCuisine(r.rawGenre, cuisine));
      pool = cuisineOnly.length > 0 ? cuisineOnly : basePool;
    }

    // 1. 最快選項 (Fastest)
    const fast = [...pool].sort((a, b) => {
      if (a.fastServe && !b.fastServe) return -1;
      if (!a.fastServe && b.fastServe) return 1;
      return a.estimatedDiningTime - b.estimatedDiningTime;
    })[refreshKey % pool.length];

    // 2. 最穩定選項 (Safe/Classic)
    const safePool = pool.filter(r => r.isClassic || r.ratingStable >= 4.5);
    const safe = (safePool.length > 0 ? safePool : pool).sort((a, b) => b.ratingStable - a.ratingStable)[(refreshKey + 1) % (safePool.length || pool.length)];

    // 3. 換口味選項 (Different/New)
    const newPool = pool.filter(r => r.genre !== fast.genre && r.genre !== safe.genre);
    const different = (newPool.length > 0 ? newPool : pool)[(refreshKey + 2) % (newPool.length || pool.length)];

    return { fast, safe, new: different };
  }
};
