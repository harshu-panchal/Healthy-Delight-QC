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
 * Secures wholesale eligibility validation.
 * Eligibility conditions:
 * 1. Customer type must be 'wholesaler'.
 * 2. Product/variation must have a valid wholesalePrice (> 0).
 * 3. Quantity ordered must meet or exceed minWholesaleQty.
 */
export const isWholesaleEligible = ({ customerType, quantity, variation }: WholesaleEligibleParams): boolean => {
  if (customerType !== 'wholesaler') return false;
  if (!variation) return false;

  const minQty = variation.minWholesaleQty || 1;
  const hasWholesalePrice = typeof variation.wholesalePrice === 'number' && variation.wholesalePrice > 0;

  return quantity >= minQty && hasWholesalePrice;
};

/**
 * Returns the correct unit price for a variation based on wholesale eligibility.
 * Falls back to standard retail pricing if ineligible.
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
