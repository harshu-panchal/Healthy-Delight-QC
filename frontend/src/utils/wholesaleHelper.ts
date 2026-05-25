interface WholesaleEligibleParams {
  customerType?: string;
  quantity: number;
  variation?: {
    minWholesaleQty?: number;
    wholesalePrice?: number;
    wholesaleDiscPrice?: number;
    [key: string]: any;
  } | null;
}

/**
 * Reusable utility to check if an item qualifies for B2B wholesale pricing.
 * Wholesale price applies only if customerType === 'wholesaler' and quantity >= minWholesaleQty.
 */
export const isWholesaleEligible = ({ customerType, quantity, variation }: WholesaleEligibleParams): boolean => {
  if (customerType !== 'wholesaler') return false;
  if (!variation) return false;

  const minQty = variation.minWholesaleQty || 1;
  const hasWholesalePrice = typeof variation.wholesalePrice === 'number' && variation.wholesalePrice > 0;

  return quantity >= minQty && hasWholesalePrice;
};

/**
 * Calculates correct variant price dynamically based on user type and quantity.
 */
export const getVariationPrice = (variation: any, quantity: number, customerType?: string): number => {
  if (!variation) return 0;

  if (isWholesaleEligible({ customerType, quantity, variation })) {
    if (variation.wholesaleDiscPrice && variation.wholesaleDiscPrice > 0) {
      return variation.wholesaleDiscPrice;
    }
    return variation.wholesalePrice;
  }

  // Fallback to retail pricing
  if (variation.discPrice && variation.discPrice > 0) {
    return variation.discPrice;
  }
  return variation.price || 0;
};
