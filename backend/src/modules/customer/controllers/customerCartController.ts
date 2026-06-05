
import { Request, Response } from 'express';
import Cart from '../../../models/Cart';
import CartItem from '../../../models/CartItem';
import Product from '../../../models/Product';
import Customer from '../../../models/Customer';
import Category from '../../../models/Category';
import { findSellersWithinRange } from '../../../utils/locationHelper';
import { isWholesaleEligible, getVariationPrice } from '../../../utils/wholesaleHelper';
import mongoose from 'mongoose';

import Seller from '../../../models/Seller';
import { getRoadDistances } from '../../../services/mapService';
import AppSettings from '../../../models/AppSettings';

// Helper to get all fully active category IDs (self active + all ancestors active)
async function getFullyActiveCategoryIds(): Promise<Set<string>> {
  const activeCategories = await Category.find({ status: "Active" }).select("_id parentId").lean();
  const activeMap = new Map(activeCategories.map(c => [c._id.toString(), c]));

  const isAncestorsActive = (cat: any): boolean => {
    let current = cat;
    while (current.parentId) {
      const parentIdStr = current.parentId.toString();
      const parent = activeMap.get(parentIdStr);
      if (!parent) return false;
      current = parent;
    }
    return true;
  };

  const fullyActive = activeCategories.filter(isAncestorsActive);
  return new Set(fullyActive.map(c => c._id.toString()));
}

// Helper to calculate item price matching frontend logic
const calculateItemPrice = (product: any, variationSelector: any, quantity: number = 1, customerType?: string) => {
    let variation = null;
    let variationId = variationSelector;

    // Handle if variationSelector is an object
    if (variationSelector && typeof variationSelector === 'object' && variationSelector._id) {
        variationId = variationSelector._id;
    }

    if (variationId && product.variations?.length) {
        variation = product.variations.find((v: any) =>
            (v._id && v._id.toString() === variationId.toString()) ||
            (v.id && v.id === variationId)
        );
    }

    if (!variation && product.variations?.length) {
        variation = product.variations[0];
    }

    if (variation) {
        return getVariationPrice(variation, quantity, customerType);
    }

    let finalPrice = product.price || 0;

    // Priority: Product Discount -> Product Price
    if (product.discPrice && product.discPrice > 0) {
        finalPrice = product.discPrice;
    }

    return finalPrice;
};

// Helper to calculate cart total with location filtering
const calculateCartTotal = async (cartId: any, nearbySellerIds: mongoose.Types.ObjectId[] = [], customerType?: string) => {
    const items = await CartItem.find({ cart: cartId }).populate({
        path: 'product',
        select: 'price discPrice variations seller status publish productName category subcategory'
    });

    const fullyActiveIds = await getFullyActiveCategoryIds();

    let total = 0;
    for (const item of items) {
        const product = item.product as any;
        if (product && product.status === 'Active' && product.publish) {
            const prodCatId = product.category?.toString();
            const prodSubId = product.subcategory?.toString();
            if (prodCatId && !fullyActiveIds.has(prodCatId)) continue;
            if (prodSubId && !fullyActiveIds.has(prodSubId)) continue;

            // Check if seller is in range
            const isAvailable = nearbySellerIds.some(id => id.toString() === product.seller.toString());
            if (isAvailable) {
                const price = calculateItemPrice(product, item.variation, item.quantity, customerType);
                total += price * item.quantity;
            }
        }
    }
    return total;
};

// Helper to calculate delivery fee
const calculateDeliveryStuff = async (total: number, items: any[], userLat: number | null, userLng: number | null) => {
    let estimatedDeliveryFee = 0;
    let platformFee = 0;
    let freeDeliveryThreshold = 0;

    try {
        const settings = await AppSettings.getSettings();
        platformFee = settings.platformFee || 0;
        freeDeliveryThreshold = settings.freeDeliveryThreshold || 0;

        // Check free delivery threshold
        if (freeDeliveryThreshold > 0 && total >= freeDeliveryThreshold) {
            estimatedDeliveryFee = 0;
        } else if (settings) {
            // If distance based is enabled
            if (settings.deliveryConfig?.isDistanceBased === true) {
                const config = settings.deliveryConfig;
                // Default to base charge
                estimatedDeliveryFee = config.baseCharge || 0;

                if (userLat && userLng) {
                    // Get all sellers involved in the cart
                    const sellerIds = new Set<string>();
                    items.forEach((item: any) => {
                        if (item.product?.seller) {
                            sellerIds.add(item.product.seller.toString());
                        }
                    });

                    if (sellerIds.size > 0) {
                        const uniqueSellerIds = Array.from(sellerIds).map(id => new mongoose.Types.ObjectId(id));
                        const sellers = await Seller.find({ _id: { $in: uniqueSellerIds } }).select('location latitude longitude');

                        const sellerLocations: { lat: number; lng: number }[] = [];
                        sellers.forEach(seller => {
                            let lat, lng;
                            if (seller.location?.coordinates?.length === 2) {
                                lng = seller.location.coordinates[0];
                                lat = seller.location.coordinates[1];
                            } else if (seller.latitude && seller.longitude) {
                                lat = parseFloat(seller.latitude);
                                lng = parseFloat(seller.longitude);
                            }
                            if (lat && lng) sellerLocations.push({ lat, lng });
                        });

                        if (sellerLocations.length > 0) {
                            const distances = await getRoadDistances(
                                sellerLocations,
                                { lat: userLat, lng: userLng },
                                config.googleMapsKey
                            );

                            if (distances && distances.length > 0) {
                                const maxDistance = Math.max(...distances);
                                const extraKm = Math.max(0, maxDistance - config.baseDistance);
                                estimatedDeliveryFee = Math.ceil(config.baseCharge + (extraKm * config.kmRate));
                            }
                        }
                    }
                }
            } else {
                // Fixed charge
                estimatedDeliveryFee = settings.deliveryCharges || 0;
            }
        }
    } catch (err) {
        console.error("Error calculating delivery stuff:", err);
    }
    return {
        estimatedDeliveryFee,
        platformFee,
        freeDeliveryThreshold
    };
};

// Get current user's cart
export const getCart = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { latitude, longitude } = req.query;

        // Parse location
        const userLat = latitude ? parseFloat(latitude as string) : null;
        const userLng = longitude ? parseFloat(longitude as string) : null;

        // Strictly enforce location
        if (userLat === null || userLng === null || isNaN(userLat) || isNaN(userLng)) {
            return res.status(200).json({
                success: true,
                message: 'Location required to view available items',
                data: { items: [], total: 0 }
            });
        }

        const nearbySellerIds = await findSellersWithinRange(userLat, userLng);

        let cart = await Cart.findOne({ customer: userId }).populate({
            path: 'items',
            populate: {
                path: 'product',
                select: 'productName price mainImage stock pack mrp category subcategory seller status publish discPrice variations tax',
                populate: {
                    path: 'tax',
                    select: 'name percentage'
                }
            }
        });

        if (!cart) {
            cart = await Cart.create({ customer: userId, items: [], total: 0 });
            return res.status(200).json({ success: true, data: cart });
        }

        // Get customer account details for dynamic role-based calculations
        const customerObj = await Customer.findById(userId).select('customerType');
        const customerType = customerObj?.customerType || 'retailer';

        // Filter items based on location availability and update total
        const fullyActiveIds = await getFullyActiveCategoryIds();
        const filteredItems = [];
        let total = 0;

        for (const item of (cart.items as any)) {
            const product = item.product;
            if (product && product.status === 'Active' && product.publish) {
                const prodCatId = product.category?.toString();
                const prodSubId = product.subcategory?.toString();
                if (prodCatId && !fullyActiveIds.has(prodCatId)) continue;
                if (prodSubId && !fullyActiveIds.has(prodSubId)) continue;

                const isAvailable = nearbySellerIds.some(id => id.toString() === product.seller.toString());
                if (isAvailable) {
                    filteredItems.push(item);
                    const price = calculateItemPrice(product, item.variation, item.quantity, customerType);
                    total += price * item.quantity;
                }
            }
        }

        // Update cart total in DB if it changed
        if (cart.total !== total) {
            cart.total = total;
            await cart.save();
        }

        // Calculate fees
        const fees = await calculateDeliveryStuff(total, filteredItems, userLat, userLng);

        return res.status(200).json({
            success: true,
            data: {
                ...cart.toObject(),
                items: filteredItems,
                total,
                ...fees
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching cart',
            error: error.message
        });
    }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { productId, quantity = 1, variation } = req.body;
        const { latitude, longitude } = req.query;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Parse location
        const userLat = latitude ? parseFloat(latitude as string) : null;
        const userLng = longitude ? parseFloat(longitude as string) : null;

        if (userLat === null || userLng === null || isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({
                success: false,
                message: 'Location is required to add items to cart'
            });
        }

        // Verify product exists and is available at location
        const product = await Product.findOne({ _id: productId, status: 'Active', publish: true }).populate('seller');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found or unavailable' });
        }

        const fullyActiveIds = await getFullyActiveCategoryIds();
        const prodCatId = product.category?.toString();
        const prodSubId = product.subcategory?.toString();
        if ((prodCatId && !fullyActiveIds.has(prodCatId)) || (prodSubId && !fullyActiveIds.has(prodSubId))) {
            return res.status(404).json({ success: false, message: 'Product not found or unavailable' });
        }

        // Check if seller's shop is open
        const seller = product.seller as any;
        if (seller && seller.isShopOpen === false) {
            return res.status(400).json({
                success: false,
                message: 'Seller is not available at this moment'
            });
        }

        const nearbySellerIds = await findSellersWithinRange(userLat, userLng);
        const isAvailable = nearbySellerIds.some(id => id.toString() === (seller._id || seller).toString());

        if (!isAvailable) {
            return res.status(403).json({
                success: false,
                message: 'This product is not available in your current location'
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({ customer: userId });
        if (!cart) {
            cart = await Cart.create({ customer: userId, items: [], total: 0 });
        }

        // Get customer account details for dynamic role-based calculations
        const customerObj = await Customer.findById(userId).select('customerType');
        const customerType = customerObj?.customerType || 'retailer';

        // Check if item already exists in cart
        let cartItem = await CartItem.findOne({
            cart: cart._id,
            product: productId,
            variation: variation || null
        });

        let minWholesaleQty = 1;
        let selectedVar = null;

        if (variation && product.variations?.length) {
            selectedVar = product.variations.find((v: any) =>
                (v._id && v._id.toString() === variation.toString()) ||
                (v.id && v.id === variation.toString())
            );
        } else if (product.variations?.length) {
            selectedVar = product.variations[0];
        }

        if (customerType === 'wholesaler' && selectedVar) {
            minWholesaleQty = selectedVar.minWholesaleQty || 1;
        }

        if (cartItem) {
            // Update quantity
            cartItem.quantity += quantity;
            if (customerType === 'wholesaler' && cartItem.quantity < minWholesaleQty) {
                cartItem.quantity = minWholesaleQty;
            }
            await cartItem.save();
        } else {
            // Create new cart item
            cartItem = await CartItem.create({
                cart: cart._id,
                product: productId,
                quantity: customerType === 'wholesaler' ? Math.max(quantity, minWholesaleQty) : quantity,
                variation
            });
            cart.items.push(cartItem._id as any);
        }

        // Update total with location filtering
        cart.total = await calculateCartTotal(cart._id, nearbySellerIds, customerType);
        await cart.save();

        // Return updated cart with filtering
        const updatedCart = await Cart.findById(cart._id).populate({
            path: 'items',
            populate: {
                path: 'product',
                select: 'productName price mainImage stock pack mrp category subcategory seller status publish discPrice variations tax',
                populate: {
                    path: 'tax',
                    select: 'name percentage'
                }
            }
        });

        const filteredItems = (updatedCart?.items as any[] || []).filter(item => {
            const prod = item.product;
            if (!prod) return false;
            const prodCatId = prod.category?.toString();
            const prodSubId = prod.subcategory?.toString();
            if (prodCatId && !fullyActiveIds.has(prodCatId)) return false;
            if (prodSubId && !fullyActiveIds.has(prodSubId)) return false;
            return nearbySellerIds.some(id => id.toString() === prod.seller.toString());
        });

        // Calculate fees
        const fees = await calculateDeliveryStuff(cart.total, filteredItems, userLat, userLng);

        return res.status(200).json({
            success: true,
            message: 'Item added to cart',
            data: {
                ...updatedCart?.toObject(),
                items: filteredItems,
                total: cart.total,
                ...fees
            }
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error adding to cart',
            error: error.message
        });
    }
};

// Update item quantity
export const updateCartItem = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { itemId } = req.params;
        const { quantity } = req.body;
        const { latitude, longitude } = req.query;

        if (quantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        // Parse location
        const userLat = latitude ? parseFloat(latitude as string) : null;
        const userLng = longitude ? parseFloat(longitude as string) : null;

        if (userLat === null || userLng === null || isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({
                success: false,
                message: 'Location is required to update cart'
            });
        }

        const nearbySellerIds = await findSellersWithinRange(userLat, userLng);

        const cart = await Cart.findOne({ customer: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const cartItem = await CartItem.findOne({ _id: itemId, cart: cart._id }).populate('product');
        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        // Verify item is still available at location
        const product = cartItem.product as any;
        const fullyActiveIds = await getFullyActiveCategoryIds();
        const prodCatId = product?.category?.toString();
        const prodSubId = product?.subcategory?.toString();
        const isCatActive = prodCatId ? fullyActiveIds.has(prodCatId) : true;
        const isSubCatActive = prodSubId ? fullyActiveIds.has(prodSubId) : true;
        const isAvailable = product && isCatActive && isSubCatActive && nearbySellerIds.some(id => id.toString() === product.seller.toString());

        if (!isAvailable) {
            return res.status(403).json({
                success: false,
                message: 'This item is no longer available in your location'
            });
        }

        // Get customer account details for dynamic role-based calculations
        const customerObj = await Customer.findById(userId).select('customerType');
        const customerType = customerObj?.customerType || 'retailer';

        let minWholesaleQty = 1;
        let selectedVar = null;
        if (cartItem.variation && product.variations?.length) {
            selectedVar = product.variations.find((v: any) =>
                (v._id && v._id.toString() === cartItem.variation.toString()) ||
                (v.id && v.id === cartItem.variation.toString())
            );
        } else if (product.variations?.length) {
            selectedVar = product.variations[0];
        }

        if (customerType === 'wholesaler' && selectedVar) {
            minWholesaleQty = selectedVar.minWholesaleQty || 1;
        }

        if (customerType === 'wholesaler' && quantity < minWholesaleQty) {
            return res.status(400).json({
                success: false,
                message: `Minimum wholesale order quantity for this variation is ${minWholesaleQty}. To order less, please sign up as a retailer.`
            });
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        cart.total = await calculateCartTotal(cart._id, nearbySellerIds, customerType);
        await cart.save();

        const updatedCart = await Cart.findById(cart._id).populate({
            path: 'items',
            populate: {
                path: 'product',
                select: 'productName price mainImage stock pack mrp category subcategory seller status publish discPrice variations'
            }
        });

        const filteredItems = (updatedCart?.items as any[] || []).filter(item => {
            const prod = item.product;
            if (!prod) return false;
            const prodCatId = prod.category?.toString();
            const prodSubId = prod.subcategory?.toString();
            if (prodCatId && !fullyActiveIds.has(prodCatId)) return false;
            if (prodSubId && !fullyActiveIds.has(prodSubId)) return false;
            return prod && nearbySellerIds.some(id => id.toString() === prod.seller.toString());
        });

        // Calculate fees
        const fees = await calculateDeliveryStuff(cart.total, filteredItems, userLat, userLng);

        return res.status(200).json({
            success: true,
            message: 'Cart updated',
            data: {
                ...updatedCart?.toObject(),
                items: filteredItems,
                total: cart.total,
                ...fees
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error updating cart item',
            error: error.message
        });
    }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { itemId } = req.params;
        const { latitude, longitude } = req.query;

        // Parse location
        const userLat = latitude ? parseFloat(latitude as string) : null;
        const userLng = longitude ? parseFloat(longitude as string) : null;

        const cart = await Cart.findOne({ customer: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        await CartItem.findOneAndDelete({ _id: itemId, cart: cart._id });

        // Remove from cart array
        cart.items = cart.items.filter(id => id.toString() !== itemId);

        // Get customer account details for dynamic role-based calculations
        const customerObj = await Customer.findById(userId).select('customerType');
        const customerType = customerObj?.customerType || 'retailer';

        // Calculate total with location if provided
        let nearbySellerIds: mongoose.Types.ObjectId[] = [];
        if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
            nearbySellerIds = await findSellersWithinRange(userLat, userLng);
        }

        cart.total = await calculateCartTotal(cart._id, nearbySellerIds, customerType);
        await cart.save();

        const updatedCart = await Cart.findById(cart._id).populate({
            path: 'items',
            populate: {
                path: 'product',
                select: 'productName price mainImage stock pack mrp category subcategory seller status publish discPrice variations'
            }
        });

        const fullyActiveIds = await getFullyActiveCategoryIds();
        const filteredItems = (updatedCart?.items as any[] || []).filter(item => {
            const prod = item.product;
            if (!prod) return false;
            const prodCatId = prod.category?.toString();
            const prodSubId = prod.subcategory?.toString();
            if (prodCatId && !fullyActiveIds.has(prodCatId)) return false;
            if (prodSubId && !fullyActiveIds.has(prodSubId)) return false;
            if (nearbySellerIds.length > 0) {
                return prod && nearbySellerIds.some(id => id.toString() === prod.seller.toString());
            }
            return true; // If no location provided for removal, just return all (though getCart will filter)
        });

        // Calculate fees
        const fees = await calculateDeliveryStuff(cart.total, filteredItems, userLat, userLng);

        return res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            data: {
                ...updatedCart?.toObject(),
                items: filteredItems,
                total: cart.total,
                ...fees
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error removing from cart',
            error: error.message
        });
    }
};

// Clear cart
export const clearCart = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const cart = await Cart.findOne({ customer: userId });

        if (cart) {
            await CartItem.deleteMany({ cart: cart._id });
            cart.items = [];
            cart.total = 0;
            await cart.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Cart cleared',
            data: { items: [], total: 0 }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error clearing cart',
            error: error.message
        });
    }
};
