import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import { Product } from '../../../types/domain';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from '../../../hooks/useLocation';
import { useToast } from '../../../context/ToastContext'; // Import useToast
import { addToWishlist, removeFromWishlist, getWishlist } from '../../../services/api/customerWishlistService';
import Button from '../../../components/ui/button';
import Badge from '../../../components/ui/badge';
import { calculateProductPrice } from '../../../utils/priceUtils';

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  badgeText?: string;
  showPackBadge?: boolean;
  showStockInfo?: boolean;
  showHeartIcon?: boolean;
  showVegetarianIcon?: boolean;
  showOptionsText?: boolean;
  optionsCount?: number;
  compact?: boolean;
  categoryStyle?: boolean;
  storeStyle?: boolean;
}

export default function ProductCard({
  product,
  showBadge = false,
  badgeText,
  showPackBadge = false,
  showStockInfo = false,
  showHeartIcon = true,
  showVegetarianIcon = false,
  showOptionsText = false,
  optionsCount = 2,
  compact = false,
  categoryStyle = false,
  storeStyle = false,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast(); // Get toast function
  const imageRef = useRef<HTMLImageElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  // Single ref to track any cart operation in progress for this product
  const isOperationPendingRef = useRef(false);

  useEffect(() => {
    // Only check wishlist if user is authenticated
    if (!isAuthenticated) {
      setIsWishlisted(false);
      return;
    }

    const checkWishlist = async () => {
      try {
        const res = await getWishlist({
          latitude: location?.latitude,
          longitude: location?.longitude
        });
        if (res.success && res.data && res.data.products) {
          const targetId = String((product as any).id || product._id);
          const exists = res.data.products.some(p => String(p._id || (p as any).id) === targetId);
          setIsWishlisted(exists);
        }
      } catch (e) {
        // Silently fail if not logged in
        setIsWishlisted(false);
      }
    };
    checkWishlist();
  }, [product.id, product._id, isAuthenticated, location?.latitude, location?.longitude]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const targetId = String((product as any).id || product._id);
    const previousState = isWishlisted;

    try {
      if (isWishlisted) {
        // Optimistic update
        setIsWishlisted(false);
        await removeFromWishlist(targetId);
        showToast('Removed from wishlist');
      } else {
        if (!location?.latitude || !location?.longitude) {
          showToast('Location is required to add items to wishlist', 'error');
          return;
        }
        // Optimistic update
        setIsWishlisted(true);
        await addToWishlist(
          targetId,
          location?.latitude,
          location?.longitude
        );
        showToast('Added to wishlist');
      }
    } catch (e: any) {
      console.error('Failed to toggle wishlist:', e);
      setIsWishlisted(previousState);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to update wishlist';
      showToast(errorMessage, 'error');
    }
  };

  const cartItem = cart.items.find((item) => item?.product && (item.product.id === (product as any).id || item.product._id === (product as any).id || item.product.id === product._id));
  const inCartQty = cartItem?.quantity || 0;

  // Get Price and MRP using utility
  const { displayPrice, mrp, discount } = calculateProductPrice(product);

  const handleCardClick = () => {
    navigate(`/product/${((product as any).id || product._id) as string}`);
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if product is available in user's location
    if (product.isAvailable === false) {
      return;
    }

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current) {
      return;
    }

    isOperationPendingRef.current = true;

    try {
      await addToCart(product, addButtonRef.current);
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  const handleDecrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current || inCartQty <= 0) {
      return;
    }

    isOperationPendingRef.current = true;

    try {
      await updateQuantity(((product as any).id || product._id) as string, inCartQty - 1);
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  const handleIncrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if product is available in user's location
    if (product.isAvailable === false) {
      return;
    }

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current) {
      return;
    }

    isOperationPendingRef.current = true;

    try {
      if (inCartQty > 0) {
        await updateQuantity(((product as any).id || product._id) as string, inCartQty + 1);
      } else {
        await addToCart(product, addButtonRef.current);
      }
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="bg-white rounded-[20px] shadow-card border border-black/[0.04] overflow-hidden flex flex-col relative group transition-all duration-300 hover-lift tap-scale"
    >
      <div
        onClick={handleCardClick}
        className="cursor-pointer flex-1 flex flex-col"
      >
        <div className={`w-full relative aspect-[4/3] bg-neutral-50 overflow-hidden`}>
          {product.imageUrl || product.mainImage ? (
            <img
              ref={imageRef}
              src={product.imageUrl || product.mainImage}
              alt={product.name || product.productName || 'Product'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300 text-3xl font-bold fallback-icon';
                  fallback.textContent = (product.name || product.productName || '?').charAt(0).toUpperCase();
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300 text-3xl font-bold">
              {(product.name || product.productName || '?').charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Subtle Image Overlay for Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.08] via-transparent to-transparent opacity-60 pointer-events-none"></div>

          {/* Discount Badge Removed as per user request to use inline pricing instead */}

          {showHeartIcon && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(e);
              }}
              className={`absolute top-2 left-2 z-30 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center transition-all shadow-md group/heart border border-black/[0.04] active:scale-90 ${isWishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "#ef4444" : "none"}
                xmlns="http://www.w3.org/2000/svg"
                className={`transition-colors ${isWishlisted ? "text-red-500" : "text-neutral-500 group-hover/heart:text-red-500"}`}
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {(product.variations?.length || 0) >= 2 && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="text-[9px] font-bold text-[#0a193b] bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-md border border-black/[0.04]">
                {product.variations?.length} Options
              </span>
            </div>
          )}
          
          {showVegetarianIcon && (
            <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-white/95 backdrop-blur-sm border border-black/[0.04] rounded-md flex items-center justify-center shadow-sm">
              <div className="w-3 h-3 border border-green-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
              </div>
            </div>
          )}

          {/* ADD Button / Quantity Controls - Only show as overlay if NOT storeStyle */}
          {!storeStyle && (
            <div className="absolute bottom-2 right-2 z-30">
              {inCartQty === 0 ? (
                <button
                  ref={addButtonRef}
                  disabled={product.isAvailable === false}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(e);
                  }}
                  className={`h-7 font-bold text-[10px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center px-4 shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-90 ${product.isAvailable === false
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none rounded-lg'
                    : storeStyle
                      ? 'bg-[#0a193b] text-white rounded-full hover:bg-[#0a193b]/90 ring-1 ring-white/10'
                      : 'bg-white text-[#0a193b] border border-[#0a193b]/10 rounded-lg hover:bg-[#0a193b] hover:text-white hover:border-transparent'
                    }`}
                >
                  {product.isAvailable === false ? 'Out' : 'ADD'}
                </button>
              ) : (
                <div className="flex items-center bg-[#0a193b] text-white rounded-lg h-8 px-1 shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-white/10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDecrease(e);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors active:scale-90"
                    aria-label="Decrease quantity"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="text-[11px] font-bold min-w-[1.2rem] text-center">
                    {inCartQty}
                  </span>
                  <button
                    disabled={product.isAvailable === false}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIncrease(e);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors disabled:opacity-30 active:scale-90"
                    aria-label="Increase quantity"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 flex-1 flex flex-col">
          {/* Real Backend Quantity/Pack Info */}
          {(product.variations?.[0]?.value || product.pack) && (
            <div className="mb-0.5">
              <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest">
                {product.variations?.[0]?.value || product.pack}
              </span>
            </div>
          )}

          {/* Product Name */}
          <h3 className="text-[13px] font-bold text-[#0f172a] mb-1.5 line-clamp-2 leading-tight min-h-[1.5rem] group-hover:text-[#0a193b] transition-colors">
            {product.name || product.productName || ''}
          </h3>

          {/* Bottom Row: Rich Pricing (Matching Detail Page) */}
          <div className="mt-auto pt-1.5 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className={`text-[15px] font-black text-[#0a193b] leading-none ${storeStyle ? 'tracking-tight' : ''}`}>
                ₹{displayPrice.toLocaleString('en-IN')}
              </span>
              {mrp && mrp > displayPrice && (
                <span className="text-[11px] text-neutral-400 line-through decoration-neutral-500 decoration-[1.5px] leading-none">
                  ₹{mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          {/* Full Width Bottom Button for storeStyle */}
          {storeStyle && (
            <div className="mt-3">
              {inCartQty === 0 ? (
                <button
                  ref={addButtonRef}
                  disabled={product.isAvailable === false}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(e);
                  }}
                  className={`w-full h-10 rounded-full font-bold text-[13px] transition-all duration-300 flex items-center justify-center px-4 ${product.isAvailable === false
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    : 'bg-[#0a193b] text-white shadow-[0_4px_12px_rgba(10,25,59,0.2)] hover:bg-[#0a193b]/90 active:scale-95'
                    }`}
                >
                  {product.isAvailable === false ? 'Out of Stock' : 'Add to cart'}
                </button>
              ) : (
                <div className="flex items-center justify-between bg-[#0a193b] text-white rounded-full h-10 px-2 shadow-[0_4px_12px_rgba(10,25,59,0.2)]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDecrease(e);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors active:scale-90"
                    aria-label="Decrease quantity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="text-[13px] font-bold">
                    {inCartQty} in cart
                  </span>
                  <button
                    disabled={product.isAvailable === false}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIncrease(e);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 active:scale-90"
                    aria-label="Increase quantity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
