export type BudgetOption = 0 | 1 | 2;

/**
 * matchesBudget Checks if a restaurant's price tier (1-5) matches the user's selected budget option:
 * 0 = 150 內
 * 1 = 300 內
 * 2 = 不限
 */
export function matchesBudget(restaurantPrice: number, budget: BudgetOption): boolean {
  if (budget === 0) {
    return restaurantPrice === 1;
  }
  if (budget === 1) {
    return restaurantPrice <= 3;
  }
  return true; // budget === 2 (不限) allows 1 to 5
}

/**
 * getPriceRangeText maps the raw restaurant price (1 to 5) to a clean price range string
 */
export function getPriceRangeText(price: number): string {
  if (price === 1) {
    return '150 元內';
  }
  if (price === 2 || price === 3) {
    return '約 150–300 元';
  }
  return '通常 300 元以上'; // price === 4 or 5
}
