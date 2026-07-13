import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../../hooks/useOrders';
import { useCart } from '../../context/CartContext';
import { useLocation } from '../../hooks/useLocation';
import logo from '../../../assets/logo.png';
import SectionHeading from '../../components/SectionHeading';
import { useToast } from '../../context/ToastContext';

const formatOrderFriendly = (orderNumber?: string, orderId?: string) => {
  if (orderNumber && orderNumber !== 'N/A') {
    if (orderNumber.startsWith('ORD')) {
      const numericPart = orderNumber.replace('ORD', '');
      if (numericPart.length > 6) {
        return `ORD-${numericPart.slice(-6)}`;
      }
      return orderNumber;
    }
    return orderNumber.length > 10 ? orderNumber.slice(0, 8) : orderNumber;
  }
  if (orderId) {
    const cleanId = orderId.includes('-') ? orderId.split('-').slice(-1)[0] : orderId;
    if (cleanId.length > 6) {
      return `ORD-${cleanId.slice(-6).toUpperCase()}`;
    }
    return `ORD-${cleanId.toUpperCase()}`;
  }
  return 'Unknown';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'On the way':
      return 'bg-sky-500/10 text-sky-600';
    case 'Accepted':
      return 'bg-amber-500/10 text-amber-600';
    case 'Placed':
      return 'bg-slate-500/10 text-slate-600';
    default:
      return 'bg-slate-500/10 text-slate-600';
  }
};

export default function OrderAgain() {
  const { orders } = useOrders();
  const { cart, addToCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [addedOrders, setAddedOrders] = useState<Set<string>>(new Set());
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { location: userLocation } = useLocation();
  const locationPath = useRouterLocation();

  // Scroll Listener for Dynamic Header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Format location display text
  const locationDisplayText = userLocation?.address ||
    (userLocation?.city && userLocation?.state ? `${userLocation.city}, ${userLocation.state}` :
      (userLocation?.city || ""));

  // Handle "Order Again" - Add all items from an order to cart
  const handleOrderAgain = async (order: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (reorderingId) return;

    // Verify stock and availability of all items in the order
    const outOfStockItems: string[] = [];
    const unavailableItems: string[] = [];

    order.items.forEach((item: any) => {
      if (!item.product) return;

      // Check if product is active and published
      if (item.product.status !== 'Active' || item.product.publish === false) {
        unavailableItems.push(item.product.productName || item.product.name || 'Product');
        return;
      }

      const varName = item.variation || item.variantTitle;
      let availableStock = 0;

      if (item.product.variations?.length && varName) {
        const matchedVar = item.product.variations.find((v: any) =>
          v.value === varName || v.title === varName || v.pack === varName || v.name === varName
        );
        availableStock = matchedVar ? (matchedVar.stock ?? 0) : (item.product.stock ?? 0);
      } else {
        availableStock = item.product.stock ?? 0;
      }

      if (availableStock < item.quantity) {
        outOfStockItems.push(`${item.product.productName || item.product.name}${varName ? ` (${varName})` : ''}`);
      }
    });

    if (unavailableItems.length > 0) {
      showToast(`Sorry, these items are no longer available: ${unavailableItems.join(', ')}`, 'error');
      return;
    }

    if (outOfStockItems.length > 0) {
      showToast(`Sorry, these items are out of stock: ${outOfStockItems.join(', ')}`, 'error');
      return;
    }

    setReorderingId(order.id);
    try {
      // Add each item from the order to the cart sequentially to avoid race conditions
      for (const item of order.items) {
        if (!item.product) continue;

        const varName = item.variation || item.variantTitle;
        const productWithVariant = {
          ...item.product,
          variantTitle: varName,
          pack: varName,
        };

        // Add item to cart (adds 1 unit or minWholesaleQty)
        await addToCart(productWithVariant);

        // If the ordered quantity was greater than 1, update the quantity
        if (item.quantity > 1) {
          const productId = item.product.id || item.product._id;
          await updateQuantity(productId, item.quantity, undefined, varName);
        }
      }

      setAddedOrders(prev => new Set(prev).add(order.id));
      showToast("Order items added to cart successfully!", "success");
      navigate('/checkout');
    } catch (error) {
      console.error("Failed to reorder items:", error);
      showToast("Failed to reorder some items. Please check your cart.", "error");
    } finally {
      setReorderingId(null);
    }
  };

  const hasOrders = orders && orders.length > 0;

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col pt-[140px] md:pt-[5px]">
      {/* Premium Profile-Style Fixed Header (MOBILE ONLY) */}
      <header
        className="md:hidden fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: isHeaderSolid
            ? '#0a193b'
            : 'linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.9) 30%, rgba(10, 25, 59, 0.7) 60%, rgba(10, 25, 59, 0.4) 85%, rgba(252, 250, 247, 0) 100%)',
          boxShadow: isHeaderSolid ? "0 12px 24px rgba(0,0,0,0.12)" : "none",
          paddingBottom: '16px',
          borderBottomLeftRadius: isHeaderSolid ? '20px' : '0px',
          borderBottomRightRadius: isHeaderSolid ? '20px' : '0px',
        }}
      >
        <div className="px-5 md:px-10 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all shadow-lg"
              aria-label="Back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
              Order Again
            </h1>
          </div>
          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-105" />
          </div>
        </div>

        {/* Home-Style Search Bar */}
        <div className="px-5 md:px-10 pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              if (input.value.trim()) navigate(`/search?q=${encodeURIComponent(input.value.trim())}`);
            }}
            className="w-full md:max-w-2xl md:mx-auto h-12 md:h-13 bg-white rounded-2xl flex items-center gap-4 px-5 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 focus-within:ring-4 focus-within:ring-primary-500/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a193b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search for something to reorder..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-neutral-800 placeholder-slate-400"
              autoComplete="off"
            />
          </form>
        </div>
      </header>

      <div className="pb-4">
        {/* Orders Section - Show when orders exist */}
        {hasOrders && (
          <div className="px-5 mt-8 md:mt-0 mb-12">
            <div className="flex items-center gap-2 mb-6">
              <SectionHeading className="text-[18px] md:text-[20px] font-bold text-[#0a193b] tracking-tight" colorSeed="your-previous-orders">
                Your Previous Orders
              </SectionHeading>
            </div>
            <div className="flex flex-col gap-4">
              {orders.map((order) => {
                const previewItems = order.items.slice(0, 4);

                return (
                  <motion.div
                    key={order.id}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="group bg-white rounded-[18px] shadow-[0_6px_18px_rgba(0,0,0,0.06)] border border-black/[0.015] p-4 md:p-5 transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] cursor-pointer"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Top Row: Order ID & Status */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-[14px] md:text-[15px] font-medium text-[#0f172a] group-hover:text-[#0a193b] transition-colors">
                          Order #{formatOrderFriendly(order.orderNumber, order.id)}
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* Middle Area: Date/Time + Product Previews */}
                      <div className="flex items-end justify-between gap-4 border-b border-slate-50 pb-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-[12px] md:text-[13px] text-slate-500 font-medium">
                            {formatDate(order.createdAt)}
                          </div>

                          {/* Product Imagery - Highly Curated */}
                          <div className="flex items-center gap-2">
                            {previewItems
                              .filter(item => item?.product)
                              .map((item, idx) => (
                                <div
                                  key={idx}
                                  className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-full flex items-center justify-center p-1.5 border border-slate-100 shadow-sm transition-transform group-hover:scale-105"
                                  style={{ transitionDelay: `${idx * 50}ms` }}
                                >
                                  {(item.product.imageUrl || item.product.mainImage || (item.product as any).image) ? (
                                    <img
                                      src={item.product.imageUrl || item.product.mainImage || (item.product as any).image}
                                      alt={item.product.name}
                                      className="w-full h-full object-contain mix-blend-multiply"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400">?</span>
                                  )}
                                </div>
                              ))}
                            {order.items.length > 4 && (
                              <div className="w-8 h-8 md:w-9 md:h-9 bg-[#0a193b]/5 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0a193b] border border-[#0a193b]/10">
                                +{order.items.length - 4}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Summary: Price + Item Count */}
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="text-[16px] md:text-[18px] font-bold text-[#0a193b]">
                            ₹{order.totalAmount.toFixed(0)}
                          </div>
                          <div className="text-[12px] text-slate-500 font-medium uppercase tracking-tight">
                            {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: CTA */}
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => handleOrderAgain(order, e)}
                          disabled={reorderingId !== null || addedOrders.has(order.id)}
                          className={`w-full md:w-auto h-10 px-8 rounded-full text-[13px] font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
                            addedOrders.has(order.id)
                              ? 'bg-emerald-50 text-emerald-600 shadow-inner cursor-not-allowed border border-emerald-100'
                              : reorderingId === order.id
                              ? 'bg-[#0a193b]/70 text-white cursor-not-allowed'
                              : 'bg-[#0a193b] text-white hover:bg-[#122b5e] hover:shadow-[0_8px_20px_rgba(10,25,59,0.3)] shadow-[0_4px_10px_rgba(10,25,59,0.2)]'
                          }`}
                        >
                          {reorderingId === order.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Reordering...</span>
                            </>
                          ) : addedOrders.has(order.id) ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              <span>Added to Cart</span>
                            </>
                          ) : (
                            'Order Again'
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State Illustration - Show when no orders */}
        {!hasOrders && (
          <div className="bg-transparent py-6 px-4">
            <div className="flex flex-col items-center justify-center max-w-md mx-auto">
              {/* Grocery Illustration */}
              <div className="relative w-full max-w-xs mb-4">
                <div className="relative flex items-center justify-center">
                  {/* Yellow Shopping Bag */}
                  <div className="relative w-40 h-48 bg-gradient-to-b from-yellow-400 via-yellow-300 to-yellow-500 rounded-b-2xl rounded-t-lg shadow-xl border-2 border-yellow-500/30 flex items-center justify-center">
                    {/* Enhanced bag opening/top with depth */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-8 bg-gradient-to-b from-yellow-500 to-yellow-400 rounded-t-lg shadow-inner"></div>

                    {/* Enhanced bag handle with 3D effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-7 border-[4px] border-yellow-600 rounded-full border-b-transparent shadow-lg">
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-4 border-[2px] border-yellow-500/50 rounded-full border-b-transparent"></div>
                    </div>

                    {/* Decorative pattern/stitching on bag */}
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-yellow-600/30"></div>
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-28 h-0.5 bg-yellow-600/20"></div>

                    {/* Healthy Delight text inside basket */}
                    <div className="relative z-10 text-center px-4">
                      <span className="text-2xl font-extrabold text-neutral-900 tracking-tight drop-shadow-sm">Healthy Delight</span>
                      <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full ml-1.5 shadow-sm"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Reordering will be easy</h2>
                <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                  Items you order will show up here, so you can buy them again in a single tap.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
