import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getHomeContent } from "../../services/api/customerHomeService";
import ProductCard from "./components/ProductCard";
import { useLocation } from "../../hooks/useLocation";
import logo from "../../../assets/logo.png";

export default function Collection() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();
  const initialTitle = searchParams.get("title") || "Collection";

  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<any>(null);
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

  useEffect(() => {
    const fetchSectionData = async () => {
      try {
        setLoading(true);
        // We fetch all home content and find our section
        // Ideally there would be a getSectionById API, but this works with existing service
        const response = await getHomeContent("all", userLocation?.latitude, userLocation?.longitude);
        if (response.success && response.data?.homeSections) {
          const found = response.data.homeSections.find((s: any) => s.id === id);
          if (found) {
            setSection(found);
          }
        }
      } catch (err) {
        console.error("Failed to fetch collection data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSectionData();
  }, [id, userLocation]);

  const locationDisplayText = userLocation?.address ||
    (userLocation?.city && userLocation?.state ? `${userLocation.city}, ${userLocation.state}` :
      (userLocation?.city || ""));

  if (!loading && !section) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="w-24 h-24 bg-[#0a193b]/5 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <span className="text-4xl">📦</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0a193b] mb-4 tracking-tight">
          Collection not found
        </h1>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3.5 bg-[#0a193b] text-white rounded-2xl font-bold hover:bg-[#0a193b]/90 transition-all shadow-lg active:scale-95"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const items = section?.data || [];
  const displayType = section?.displayType || "products";
  const columns = Number(section?.columns) || 4;

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    6: "grid-cols-3 md:grid-cols-6",
    8: "grid-cols-4 md:grid-cols-8",
  }[columns] || "grid-cols-2 md:grid-cols-4";

  return (
    <div className="min-h-screen bg-[#fcfaf7] relative flex flex-col pt-[140px] md:pt-[160px]">
      {/* Premium Fixed Header */}
      <header
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: isHeaderSolid ? '#0a193b' : 'linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.94) 100%)',
          boxShadow: isHeaderSolid ? "0 12px 24px rgba(0,0,0,0.12)" : "none",
          paddingBottom: isHeaderSolid ? '8px' : '20px',
        }}
      >
        <div className="px-5 md:px-10 pt-5 pb-3">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-8 flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group" onClick={() => navigate('/')}>
                <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105" />
                <span className="hidden md:block text-xl font-bold tracking-tight text-white">
                  Healthy Delight
                </span>
              </div>

              {locationDisplayText && (
                <div onClick={() => navigate('/account')} className="flex items-center gap-2 cursor-pointer max-w-[200px] md:max-w-md group">
                   <div className="p-1.5 rounded-full bg-white/10 text-white/90 border border-white/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Improved Search Bar */}
        <div className="px-5 md:px-10 py-3">
          <div className="w-full md:max-w-2xl md:mx-auto h-12 bg-white rounded-2xl flex items-center gap-4 px-5 shadow-lg border border-neutral-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a193b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder={`Search in ${section?.title || initialTitle}...`}
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-neutral-800"
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/search?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
              }}
            />
          </div>
        </div>
      </header>

      {/* Decorative Background */}
      <div className="fixed inset-0 bg-[#fcfaf7] -z-10" />

      {/* Hero Header */}
      <div className="px-5 pt-8 pb-4 md:px-10 md:pt-10 md:pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-[#0a193b] hover:bg-[#0a193b]/5 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0a193b] tracking-tight">
            {section?.title || initialTitle}
          </h1>
        </div>
        <p className="text-[13px] md:text-base text-neutral-500 font-medium">
          {items.length} {displayType === 'products' ? 'items' : 'categories'} available
        </p>
      </div>

      {/* Content Grid */}
      <div className="px-4 pb-24 md:px-10 md:pb-12">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className={`grid ${gridCols} gap-4 md:gap-8`}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-square bg-[#0a193b]/5 rounded-[24px] animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`grid ${gridCols} gap-5 md:gap-10`}
            >
              {items.map((item: any) => {
                if (displayType === "products") {
                  return (
                    <div key={item.id || item._id} className="min-w-0">
                      <ProductCard
                        product={item}
                        categoryStyle={true}
                        showBadge={true}
                        showPackBadge={false}
                        showStockInfo={false}
                        compact={columns >= 4}
                      />
                    </div>
                  );
                }

                // Default: Category Tiles
                return (
                  <button
                    key={item.id || item._id}
                    onClick={() => {
                      if (item.categoryId) navigate(`/category/${item.categoryId}`);
                      else if (item.slug) navigate(`/category/${item.slug}`);
                    }}
                    className="group flex flex-col items-center gap-3 p-4 bg-white rounded-[24px] border border-black/[0.03] shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
                  >
                    <div className="w-full aspect-square rounded-[18px] bg-[#f8f6f2] flex items-center justify-center overflow-hidden transition-colors group-hover:bg-[#f3eee5]">
                      {item.image || item.productImages?.[0] ? (
                        <img 
                          src={item.image || item.productImages?.[0]} 
                          alt={item.name} 
                          className="w-[80%] h-[80%] object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-[#0a193b]/20">{item.name?.charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-sm md:text-base font-bold text-[#0a193b] text-center line-clamp-2">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
