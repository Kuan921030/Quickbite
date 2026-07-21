import { Restaurant } from '../types/index';

export type MealEligibility =
  | 'main_meal'
  | 'mixed'
  | 'non_meal'
  | 'unknown';

const MEAL_ELIGIBILITY_OVERRIDES: Partial<
  Record<string, MealEligibility>
> = {
  gongguan_qingguang_redbean_cake_dessert: 'non_meal',
  gongguan_fadianfashi_dessert: 'non_meal',
  gongguan_mr_chef_gongguan_dessert: 'non_meal',
  gongguan_hoshi_lab_dessert: 'non_meal',
  gongguan_yapian_fenyuan_dessert: 'non_meal',
  heping118_daofei_douhua_dessert: 'non_meal',
  xinshengsouth_taiyi_milk_king_dessert: 'non_meal',
  xinshengsouth_coco_brownies_dessert: 'non_meal',
};

const MIXED_RAW_GENRES = new Set([
  'Cafe',
  'Bar',
  'Light',
]);

const MAIN_MEAL_RAW_GENRES = new Set([
  'Steak',
  'American',
  'Bento',
  'Chinese',
  'Noodles',
  'FastFood',
  'HotPot',
  'Italian',
  'Japanese',
  'Korean',
  'LouMei',
  'Ramen',
  'SouthEastAsian',
  'BreakfastBrunch',
  'HongKong',
  'Vegetarian',
  'Breakfast',
  'Buffet',
  'Indian',
  'Exotic',
  'French',
]);

export function getMealEligibility(
  restaurant: Restaurant,
): MealEligibility {
  const override =
    MEAL_ELIGIBILITY_OVERRIDES[restaurant.restaurantId];

  if (override) return override;

  if (
    restaurant.rawGenre === 'Dessert' ||
    restaurant.genre === '甜點冰品'
  ) {
    return 'non_meal';
  }

  if (
    MIXED_RAW_GENRES.has(restaurant.rawGenre) ||
    restaurant.genre === '極品咖啡' ||
    restaurant.genre === '輕食點心'
  ) {
    return 'mixed';
  }

  if (MAIN_MEAL_RAW_GENRES.has(restaurant.rawGenre)) {
    return 'main_meal';
  }

  return 'unknown';
}

export function isEligibleForMainMeal(
  restaurant: Restaurant,
): boolean {
  return getMealEligibility(restaurant) !== 'non_meal';
}