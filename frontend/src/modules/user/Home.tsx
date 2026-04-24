import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import HomeHero from "./components/HomeHero";
import HomeBannerCarousel from "./components/HomeBannerCarousel";
import PromoStrip from "./components/PromoStrip";
import CategoryTileSection from "./components/CategoryTileSection";
import FeaturedThisWeek from "./components/FeaturedThisWeek";
import ProductCard from "./components/ProductCard";
import { getHomeContent } from "../../services/api/customerHomeService";
import { getProducts } from "../../services/api/customerProductService";
import { getHeaderCategoriesPublic } from "../../services/api/headerCategoryService";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import PageLoader from "../../components/PageLoader";
import { AnimatePresence, motion } from "framer-motion";

import { useThemeContext } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import DeliveryCalendarStrip from "./components/DeliveryCalendarStrip";

export default function Home() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { isAuthenticated } = useAuth();
  const { activeCategory, setActiveCategory } = useThemeContext();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const activeTab = activeCategory; // mapping for existing code compatibility
  const setActiveTab = setActiveCategory;
  const contentRef = useRef<HTMLDivElement>(null);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deliveryData] = useState<Record<string, "delivered" | "upcoming" | "vacation" | "onhold">>({
    "2026-04-24": "delivered",
    "2026-04-25": "upcoming",
    "2026-04-26": "upcoming",
    "2026-04-27": "vacation",
  });

  // State for dynamic data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>({
    bestsellers: [],
    categories: [],
    homeSections: [], // Dynamic sections created by admin
    shops: [],
    promoBanners: [],
    trending: [],
    cookingIdeas: [],
  });
  const [headerCategories, setHeaderCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Resolve the display name for the current active tab
  const activeHeaderCategoryName = useMemo(() => {
    if (activeTab === "all") return "Home";
    const found = headerCategories.find(c => c.slug === activeTab);
    if (found) return found.name;
    // Fallback to formatted slug if not found yet
    return activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/-/g, " ");
  }, [activeTab, headerCategories]);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [productsLoading, setProductsLoading] = useState(false);

  // Fetch header categories for mapping slugs to IDs
  useEffect(() => {
    const fetchHeaderCategories = async () => {
      try {
        const cats = await getHeaderCategoriesPublic(true);
        setHeaderCategories(cats);
      } catch (err) {
        console.error("Failed to fetch header categories", err);
      }
    };
    fetchHeaderCategories();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        startRouteLoading();
        setLoading(true);
        setError(null);
        setCategoryProducts([]); // Clear stale products immediately
        if (activeTab !== "all") {
          setProductsLoading(true);
          setHomeData((prev: any) => ({ ...prev, categories: [] })); // Clear stale categories
        }

        const response = await getHomeContent(
          activeTab,
          location?.latitude,
          location?.longitude,
        );
        if (response.success && response.data) {
          setHomeData(response.data);

          if (response.data.bestsellers) {
            setProducts(response.data.bestsellers);
          }
        } else {
          setError("Failed to load content. Please try again.");
        }
      } catch (error) {
        console.error("Failed to fetch home content", error);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
        stopRouteLoading();
      }
    };

    fetchData();
    setSelectedSubcategory("all");

    // Preload PromoStrip data for all header categories in the background
    // This ensures instant loading when users switch tabs
    const preloadHeaderCategories = async () => {
      try {
        // Wait a bit after initial load to not interfere with main content
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const headerCategories = await getHeaderCategoriesPublic(true);
        // Preload data for each header category (including 'all')
        const slugsToPreload = [
          "all",
          ...headerCategories.map((cat) => cat.slug),
        ];

        // Preload in batches to avoid overwhelming the network
        const batchSize = 2;
        for (let i = 0; i < slugsToPreload.length; i += batchSize) {
          const batch = slugsToPreload.slice(i, i + batchSize);
          await Promise.all(
            batch.map((slug) =>
              getHomeContent(
                slug,
                location?.latitude,
                location?.longitude,
                true,
                5 * 60 * 1000,
                true,
              ).catch((err) => {
                // Silently fail - this is just preloading
                console.debug(`Failed to preload data for ${slug}:`, err);
              }),
            ),
          );
          // Small delay between batches
          if (i + batchSize < slugsToPreload.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      } catch (error) {
        // Silently fail - preloading is optional
        console.debug("Failed to preload header categories:", error);
      }
    };

    preloadHeaderCategories();
  }, [location?.latitude, location?.longitude, activeTab]);

  // Fetch products when category/subcategory changes
  useEffect(() => {
    if (activeTab === "all") return;

    const fetchCategoryProducts = async () => {
      try {
        setProductsLoading(true);
        const params: any = {
          latitude: location?.latitude,
          longitude: location?.longitude,
          limit: 50
        };

        // If 'all' is selected under a header category, we need to fetch all products for that header
        // For now, if we have selectedSubcategory, we use it directly.
        // If it's 'all', we might need to find all subcategories IDs for this header.
        if (selectedSubcategory !== "all") {
          params.category = selectedSubcategory;
        } else {
          // Find all category IDs for this header category to fetch all products
          const currentHeaderCat = headerCategories.find(h => h.slug === activeTab);
          const currentHeaderId = currentHeaderCat?._id || currentHeaderCat?.id;

          if (currentHeaderId) {
            // Find all categories matching this header
            const catIds = homeData.categories
              .filter((c: any) => {
                const hId = c.headerCategoryId?._id || c.headerCategoryId;
                return String(hId) === String(currentHeaderId);
              })
              .map((c: any) => c._id || c.id);

            if (catIds.length > 0) {
              params.category = catIds.join(',');
            } else {
              // If we are on 'all' subcategory but haven't loaded categories for this header yet,
              // don't fetch anything yet - wait for homeData to arrive.
              return;
            }
          } else {
            // If header categories themselves haven't loaded, wait.
            return;
          }
        }

        const response = await getProducts(params);
        if (response.success && response.data) {
          setCategoryProducts(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch products for category:", error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [activeTab, selectedSubcategory, headerCategories, homeData.categories, location?.latitude, location?.longitude]);

  const filteredProducts = useMemo(() => {
    if (activeTab === "all") return products;
    return categoryProducts;
  }, [activeTab, products, categoryProducts]);

  const handleGoToCategories = () => {
    navigate("/categories");
  };

  if (loading && !products.length) {
    return <PageLoader />; // Let the global IconLoader handle the initial loading state
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors">
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <div className={`${activeTab === "all" ? "pt-[var(--header-height)] md:pt-0" : "pt-[calc(var(--header-height)-34px)] md:pt-0"} `} ref={contentRef}>
      {/* Hero Header with Gradient and Tabs */}
      <HomeHero activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Delivery Calendar Strip - Only on mobile/tablet for now matching design */}
      {activeTab === "all" && (
        <div className="md:hidden">
          <DeliveryCalendarStrip 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate}
            deliveryData={deliveryData}
          />
          
          {/* Daily Status Banner */}
          <div className="px-5 py-4">
            {!isAuthenticated ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50/50 border border-blue-100 rounded-[24px] p-5 flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-neutral-800">You're not logged in</h3>
                  <p className="text-[11px] text-neutral-500 font-medium">Log in to track your daily deliveries</p>
                </div>
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-[#0a193b] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-[#122b5e] transition-all"
                >
                  Login
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedDate.toISOString()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-neutral-50/80 border border-neutral-100 rounded-[24px] p-5 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0a193b] shadow-sm border border-neutral-50">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-neutral-800 leading-tight">
                    {deliveryData[format(selectedDate, "yyyy-MM-dd")] 
                      ? "Orders scheduled for today" 
                      : "There are no orders scheduled for this day"}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                    {deliveryData[format(selectedDate, "yyyy-MM-dd")] 
                      ? "1 delivery coming between 6-9 AM" 
                      : "Manage your delivery schedule"}
                  </p>
                </div>
                <button 
                  onClick={() => navigate(deliveryData[format(selectedDate, "yyyy-MM-dd")] ? '/orders' : '/categories')}
                  className="bg-[#0a193b] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md whitespace-nowrap"
                >
                  {deliveryData[format(selectedDate, "yyyy-MM-dd")] ? "View Details" : "Add Products"}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Banners Carousel */}
      {activeTab === "all" &&
        homeData.promoBanners &&
        homeData.promoBanners.length > 0 && (
          <HomeBannerCarousel banners={homeData.promoBanners} />
        )}

      {/* Quick Categories strip */}
      {/* Refined Quick Categories strip - Full Width Solid Architecture */}
      {activeTab === "all" && homeData.categories && homeData.categories.length > 0 && (
        <div className="w-full mt-8 mb-12 px-5 py-8 md:px-10 lg:px-12 bg-[#f8f6f2] md:rounded-[48px] md:mx-auto md:max-w-[1240px] border-y md:border border-black/[0.02] shadow-[0_4px_12px_rgba(0,0,0,0.03),0_20px_50px_rgba(0,0,0,0.06)]">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8 px-1">
            <h2 className="text-[18px] md:text-2xl font-bold text-[#0a193b] tracking-tight">
              Categories
            </h2>
            <button
              type="button"
              onClick={handleGoToCategories}
              className="section-see-all group flex items-center gap-1.5 transition-all hover:translate-x-1"
            >
              See all
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Premium White-on-Cream Architecture - Increased Breathing Room */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-y-10 md:gap-x-12">
            {homeData.categories.slice(0, 12).map((cat: any) => (
              <button
                key={cat._id || cat.id}
                type="button"
                onClick={() => navigate(`/category/${cat._id || cat.id}`)}
                className="hover-lift tap-scale group flex flex-col items-center gap-2 transition-all duration-300"
              >
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-[22px] bg-white p-2 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:translate-y-[-4px] shadow-[0_4px_12px_rgba(0,0,0,0.06),0_10px_24px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-black/[0.04] relative after:absolute after:inset-0 after:rounded-[22px] after:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95)] after:pointer-events-none">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-lg" aria-hidden="true">
                      🥛
                    </span>
                  )}
                </div>
                <span className="text-[11px] md:text-[13px] font-bold text-[#0a193b] text-center leading-tight">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content grid for 'All' tab and Sidebar layout for Categories */}
      <div
        ref={contentRef}
        className={`${activeTab === "all"
          ? "pt-0 space-y-5 md:space-y-8 md:pt-4"
          : "pt-0"
          }`}>
        {/* Category Specific View (Sidebar + Products) */}
        {activeTab !== "all" && (
          <div className="flex bg-transparent min-h-[70vh] relative pt-16 md:pt-6">
            {/* Unified Floating Navigation Rail - Descriptive Color Icons - Hidden on Desktop as requested */}
            <div className="flex md:hidden flex-col items-center gap-5 md:gap-6 sticky top-[calc(var(--header-height)+16px)] h-fit w-[64px] md:w-[82px] ml-2 md:ml-4 mr-3 md:mr-8 py-4 px-1.5 bg-white/70 backdrop-blur-md rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/30 z-40 transition-all duration-300">
              {/* 'All' Option */}
              <button
                type="button"
                onClick={() => {
                  setSelectedSubcategory("all");
                  window.scrollTo({ top: contentRef.current?.offsetTop ? contentRef.current.offsetTop - 100 : 0, behavior: 'smooth' });
                }}
                className="group flex flex-col items-center gap-1.5 w-full transition-all duration-200 active:scale-95"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 transition-all duration-300 rounded-[12px] md:rounded-[14px] shadow-sm ${selectedSubcategory === "all" ? "bg-[#0a193b] text-white scale-105 shadow-md" : "bg-white border border-black/[0.04] hover:bg-black/[0.02]"}`}
                >
                  <span className="text-base md:text-lg">📦</span>
                </div>
                <span className={`text-[9px] md:text-[10px] font-bold text-center leading-tight transition-colors ${selectedSubcategory === "all" ? "text-[#0a193b]" : "text-[#0a193b]/50"}`}>
                  All
                </span>
              </button>

              <div className="w-8 h-[1px] bg-black/[0.05] -my-1"></div>

              {/* Dynamic Subcategories */}
              {(() => {
                const visibleCategories = homeData.categories || [];

                return visibleCategories.map((cat: any) => {
                  const isSelected = String(cat._id || cat.id) === String(selectedSubcategory);
                  return (
                    <button
                      key={cat._id || cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubcategory(cat._id || cat.id);
                        window.scrollTo({ top: contentRef.current?.offsetTop ? contentRef.current.offsetTop - 100 : 0, behavior: 'smooth' });
                      }}
                      className="group flex flex-col items-center gap-1.5 w-full transition-all duration-200 active:scale-95"
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 transition-all duration-300 rounded-[12px] md:rounded-[14px] shadow-sm overflow-hidden ${isSelected ? "bg-[#0a193b] text-white scale-105 shadow-md ring-2 ring-[#0a193b]/10" : "bg-white border border-black/[0.04] hover:bg-black/[0.02]"}`}
                      >
                        <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center pointer-events-none">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className={`w-full h-full object-cover transition-all duration-300 ${isSelected ? "brightness-125 contrast-125 scale-110" : ""}`}
                            />
                          ) : (
                            <span className={`text-sm md:text-base ${isSelected ? "" : "opacity-80"}`}>{cat.icon || "🛒"}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[9px] md:text-[10px] font-bold text-center leading-tight line-clamp-2 px-1 transition-colors ${isSelected ? "text-[#0a193b]" : "text-[#0a193b]/50"}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Right Side: Product Grid */}
            <div className="flex-1 px-4 md:px-10 pb-4 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedSubcategory}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {/* Title Section Removed */}

                  {productsLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 animate-pulse">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-[#0a193b]/5 h-[240px] md:h-[260px] rounded-[16px] md:rounded-[20px] shadow-sm"></div>
                      ))}
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 md:gap-10 lg:gap-8 xl:gap-10">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id || product._id}
                          product={product}
                          categoryStyle={true}
                          showBadge={true}
                          showPackBadge={false}
                          showStockInfo={false}
                          compact={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-[#0a193b]/5 rounded-full flex items-center justify-center mb-6 text-2xl md:text-3xl shadow-sm">
                        📦
                      </div>
                      <p className="text-sm md:text-base font-medium">No matches in this category</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Content Sections - Only show on 'All' tab */}
        {activeTab === "all" && (
          <>
            {/* Dynamic Home Sections - Render sections created by admin (all tabs) */}
            {homeData.homeSections && homeData.homeSections.length > 0 && (
              <div className="space-y-10 md:space-y-16">
                {homeData.homeSections.map((section: any) => {
                  if (!section.data || section.data.length === 0) return null;

                  const columnCount = Number(section.columns) || 4;

                  if (
                    section.displayType === "products" &&
                    section.data &&
                    section.data.length > 0
                  ) {
                    const gridClass =
                      {
                        2: "grid-cols-2",
                        3: "grid-cols-3",
                        4: "grid-cols-4",
                        6: "grid-cols-6",
                        8: "grid-cols-8",
                      }[columnCount] || "grid-cols-4";

                    const isCompact = columnCount >= 4;
                    const gapClass = columnCount >= 4 ? "gap-3 md:gap-4" : "gap-4 md:gap-6";

                    return (
                      <div key={section.id} className="mt-8 mb-8 md:mt-12 md:mb-12 px-4 md:px-6 lg:px-8">
                        {section.title && (
                          <div className="flex items-center justify-between mb-10">
                            <h2 className="text-[18px] md:text-2xl font-bold text-[#0a193b] tracking-tight">
                              {section.title}
                            </h2>
                            <button
                              onClick={() => {
                                if (section.id) {
                                  navigate(`/collection/${section.id}?title=${encodeURIComponent(section.title)}`);
                                } else {
                                  navigate('/categories');
                                }
                              }}
                              className="section-see-all group flex items-center gap-1.5 transition-all hover:translate-x-1"
                            >
                              See all
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14m-7-7l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <div className={`flex overflow-x-auto pb-4 gap-5 md:gap-8 snap-x snap-mandatory scrollbar-hide md:grid md:pb-0 md:overflow-visible ${gridClass} ${gapClass}`}>
                          {section.data.map((product: any) => (
                            <div key={product.id || product._id} className="flex-shrink-0 w-[41%] sm:w-[32%] md:w-auto snap-start">
                              <ProductCard
                                product={product}
                                categoryStyle={true}
                                showBadge={true}
                                showPackBadge={false}
                                showStockInfo={false}
                                compact={isCompact}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <CategoryTileSection
                      key={section.id}
                      title={section.title}
                      tiles={section.data || []}
                      columns={columnCount as 2 | 3 | 4 | 6 | 8}
                      showProductCount={false}
                    />
                  );
                })}
              </div>
            )}

            {/* Elevated Bottom Content Area (Solid + Transition) */}
            <div className="relative mt-2">
              {/* Transition Gradient: Transparent to Cream */}
              <div
                className="h-10 w-full"
                style={{
                  background: 'linear-gradient(to bottom, transparent, #faf5f2)'
                }}
              />

              {/* Solid Content Block */}
              <div
                className="pt-6 pb-0 md:pb-12 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5 relative z-10 mb-[-64px] md:mb-12 md:mx-10 md:rounded-[48px]"
                style={{ backgroundColor: 'rgba(250, 245, 242, 0.94)' }}
              >
                {/* Shop by Store Section - only on 'all' tab */}
                <div className="px-5 mb-10 md:px-10">
                  {/* Modern Clean Header */}
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[18px] md:text-[22px] font-semibold text-[#0a193b] tracking-tight">
                      Shop by Store
                    </h2>
                    <button
                      onClick={() => navigate('/stores')}
                      className="section-see-all group flex items-center gap-1.5 transition-all hover:translate-x-1"
                    >
                      See all
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-7-7l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex overflow-x-auto pb-8 gap-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4 lg:grid-cols-6 md:pb-0 md:overflow-visible">
                    {(homeData.shops || []).map((tile: any) => {
                      const hasImages =
                        tile.image ||
                        (tile.productImages &&
                          tile.productImages.filter(Boolean).length > 0);

                      return (
                        <div
                          key={tile.id}
                          className="hover-lift tap-scale group flex flex-col cursor-pointer bg-white rounded-[20px] border border-black/[0.04] shadow-card transition-all duration-300 flex-shrink-0 w-[32%] sm:w-[24%] md:w-auto snap-start p-3"
                          onClick={() => {
                            const storeSlug =
                              tile.slug || tile.id.replace("-store", "");
                            navigate(`/store/${storeSlug}`);
                          }}
                        >
                          {/* Dominant Image Component - No Double Container */}
                          <div className="relative aspect-square rounded-[14px] overflow-hidden mb-3 flex items-center justify-center">
                            {hasImages ? (
                              <img
                                src={
                                  tile.image ||
                                  (tile.productImages ? tile.productImages[0] : "")
                                }
                                alt={tile.name}
                                className="w-[90%] h-[90%] object-contain drop-shadow-sm transform transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="text-4xl text-[#0a193b] font-bold opacity-20">
                                {tile.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          <div className="text-center">
                            <span className="block text-[13px] md:text-[14px] font-medium text-[#0a193b] capitalize line-clamp-1 leading-tight mb-1.5">
                              {tile.name.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Decorative Bottom Background (Inside solid block) */}
                <div
                  className="w-full h-[180px] md:hidden mt-8 mb-0 pointer-events-none relative z-0"
                  style={{
                    backgroundImage: 'url("/assets/background_bottom.png")',
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center bottom',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div >
  );
}
