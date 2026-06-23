import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useLocation } from '../hooks/useLocation';
import { Cart, CartItem } from '../types/cart';
import { Product } from '../types/domain';
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart
} from '../services/api/customerCartService';
import { calculateProductPrice } from '../utils/priceUtils';
import { getAppConfig } from '../services/configService';
import { motion, AnimatePresence } from 'framer-motion';

const CART_STORAGE_KEY = 'saved_cart';

interface AddToCartEvent {
  product: Product;
  sourcePosition?: { x: number; y: number };
}

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, sourceElement?: HTMLElement | null) => Promise<void>;
  removeFromCart: (productId: string, variantId?: string, variantTitle?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantId?: string, variantTitle?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: (latitude?: number, longitude?: number) => Promise<void>;
  lastAddEvent: AddToCartEvent | null;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Extended interface to include Cart Item ID
interface ExtendedCartItem extends CartItem {
  id?: string;
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage for persistence on refresh
  const [items, setItems] = useState<ExtendedCartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out items with null/undefined products (corrupted localStorage data)
        return Array.isArray(parsed) ? parsed.filter((item: any) => item?.product) : [];
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }
    return [];
  });
  const [lastAddEvent, setLastAddEvent] = useState<AddToCartEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const pendingOperationsRef = useRef<Set<string>>(new Set());

  const { isAuthenticated, user } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast();

  // State for estimate delivery fee
  const [estimatedFee, setEstimatedFee] = useState<number | undefined>(undefined);
  const [platformFee, setPlatformFee] = useState<number | undefined>(undefined);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | undefined>(undefined);

  // Load public settings fallbacks on mount
  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const config = await getAppConfig();
        // Update states to trigger reactive UI re-renders with correct fallbacks
        setPlatformFee(prev => prev ?? config.platformFee);
        setFreeDeliveryThreshold(prev => prev ?? config.freeDeliveryThreshold);
      } catch (e) {
        console.error("Failed to load public settings fallbacks:", e);
      }
    };
    loadPublicSettings();
  }, []);

  // Helper to map API cart items to internal CartItem structure
  const mapApiItemsToState = (apiItems: any[]): ExtendedCartItem[] => {
    return apiItems
      .filter((item: any) => item.product) // Safety filter
      .map((item: any) => ({
        id: item._id, // Store CartItem ID
        product: {
          id: item.product._id, // Map _id to id
          name: item.product.productName || item.product.name,
          price: item.product.price,
          mrp: item.product.mrp,
          discPrice: item.product.discPrice,
          variations: item.product.variations,
          imageUrl: item.product.mainImage || item.product.imageUrl,
          pack: item.product.pack || '1 unit',
          categoryId: item.product.category || '',
          description: item.product.description,
          tax: item.product.tax,
          variantId: item.variation // Preserving variation ID/value
        },
        quantity: item.quantity,
        variant: item.variation // Also preserve it here for order placement
      }));
  };

  // Sync to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Helper to sync cart from API
  const fetchCart = async (lat?: number, lng?: number) => {
    if (!isAuthenticated || user?.userType !== 'Customer') {
      setLoading(false);
      return;
    }

    try {
      const response = await getCart({
        latitude: lat ?? location?.latitude,
        longitude: lng ?? location?.longitude
      });
      if (response && response.data && response.data.items) {
        if (pendingOperationsRef.current.size > 0) {
          console.debug("Skipping fetchCart items update because operations are in progress");
          // Still update fee structures if they are provided, but keep optimistic items!
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        } else {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } else {
        if (pendingOperationsRef.current.size === 0) {
          setItems([]);
          setEstimatedFee(undefined);
          setPlatformFee(undefined);
          setFreeDeliveryThreshold(undefined);
        } else {
          console.debug("Skipping fetchCart items clear because operations are in progress");
        }
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCart = async (latitude?: number, longitude?: number) => {
    setLoading(true); // Optional: Set loading state if you want to show spinner
    await fetchCart(latitude, longitude);
  };

  // Load cart on auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      // Guest cart is already in 'items' from localStorage if it existed
      setLoading(false);
    }
  }, [isAuthenticated, user?.userType, location?.latitude, location?.longitude]);

  const cart: Cart = useMemo(() => {
    // Filter out any items with null products before computing totals
    const validItems = items.filter(item => item?.product);
    const total = validItems.reduce((sum, item) => {
      const { displayPrice } = calculateProductPrice(item.product, item.variant, user?.customerType, item.quantity);
      return sum + displayPrice * (item.quantity || 0);
    }, 0);
    const itemCount = validItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return {
      items: validItems,
      total,
      itemCount,
      estimatedDeliveryFee: estimatedFee,
      platformFee,
      freeDeliveryThreshold
    };
  }, [items, estimatedFee, platformFee, freeDeliveryThreshold, user?.customerType]);

  const addToCart = async (product: Product, sourceElement?: HTMLElement | null) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    // Get consistent product ID - MongoDB returns _id, frontend expects id
    const productId = product._id || product.id;

    // Prevent concurrent operations on the same product
    if (pendingOperationsRef.current.has(productId)) {
      return;
    }
    pendingOperationsRef.current.add(productId);

    // Normalize product to always have 'id' property for consistency
    const normalizedProduct: Product = {
      ...product,
      id: productId,
      name: product.name || product.productName || 'Product',
      imageUrl: product.imageUrl || product.mainImage,
    };

    // Determine if user is a wholesaler and set min order thresholds accordingly
    const isWholesaler = user?.customerType === 'wholesaler';
    let minQty = 1;

    const variantId = (product as any).variantId || (product as any).selectedVariant?._id;
    const variantTitle = (product as any).variantTitle || (product as any).pack;

    let selectedVariation = null;
    if (product.variations?.length) {
      if (variantId || variantTitle) {
        selectedVariation = product.variations.find((v: any) =>
          (v._id && v._id.toString() === (variantId || '').toString()) ||
          (v.id && v.id === (variantId || '')) ||
          v.value === variantTitle ||
          v.title === variantTitle ||
          v.pack === variantTitle
        );
      }
      if (!selectedVariation) {
        selectedVariation = product.variations[0];
      }
    }

    const hasWholesalePrice = selectedVariation &&
      typeof selectedVariation.wholesalePrice === 'number' &&
      selectedVariation.wholesalePrice > 0;

    const isWholesaleItem = isWholesaler && hasWholesalePrice;

    if (isWholesaleItem && selectedVariation) {
      minQty = selectedVariation.minWholesaleQty || 1;
    }

    // Check stock before adding/incrementing
    const existingItemForStock = items.find((item) => {
      const itemProductId = item.product.id || item.product._id;
      if (itemProductId !== productId) return false;

      const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
      const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;

      if (variantId || variantTitle) {
        return itemVariantId === variantId ||
          itemVariantTitle === variantTitle ||
          (itemVariantId && itemVariantId === variantTitle);
      }
      return true;
    });

    const currentQty = existingItemForStock ? existingItemForStock.quantity : 0;
    const targetQty = currentQty + (isWholesaleItem ? minQty : 1);
    const availableStock = selectedVariation ? (selectedVariation.stock ?? 0) : (product.stock ?? 0);

    if (targetQty > availableStock) {
      const variationName = selectedVariation ? (selectedVariation.value || selectedVariation.title || (selectedVariation as any).pack || (selectedVariation as any).name) : '';
      const variationSuffix = variationName ? ` (${variationName})` : '';
      const friendlyName = product.productName || product.name || 'Product';
      if (availableStock <= 0) {
        showToast(`Sorry, ${friendlyName}${variationSuffix} is currently out of stock.`, 'error');
      } else {
        showToast(`Oops! Only ${availableStock} units of ${friendlyName}${variationSuffix} are available in stock.`, 'error');
      }
      return;
    }

    // Optimistic Update
    // Get source position if element is provided
    let sourcePosition: { x: number; y: number } | undefined;
    if (sourceElement) {
      const rect = sourceElement.getBoundingClientRect();
      sourcePosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    setLastAddEvent({ product: normalizedProduct, sourcePosition });
    setTimeout(() => setLastAddEvent(null), 800);

    // Optimistically update state
    const previousItems = [...items];
    setItems((prevItems) => {
      // Filter out null products and find existing item
      const validItems = prevItems.filter(item => item?.product);

      // Check for variant ID or variant title if product has variants
      const variantId = (product as any).variantId || (product as any).selectedVariant?._id;
      const variantTitle = (product as any).variantTitle || (product as any).pack;

      // Find existing item - match by product ID and variant (if variant exists)
      const existingItem = validItems.find((item) => {
        const itemProductId = item.product.id || item.product._id;
        if (itemProductId !== productId) return false;

        const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;

        // If specific variant info is provided, try to match it
        if (variantId || variantTitle) {
          return itemVariantId === variantId ||
            itemVariantTitle === variantTitle ||
            (itemVariantId && itemVariantId === variantTitle);
        }

        // If no variant info provided (e.g. from ProductCard), match ANY item of this product
        // This ensures quantity updates work even if the item in cart has variant info
        return true;
      });

      if (existingItem) {
        return validItems.map((item) => {
          const itemProductId = item.product.id || item.product._id;
          if (itemProductId !== productId) return item;

          const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
          const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;

          // If variant info provided, match specifically
          if (variantId || variantTitle) {
            const isMatch = itemVariantId === variantId ||
              itemVariantTitle === variantTitle ||
              (itemVariantId && itemVariantId === variantTitle);
            return isMatch ? { ...item, quantity: isWholesaleItem ? Math.max(item.quantity + 1, minQty) : item.quantity + 1 } : item;
          }

          // If no variant info, and this is the item we found above, update its quantity
          return item === existingItem ? { ...item, quantity: isWholesaleItem ? Math.max(item.quantity + 1, minQty) : item.quantity + 1 } : item;
        });
      }
      
      if (isWholesaleItem) {
        showToast(`Wholesale pricing requires a minimum of ${minQty} units. Added ${minQty} units to your cart.`, 'info');
      }
      return [...validItems, { product: normalizedProduct, quantity: isWholesaleItem ? minQty : 1 }];
    });

    // Only sync to API if user is authenticated
    if (isAuthenticated && user?.userType === 'Customer') {
      try {
        // Pass variation info to API if available
        const variation = (product as any).variantId || (product as any).selectedVariant?._id || (product as any).variantTitle || (product as any).pack;
        const initialAddQty = isWholesaleItem ? minQty : 1;
        const response = await apiAddToCart(
          productId,
          initialAddQty,
          variation,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          // Atomic update from server response
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } catch (error: any) {
        console.error("Add to cart failed", error);
        // Show error toast
        showToast(error.response?.data?.message || "Failed to add to cart", 'error');
        // Revert on error
        setItems(previousItems);
      } finally {
        // Remove from pending operations
        pendingOperationsRef.current.delete(productId);
      }
    } else {
      // For unregistered users, the optimistic update is already saved to localStorage
      // Remove from pending operations immediately
      pendingOperationsRef.current.delete(productId);
    }
  };

  const removeFromCart = async (productId: string, variantId?: string, variantTitle?: string) => {
    // Create a unique operation key
    const operationKey = variantId ? `${productId}-${variantId}` : (variantTitle ? `${productId}-${variantTitle}` : productId);

    // Prevent concurrent operations on the same product/variant
    if (pendingOperationsRef.current.has(operationKey)) {
      return;
    }
    pendingOperationsRef.current.add(operationKey);

    // Find item matching product ID and variant
    const itemToRemove = items.find(item => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      if (itemProductId !== productId) return false;

      if (variantId || variantTitle) {
        const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;
        return itemVariantId === variantId ||
          itemVariantTitle === variantTitle ||
          (itemVariantId && itemVariantId === variantTitle);
      }
      return true;
    });

    if (!itemToRemove) {
      pendingOperationsRef.current.delete(operationKey);
      return;
    }

    const previousItems = [...items];
    setItems((prevItems) => prevItems.filter((item) => item !== itemToRemove));

    // Only sync to API if user is authenticated and item has CartItemID
    if (isAuthenticated && user?.userType === 'Customer' && itemToRemove?.id) {
      try {
        const response = await apiRemoveFromCart(
          itemToRemove.id,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } catch (error) {
        console.error("Remove from cart failed", error);
        setItems(previousItems);
      } finally {
        // Remove from pending operations
        pendingOperationsRef.current.delete(operationKey);
      }
    } else {
      // For unregistered users, remove from pending operations immediately
      pendingOperationsRef.current.delete(operationKey);
    }
  };

  const updateQuantity = async (productId: string, quantity: number, variantId?: string, variantTitle?: string) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    // Create a unique operation key for this product/variant combination
    const operationKey = variantId ? `${productId}-${variantId}` : (variantTitle ? `${productId}-${variantTitle}` : productId);

    // Find item matching product ID and variant (if variant info provided)
    const itemToUpdate = items.find(item => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      if (itemProductId !== productId) return false;

      // If variant info provided, match by variant
      if (variantId || variantTitle) {
        const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
        const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;
        return itemVariantId === variantId ||
          itemVariantTitle === variantTitle ||
          (itemVariantId && itemVariantId === variantTitle);
      }

      // If no variant info, match ANY item of this product (ProductCard usage)
      return true;
    });

    const isWholesaler = user?.customerType === 'wholesaler';
    let minQty = 1;
    const productObj = itemToUpdate?.product;
    let isWholesaleItem = false;
    
    let selectedVar = null;
    if (productObj?.variations?.length) {
      const vId = (productObj as any).variantId || (productObj as any).selectedVariant?._id;
      const vTitle = (productObj as any).variantTitle || (productObj as any).pack;
      selectedVar = productObj.variations.find((v: any) =>
        (v._id && v._id.toString() === (vId || '').toString()) ||
        (v.id && v.id === (vId || '')) ||
        v.value === vTitle ||
        v.title === vTitle ||
        v.pack === vTitle
      );
      if (!selectedVar) {
        selectedVar = productObj.variations[0];
      }
      if (selectedVar && isWholesaler) {
        const hasWholesalePrice = typeof selectedVar.wholesalePrice === 'number' && selectedVar.wholesalePrice > 0;
        isWholesaleItem = hasWholesalePrice;
        if (isWholesaleItem) {
          minQty = selectedVar.minWholesaleQty || 1;
        }
      }
    }

    if (quantity <= 0) {
      removeFromCart(productId, variantId, variantTitle);
      return;
    }

    if (isWholesaleItem && quantity < minQty) {
      showToast(`Removed from cart. Minimum wholesale order quantity is ${minQty}. To order less, please sign up as retailer.`, 'error');
      removeFromCart(productId, variantId, variantTitle);
      return;
    }

    // Check stock before updating quantity
    const availableStock = selectedVar ? (selectedVar.stock ?? 0) : (productObj?.stock ?? 0);
    if (quantity > availableStock) {
      const variationName = selectedVar ? (selectedVar.value || selectedVar.title || (selectedVar as any).pack || (selectedVar as any).name) : '';
      const variationSuffix = variationName ? ` (${variationName})` : '';
      const friendlyName = productObj?.productName || productObj?.name || 'Product';
      if (availableStock <= 0) {
        showToast(`Sorry, ${friendlyName}${variationSuffix} is currently out of stock.`, 'error');
      } else {
        showToast(`Oops! Only ${availableStock} units of ${friendlyName}${variationSuffix} are available in stock.`, 'error');
      }
      return;
    }

    // Prevent concurrent operations on the same product
    if (pendingOperationsRef.current.has(operationKey)) {
      return;
    }
    pendingOperationsRef.current.add(operationKey);



    const previousItems = [...items];
    setItems((prevItems) =>
      prevItems.filter(item => item?.product).map((item) => {
        const itemProductId = item.product.id || item.product._id;
        if (itemProductId !== productId) return item;

        // If variant info provided, match by variant
        if (variantId || variantTitle) {
          const itemVariantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id;
          const itemVariantTitle = (item.product as any).variantTitle || (item.product as any).pack;
          if (itemVariantId === variantId ||
            itemVariantTitle === variantTitle ||
            (itemVariantId && itemVariantId === variantTitle)) {
            return { ...item, quantity };
          }
        } else if (item === itemToUpdate) {
          // If no variant info, match the specific item we found above
          return { ...item, quantity };
        }
        return item;
      })
    );

    // Only sync to API if user is authenticated and item has CartItemID
    if (isAuthenticated && user?.userType === 'Customer' && itemToUpdate?.id) {
      try {
        const response = await apiUpdateCartItem(
          itemToUpdate.id,
          quantity,
          location?.latitude,
          location?.longitude
        );
        if (response && response.data && response.data.items) {
          setItems(mapApiItemsToState(response.data.items));
          setEstimatedFee(response.data.estimatedDeliveryFee);
          setPlatformFee(response.data.platformFee);
          setFreeDeliveryThreshold(response.data.freeDeliveryThreshold);
        }
      } catch (error) {
        console.error("Update quantity failed", error);
        setItems(previousItems);
      } finally {
        // Remove from pending operations
        pendingOperationsRef.current.delete(operationKey);
      }
    } else {
      // For unregistered users, remove from pending operations immediately
      pendingOperationsRef.current.delete(operationKey);
    }
  };


  const clearCart = async () => {
    setItems([]);
    try {
      await apiClearCart();
    } catch (error) {
      console.error("Clear cart failed", error);
      await fetchCart();
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, lastAddEvent, loading }}
    >
      {children}
      <AnimatePresence>
        {showLoginPrompt && <LoginPromptModal onClose={() => setShowLoginPrompt(false)} />}
      </AnimatePresence>
    </CartContext.Provider>
  );
}

function LoginPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-5">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0a193b]/60 backdrop-blur-[6px]"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative bg-[#f8f6f2] rounded-[32px] p-8 max-w-sm w-full shadow-[0_24px_64px_rgba(10,25,59,0.3)] border border-black/[0.04] text-center flex flex-col items-center gap-6 overflow-hidden z-10"
      >
        {/* Design pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")',
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors shadow-sm"
          aria-label="Close modal"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Golden Pulse Icon */}
        <div className="w-16 h-16 rounded-[22px] bg-white border border-[#c5a059]/20 flex items-center justify-center text-3xl shadow-[0_8px_20px_rgba(197,160,89,0.15)] relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-[22px] bg-[#c5a059]/10 opacity-75" />
          🥛
        </div>

        <div>
          <h3 className="text-xl font-bold text-[#0a193b] font-outfit leading-tight mb-2">
            Login Required
          </h3>
          <p className="text-[13px] text-[#64748b] leading-relaxed font-medium">
            Join Healthy Delight to start adding fresh organic dairy and delicious items to your cart!
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => {
              window.location.href = '/user/login';
            }}
            className="w-full h-12 rounded-xl bg-[#0a193b] text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(10,25,59,0.2)] hover:bg-[#c5a059] hover:shadow-[0_8px_20px_rgba(197,160,89,0.25)] transition-all duration-300 transform active:scale-95"
          >
            Continue to Login
          </button>
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-transparent text-[#0a193b]/70 hover:text-[#0a193b] font-bold text-[14px] transition-colors"
          >
            Keep Browsing
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}


