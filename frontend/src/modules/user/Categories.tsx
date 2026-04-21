import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  getCategories,
  Category as CustomerCategory,
} from "../../services/api/customerProductService";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { useLocation } from "../../hooks/useLocation";
import logo from "../../../assets/logo.png";

export default function Categories() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);
  const navigate = useNavigate();

  // Scroll Listener for Dynamic Header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCategories(true); // tree = true
        if (response.success && response.data) {
          setCategories(response.data);
        } else {
          setError("Failed to load categories. Please try again.");
        }
      } catch (err) {
        console.error("Failed to fetch customer categories:", err);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const flattenAllCategories = (cats: CustomerCategory[]): CustomerCategory[] => {
    const result: CustomerCategory[] = [];

    const walk = (nodes: CustomerCategory[]) => {
      nodes.forEach((cat) => {
        result.push(cat);
        const children = (cat.children || []) as CustomerCategory[];
        if (children.length > 0) {
          walk(children);
        }
      });
    };

    walk(cats);

    // Remove duplicates by _id just in case
    const seen = new Set<string>();
    return result.filter((cat) => {
      if (!cat._id) return false;
      if (seen.has(cat._id)) return false;
      seen.add(cat._id);
      return true;
    });
  };

  const allCategories = flattenAllCategories(categories);

  const handleCategoryClick = (cat: CustomerCategory) => {
    navigate(`/category/${cat._id}`);
  };

  if (loading && !categories.length) {
    return null; // global loader
  }

  const { location: userLocation } = useLocation();
  const locationPath = useRouterLocation();

  // Format location display text
  const locationDisplayText = userLocation?.address ||
    (userLocation?.city && userLocation?.state ? `${userLocation.city}, ${userLocation.state}` :
      (userLocation?.city || ""));

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col pt-[140px] md:pt-[2px]">
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
              <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group" onClick={() => navigate('/')}>
                <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105" />
              </div>

              {locationDisplayText && (
                <div onClick={() => navigate('/account')} className="flex items-center gap-2 cursor-pointer max-w-[200px] md:max-w-md group">
                  <div className="p-1.5 rounded-full bg-white/10 text-white/90 border border-white/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 leading-none mb-0.5">Delivery to</span>
                    <span className="text-sm font-bold text-white/95 truncate">{locationDisplayText}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/account')}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 md:px-10 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              if (input.value.trim()) navigate(`/search?q=${encodeURIComponent(input.value.trim())}`);
            }}
            className="w-full md:max-w-2xl md:mx-auto h-12 bg-white rounded-2xl flex items-center gap-4 px-5 shadow-lg border border-neutral-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a193b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search for categories..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-neutral-800"
            />
          </form>
        </div>
      </header>

      {/* Premium Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8f6f2] to-[#f6f1e6] -z-10" />

      {/* Decorative Texture Overlay (Optional, keep it very subtle) */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none -z-5" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }}></div>

      {/* Header Section - Better alignment for Desktop */}
      <div className="px-5 pt-4 pb-4 md:px-10 md:pt-0 md:pb-6 mt-4 md:mt-0">
        <h1 className="text-[20px] md:text-[32px] font-bold text-[#0a193b] tracking-tight">
          Categories
        </h1>
        <p className="text-[12px] md:text-[16px] text-neutral-500 mt-1 md:mt-2 font-medium">
          Choose from our curated fresh selections
        </p>
      </div>

      <div className="px-4 pb-12 md:px-8 lg:px-12">
        {allCategories.length > 0 ? (
          <div className="grid grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
            {allCategories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className="group relative flex flex-col items-center md:items-start p-1.5 md:p-6 bg-transparent md:bg-white/40 md:backdrop-blur-sm md:rounded-[24px] md:border md:border-white/50 md:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.05] md:hover:scale-[1.02] md:hover:bg-white/60 md:hover:shadow-[0_20px_40px_rgba(10,25,59,0.08)] active:scale-[0.94]"
              >
                {/* Mobile: Circle container | Desktop: Soft Rounded Rectangle */}
                <div className="w-full aspect-square md:aspect-[4/3] bg-white rounded-full md:rounded-[18px] flex items-center justify-center overflow-hidden mb-2.5 md:mb-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] md:shadow-none border border-black/[0.01] md:border-none transition-all duration-500">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-[75%] h-[75%] md:w-[85%] md:h-[85%] object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-lg md:text-3xl" aria-hidden="true">🛒</span>
                  )}
                </div>

                {/* Typography: Category Name */}
                <div className="flex flex-col items-center md:items-start w-full">
                  <span className="text-[12px] md:text-[18px] font-bold text-[#0a193b] text-center md:text-left leading-tight tracking-tight transition-all duration-300 line-clamp-2">
                    {cat.name}
                  </span>
                  <span className="hidden md:block text-[13px] text-neutral-400 mt-1 font-medium">
                    Explore items
                  </span>
                </div>

                {/* Action Arrows Removed */}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 text-3xl shadow-sm border border-black/[0.02]">
              📦
            </div>
            <p className="text-lg font-medium text-[#0a193b]">No categories found</p>
            <p className="text-[14px]">Please check back later</p>
          </div>
        )}
      </div>
    </div>
  );
}



