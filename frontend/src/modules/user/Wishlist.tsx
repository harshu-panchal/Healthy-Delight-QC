import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getWishlist, removeFromWishlist } from '../../services/api/customerWishlistService';
import { Product } from '../../types/domain';
import { useCart } from '../../context/CartContext';
import { useLocation } from '../../hooks/useLocation';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateProductPrice } from '../../utils/priceUtils';
import logo from "../../../assets/logo.png";

export default function Wishlist() {
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);

  // Scroll Listener for Dynamic Header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await getWishlist({
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude
      });
      if (res.success && res.data) {
        setProducts(res.data.products.map(p => ({
          ...p,
          id: p._id || (p as any).id,
          name: p.productName || (p as any).name,
          imageUrl: p.mainImageUrl || p.mainImage || (p as any).imageUrl,
          price: (p as any).price || (p as any).variations?.[0]?.price || 0,
          pack: (p as any).pack || (p as any).variations?.[0]?.name || 'Standard'
        })) as any);
      }
    } catch (error: any) {
      console.error('Failed to fetch wishlist:', error);
      showToast(error.message || 'Failed to fetch wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [userLocation?.latitude, userLocation?.longitude]);

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      setProducts(products.filter(p => (p.id !== productId && p._id !== productId)));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  // Format location display text
  const locationDisplayText = userLocation?.address ||
    (userLocation?.city && userLocation?.state ? `${userLocation.city}, ${userLocation.state}` :
      (userLocation?.city || ""));

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col pt-[140px] md:pt-[2px] pb-24 md:pb-8">
      {/* Premium Home-Style Fixed Header (MOBILE ONLY) */}
      <header
        className="md:hidden fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: isHeaderSolid
            ? '#0a193b'
            : 'linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.9) 30%, rgba(10, 25, 59, 0.7) 60%, rgba(10, 25, 59, 0.4) 85%, rgba(252, 250, 247, 0) 100%)',
          boxShadow: isHeaderSolid ? "0 12px 24px rgba(0,0,0,0.12)" : "none",
          paddingBottom: isHeaderSolid ? '8px' : '20px',
          borderBottomLeftRadius: isHeaderSolid ? '20px' : '0px',
          borderBottomRightRadius: isHeaderSolid ? '20px' : '0px',
        }}
      >
        <div className="px-5 md:px-10 pt-5 pb-3">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-8 flex-1 min-w-0">
              {/* Logo */}
              <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group" onClick={() => navigate('/')}>
                <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105" />
              </div>

              {/* Location */}
              {locationDisplayText && (
                <div onClick={() => navigate('/account')} className="flex items-center gap-2 cursor-pointer max-w-[200px] md:max-w-md group">
                  <div className="p-1.5 rounded-full bg-white/10 text-white/90 group-hover:bg-white/20 transition-all border border-white/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 leading-none mb-0.5">Delivery to</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white/95 truncate group-hover:text-white transition-colors">{locationDisplayText}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-white transition-colors">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Button */}
            <button
              onClick={() => navigate('/account')}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all shadow-lg"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Home-Style Search Bar */}
        <div className="px-5 md:px-10 py-3">
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
              placeholder="Search for fresh items..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-neutral-800 placeholder-slate-400"
              autoComplete="off"
            />
          </form>
        </div>
      </header>

      {/* Premium Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8f6f2] to-[#f6f1e6] -z-10" />
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none -z-5" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }}></div>

      {/* Page Header Section */}
      <div className="px-5 pt-4 pb-4 md:px-10 md:pt-0 md:pb-6 mt-4 md:mt-0 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] md:text-[22px] font-semibold text-[#0a193b] tracking-tight">
            My Wishlist
          </h1>
          <p className="text-[11px] md:text-[13px] text-neutral-500 mt-1 font-medium">
            Items you've saved for later
          </p>
        </div>
        {products.length > 0 && (
          <div className="bg-[#0a193b]/5 px-3 py-1.5 rounded-full border border-[#0a193b]/10">
            <span className="text-[12px] font-bold text-[#0a193b]">
              {products.length} {products.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
        )}
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a193b]"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col relative"
              >
                <button
                  onClick={() => handleRemove(product.id)}
                  className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                </button>

                <Link to={`/product/${product.id}`} className="aspect-square bg-neutral-50 flex items-center justify-center p-4">
                  {product.imageUrl || product.mainImage ? (
                    <img src={product.imageUrl || product.mainImage} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                </Link>

                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-2 mb-1">{product.name}</h3>
                  <div className="text-[10px] text-neutral-500 mb-2">{product.pack}</div>
                  <div className="mt-auto flex flex-col gap-2">
                    {(() => {
                      const { displayPrice, mrp, hasDiscount } = calculateProductPrice(product);
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-neutral-900">₹{displayPrice.toLocaleString('en-IN')}</span>
                          {hasDiscount && (
                            <span className="text-xs text-neutral-500 line-through">₹{mrp.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      );
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToCart(product)}
                      className="w-full border-[#0a193b] text-[#0a193b] hover:bg-neutral-50 rounded-lg h-8 text-xs font-bold"
                    >
                      ADD TO CART
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-500">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Your wishlist is empty</h2>
            <p className="text-sm mb-6">Explore more and shortlist some items</p>
            <Button onClick={() => navigate('/')} className="bg-[#0a193b] text-white rounded-full px-8">
              Start Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
