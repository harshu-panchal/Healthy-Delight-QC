import { Product } from '../types/domain';
import { isWholesaleEligible } from './wholesaleHelper';

export interface CalculatedPrice {
  displayPrice: number;
  mrp: number;
  discount: number;
  hasDiscount: boolean;
}

export const calculateProductPrice = (
  product: any,
  variationSelector?: number | string,
  customerType?: string,
  quantity: number = 1
): CalculatedPrice => {
  if (!product) {
    return {
      displayPrice: 0,
      mrp: 0,
      discount: 0,
      hasDiscount: false
    };
  }

  let variation;
  if (typeof variationSelector === 'number') {
    variation = product.variations?.[variationSelector];
  } else if (typeof variationSelector === 'string') {
    variation = product.variations?.find((v: any) => 
      (v._id && v._id.toString() === variationSelector.toString()) || 
      (v.id && v.id === variationSelector) ||
      v.value === variationSelector ||
      v.title === variationSelector ||
      v.pack === variationSelector
    );
  }

  // Fallback to first variation if no specific one selected/found but variations exist
  if (!variation && product.variations?.length > 0 && (!variationSelector || variationSelector === '')) {
    variation = product.variations[0];
  }

  // Determine wholesale eligibility
  const isWholesale = variation && isWholesaleEligible({ customerType, quantity, variation });

  const displayPrice = isWholesale
    ? (variation.wholesaleDiscPrice && variation.wholesaleDiscPrice > 0 ? variation.wholesaleDiscPrice : variation.wholesalePrice)
    : (variation?.discPrice && variation.discPrice > 0)
    ? variation.discPrice
    : (product.discPrice && product.discPrice > 0)
    ? product.discPrice
    : (variation?.price || product.price || 0);

  const mrp = isWholesale
    ? (variation.wholesalePrice || 0)
    : (variation?.price || product.mrp || product.compareAtPrice || product.price || 0);

  const baseDiscount = isWholesale
    ? 0
    : (variation?.discount || product.discount || 0);
  
  const hasDiscount = mrp > displayPrice || baseDiscount > 0;
  const calculatedDiscount = (mrp > displayPrice) ? Math.round(((mrp - displayPrice) / mrp) * 100) : 0;
  const discount = baseDiscount > 0 ? baseDiscount : calculatedDiscount;

  return {
    displayPrice,
    mrp,
    discount,
    hasDiscount
  };
};
