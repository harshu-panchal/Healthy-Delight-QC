import { useState, useEffect, useMemo, useRef } from "react";
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

import { useThemeContext } from "../../context/ThemeContext";

export default function Home() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { activeCategory, setActiveCategory } = useThemeContext();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const activeTab = activeCategory; // mapping for existing code compatibility
  const setActiveTab = setActiveCategory;
  const contentRef = useRef<HTMLDivElement>(null);

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
    <div className="bg-white min-h-screen pb-20 md:pb-0" ref={contentRef}>
      {/* Hero Header with Gradient and Tabs */}
      <HomeHero activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Dynamic Banners Carousel */}
      {activeTab === "all" &&
        homeData.promoBanners &&
        homeData.promoBanners.length > 0 && (
          <HomeBannerCarousel banners={homeData.promoBanners} />
        )}

      {/* Quick Categories strip */}
      {/* Quick Categories strip - Only visible on 'All' tab */}
      {activeTab === "all" && homeData.categories && homeData.categories.length > 0 && (
        <div className="bg-neutral-50 px-4 pt-3 pb-3 md:px-6 md:pt-4 md:pb-4">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h2 className="text-base md:text-lg font-semibold text-neutral-900">
              Categories
            </h2>
            <button
              type="button"
              onClick={handleGoToCategories}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] md:text-xs font-semibold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-colors transition-transform">
              See all
              <span className="text-[13px]" aria-hidden="true">
                →
              </span>
            </button>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 pb-1">
            {homeData.categories.slice(0, 8).map((cat: any) => (
              <button
                key={cat._id || cat.id}
                type="button"
                onClick={() => navigate(`/category/${cat._id || cat.id}`)}
                className="bg-white rounded-2xl px-2.5 py-2 flex flex-col items-center shadow-sm border border-neutral-200 active:scale-95 transition-transform">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-emerald-50 flex items-center justify-center overflow-hidden mb-1">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xl" aria-hidden="true">
                      🥛
                    </span>
                  )}
                </div>
                <span className="text-[10px] md:text-[11px] font-medium text-neutral-900 text-center leading-tight line-clamp-2">
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
        className={`bg-neutral-50 -mt-2 pt-1 ${activeTab === "all" ? "space-y-5 md:space-y-8 md:pt-4" : ""}`}>
        {/* Category Specific View (Sidebar + Products) */}
        {activeTab !== "all" && (
          <div className="flex bg-white min-h-[70vh]">
            {/* Left Sidebar with Round Subcategories */}
            <div className="w-20 md:w-24 bg-neutral-50 border-r border-neutral-200 py-4 flex-shrink-0 flex flex-col items-center gap-6 overflow-y-auto scrollbar-hide max-h-[80vh] sticky top-36">
              {/* 'All' Option */}
              <button
                type="button"
                onClick={() => setSelectedSubcategory("all")}
                className="flex flex-col items-center gap-1 w-full px-1 group">
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl transition-all duration-200 shadow-sm border-2 ${selectedSubcategory === "all"
                    ? "border-emerald-600 bg-white scale-110 shadow-md"
                    : "border-transparent bg-white group-hover:scale-105"
                    }`}>
                  📦
                </div>
                <span
                  className={`text-[9px] md:text-[10px] text-center font-bold px-1 transition-colors leading-tight ${selectedSubcategory === "all" ? "text-emerald-700" : "text-neutral-500"
                    }`}>
                  All
                </span>
              </button>

              {/* Dynamic Subcategories */}
              {(() => {
                const visibleCategories = homeData.categories || [];

                return visibleCategories.map((cat: any) => {
                  const isSelected = String(cat._id || cat.id) === String(selectedSubcategory);
                  return (
                    <button
                      key={cat._id || cat.id}
                      type="button"
                      onClick={() => setSelectedSubcategory(cat._id || cat.id)}
                      className="flex flex-col items-center gap-1 w-full px-1 group">
                      <div
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 shadow-sm border-2 ${isSelected
                          ? "border-emerald-600 bg-white scale-110 shadow-md"
                          : "border-transparent bg-white group-hover:scale-105"
                          }`}>
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">{cat.icon || "🛒"}</span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] md:text-[10px] text-center font-bold px-1 transition-colors leading-tight line-clamp-2 ${isSelected ? "text-emerald-700" : "text-neutral-500"
                          }`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Right Side: Product Grid */}
            <div className="flex-1 px-3 py-4 md:px-6 md:py-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-xl font-bold text-neutral-900 capitalize px-1">
                  {selectedSubcategory === "all"
                    ? `${activeTab.replace("-", " ")} Products`
                    : (homeData.categories || []).find(
                      (c: any) => String(c._id || c.id) === String(selectedSubcategory)
                    )?.name || "Products"}
                </h2>
                <span className="text-[10px] md:text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                  {filteredProducts.length} Items
                </span>
              </div>

              {productsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-neutral-500 font-medium">Loading products...</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 md:gap-4">
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
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4 text-3xl">
                    📦
                  </div>
                  <p className="text-sm font-medium">No products found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Sections - Only show on 'All' tab */}
        {activeTab === "all" && (
          <>
            {/* Dynamic Home Sections - Render sections created by admin (all tabs) */}
            {homeData.homeSections && homeData.homeSections.length > 0 && (
              <div className="space-y-8">
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
                    const gapClass = columnCount >= 4 ? "gap-2" : "gap-3 md:gap-4";

                    return (
                      <div key={section.id} className="mt-8 mb-8 md:mt-10 md:mb-10 px-4 md:px-6 lg:px-8">
                        {section.title && (
                          <h2 className="text-xl md:text-2xl font-bold text-neutral-900 mb-4 md:mb-6 tracking-tight">
                            {section.title}
                          </h2>
                        )}
                        <div className={`flex overflow-x-auto pb-4 gap-3 md:gap-4 snap-x snap-mandatory scrollbar-hide md:grid md:pb-0 md:overflow-visible ${gridClass} ${gapClass}`}>
                          {section.data.map((product: any) => (
                            <div key={product.id || product._id} className="flex-shrink-0 w-[45%] sm:w-[35%] md:w-auto snap-start">
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

            {/* Shop by Store Section - only on 'all' tab */}
            <div className="mb-6 mt-6 md:mb-8 md:mt-8 px-4 md:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-2xl font-semibold text-neutral-900 tracking-tight">
                  Shop by Store
                </h2>
                <button
                  onClick={() => navigate('/stores')}
                  className="text-xs md:text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  See all stores
                </button>
              </div>
              <div className="">
                <div className="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4 lg:grid-cols-6 md:gap-6 md:pb-0 md:overflow-visible">
                  {(homeData.shops || []).map((tile: any) => {
                    const hasImages =
                      tile.image ||
                      (tile.productImages &&
                        tile.productImages.filter(Boolean).length > 0);

                    return (
                      <div
                        key={tile.id}
                        className="group flex flex-col cursor-pointer transition-transform active:scale-95 flex-shrink-0 w-[30%] sm:w-[24%] md:w-auto snap-start"
                        onClick={() => {
                          const storeSlug =
                            tile.slug || tile.id.replace("-store", "");
                          navigate(`/store/${storeSlug}`);
                        }}
                      >
                        <div className="relative aspect-[4/5] bg-gradient-to-b from-sky-100 to-sky-50 rounded-t-full overflow-hidden border-x border-t border-white shadow-sm group-hover:shadow-md transition-shadow">
                          <div className="absolute inset-x-0 top-1/2 bottom-0 bg-[#e6d5b8] opacity-60"></div>
                          <div className="absolute bottom-4 left-0 right-0 h-4 bg-amber-200/40 blur-sm"></div>

                          <div className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                            {hasImages ? (
                              <img
                                src={
                                  tile.image ||
                                  (tile.productImages ? tile.productImages[0] : "")
                                }
                                alt={tile.name}
                                className="w-[85%] h-[85%] object-contain drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="text-4xl text-sky-300 font-bold opacity-50">
                                {tile.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 p-1">
                            <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 py-2 md:py-2.5 px-2 rounded-xl shadow-lg border border-amber-200/50">
                              <span className="block text-[9px] md:text-xs font-black text-amber-900 text-center uppercase tracking-wider line-clamp-1 leading-none">
                                {tile.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div >
  );
}
