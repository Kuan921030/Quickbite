import { restaurantRepository } from '../repositories/restaurantRepository';
import { Restaurant, Recommendation } from '../types/index';
import { calculateDistanceInMeters, matchCuisine } from '../utils/index';

// Simple seed-based pseudo-random number generator
function createSeededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// In-memory session history of recently recommended restaurant IDs
const recentlyRecommendedIds = new Set<string>();
const historyQueue: string[] = [];

function addToHistory(id: string) {
  if (!id) return;
  // If already in history, we move it to the end of the queue to keep it fresh
  if (recentlyRecommendedIds.has(id)) {
    const idx = historyQueue.indexOf(id);
    if (idx !== -1) {
      historyQueue.splice(idx, 1);
    }
    historyQueue.push(id);
  } else {
    recentlyRecommendedIds.add(id);
    historyQueue.push(id);
    // Keep a maximum of 12 recently recommended IDs (last 4 rounds of recommendations)
    if (historyQueue.length > 12) {
      const oldest = historyQueue.shift();
      if (oldest) {
        recentlyRecommendedIds.delete(oldest);
      }
    }
  }
}

export const recommendationService = {
  getRecommendations(params: {
    budget: number;
    distance: number;
    cuisine: string;
    group: string;
    hurry: boolean;
    refreshKey: number;
    userCoords: { lat: number; lng: number } | null;
    retainedIds?: string[];
    previousRecommendation?: Recommendation | null;
    activeSessionId?: string | null;
  }): Recommendation {
    const {
      budget,
      distance,
      cuisine,
      group,
      hurry,
      refreshKey,
      userCoords,
      retainedIds = [],
      previousRecommendation = null,
      activeSessionId = null
    } = params;

    const restaurants = restaurantRepository.getAllRestaurants();

    // 1. Filter base pool of restaurants based on group size & hurry preferences
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

    // 2. Filter base pool by budget, distance, and cuisine
    let pool = basePool.filter(r => {
      if (r.price > (budget + 1)) return false;

      const dist = calculateDistanceInMeters(r.coordinates, userCoords);
      if (distance === 0 && dist > 120) return false;
      if (distance === 1 && dist > 550) return false;
      if (distance === 2 && dist > 1200) return false;

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

    // 3. Calculate recommendation score for each restaurant in the pool
    const scoredPool = pool.map(r => {
      let score = 50; // base score

      // Rating bonus (ratingStable is usually 4.1 to 4.9)
      score += (r.ratingStable - 4.0) * 20;

      // Classic/Popular bonus
      if (r.isClassic) {
        score += 15;
      }

      // Distance alignment bonus
      const dist = calculateDistanceInMeters(r.coordinates, userCoords);
      if (dist <= 150) {
        score += 20;
      } else if (dist <= 500) {
        score += 10;
      } else if (dist <= 1000) {
        score += 5;
      }

      // Budget alignment bonus
      if (r.price === budget) {
        score += 15;
      } else if (r.price < budget) {
        score += 8;
      }

      // Hurry/fast service matching bonus
      if (hurry && r.fastServe) {
        score += 15;
      }

      return { restaurant: r, score };
    });

    // Sort restaurants by score descending
    scoredPool.sort((a, b) => b.score - a.score);

    // Build candidate pool consisting of approximately the top 15 restaurants (or fewer if fewer are available)
    const candidates = scoredPool.slice(0, Math.min(15, scoredPool.length));

    // Prepare seeded random generator for stable output across React re-renders with the same refreshKey and activeSessionId
    const seedStr = `${budget}_${distance}_${cuisine}_${group}_${hurry}_${refreshKey}_${activeSessionId || ''}`;
    const seedRandom = createSeededRandom(seedStr);

    // Identify which slots are retained
    let fastRes: Restaurant | null = null;
    let safeRes: Restaurant | null = null;
    let newRes: Restaurant | null = null;

    if (previousRecommendation) {
      if (previousRecommendation.fast && retainedIds.includes(previousRecommendation.fast.restaurantId)) {
        fastRes = previousRecommendation.fast;
      }
      if (previousRecommendation.safe && retainedIds.includes(previousRecommendation.safe.restaurantId)) {
        safeRes = previousRecommendation.safe;
      }
      if (previousRecommendation.new && retainedIds.includes(previousRecommendation.new.restaurantId)) {
        newRes = previousRecommendation.new;
      }
    }

    // Filter out already retained restaurants from our selection pool
    const selectedIds = new Set<string>();
    if (fastRes) selectedIds.add(fastRes.restaurantId);
    if (safeRes) selectedIds.add(safeRes.restaurantId);
    if (newRes) selectedIds.add(newRes.restaurantId);

    // Determine how many we need to select
    const neededCount = 3 - selectedIds.size;

    if (neededCount > 0) {
      // Build options for weighted-random selection
      // Map to items with weight = score^3 for high probability of high scores, but still giving low scores a chance
      const availableCandidates = candidates
        .filter(c => !selectedIds.has(c.restaurant.restaurantId))
        .map(c => ({
          item: c.restaurant,
          weight: Math.pow(c.score, 3)
        }));

      // Randomly select using weighted random selection with recent history preference
      const selected = selectWeightedRandom(
        availableCandidates,
        neededCount,
        recentlyRecommendedIds,
        r => r.restaurantId,
        seedRandom
      );

      // Distribute selected candidates into empty slots
      let selectIdx = 0;
      if (!fastRes && selectIdx < selected.length) {
        fastRes = selected[selectIdx++];
      }
      if (!safeRes && selectIdx < selected.length) {
        safeRes = selected[selectIdx++];
      }
      if (!newRes && selectIdx < selected.length) {
        newRes = selected[selectIdx++];
      }
    }

    // Fallback in case pool has extremely few items and we couldn't fulfill 3 slots
    if (!fastRes) {
      fastRes = pool[0] || restaurants[0];
    }
    if (!safeRes) {
      safeRes = pool[Math.min(1, pool.length - 1)] || fastRes;
    }
    if (!newRes) {
      newRes = pool[Math.min(2, pool.length - 1)] || safeRes;
    }

    // Add selected items to the short session history of recently recommended IDs
    addToHistory(fastRes.restaurantId);
    addToHistory(safeRes.restaurantId);
    addToHistory(newRes.restaurantId);

    return {
      fast: fastRes,
      safe: safeRes,
      new: newRes
    };
  }
};

// Helper for weighted random selection without replacement
function selectWeightedRandom<T>(
  items: { item: T; weight: number }[],
  count: number,
  recentIds: Set<string>,
  getId: (item: T) => string,
  seedRandom: () => number
): T[] {
  const result: T[] = [];
  const available = [...items];

  for (let step = 0; step < count; step++) {
    if (available.length === 0) break;

    // Filter out recently recommended items to prefer new ones
    let currentPool = available.filter(x => !recentIds.has(getId(x.item)));

    // If we don't have enough non-recent candidates to fulfill the count, relax this restriction
    if (currentPool.length < count - result.length) {
      currentPool = available;
    }

    // Calculate total weight
    let totalWeight = currentPool.reduce((sum, x) => sum + x.weight, 0);
    if (totalWeight <= 0) {
      totalWeight = currentPool.length;
      currentPool = currentPool.map(x => ({ ...x, weight: 1 }));
    }

    // Seeded random value
    const r = seedRandom() * totalWeight;
    let cumulative = 0;
    let selectedIndex = 0;

    for (let i = 0; i < currentPool.length; i++) {
      cumulative += currentPool[i].weight;
      if (r <= cumulative) {
        selectedIndex = i;
        break;
      }
    }

    const chosen = currentPool[selectedIndex];
    result.push(chosen.item);

    // Remove selected item from available pool to avoid duplicates
    const idxInAvailable = available.findIndex(x => getId(x.item) === getId(chosen.item));
    if (idxInAvailable !== -1) {
      available.splice(idxInAvailable, 1);
    }
  }

  return result;
}
