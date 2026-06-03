import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import ProductCard from "./components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProducts,
  getCategoryById,
  Category as ApiCategory,
} from "../../services/api/customerProductService";
import { useLocation as useLocationContext } from "../../hooks/useLocation";
import { useAuth } from "../../context/AuthContext";
import { calculateProductPrice } from "../../utils/priceUtils";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { location: userLocation } = useLocationContext();
  const { user } = useAuth();

  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ApiCategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("Price");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Category Details
  useEffect(() => {
    const fetchCategoryDetails = async () => {
      setCategoryLoading(true);
      setError(null);
      try {
        const response = await getCategoryById(id!);
        if (response.success && response.data) {
          const {
            category: cat,
            subcategories: subs,
            currentSubcategory,
          } = response.data;

          setCategory(cat);
          setSubcategories([
            {
              _id: "all",
              id: "all",
              name: "All",
              icon: "📦",
              isActive: true,
            } as any,
            ...(subs || []),
          ]);

          // Check URL query params first, then API response
          const subcategoryFromUrl = searchParams.get("subcategory");
          if (subcategoryFromUrl) {
            setSelectedSubcategory(subcategoryFromUrl);
          } else if (currentSubcategory) {
            setSelectedSubcategory(
              currentSubcategory._id || currentSubcategory.id
            );
          }
        } else {
          setError("Category not found or failed to load details.");
        }
      } catch (error) {
        console.error("Error fetching category details:", error);
        setError("Failed to load category information.");
      } finally {
        setCategoryLoading(false);
      }
    };

    if (id) {
      fetchCategoryDetails();
    }
  }, [id, searchParams]);

  // Fetch Products when category or subcategory changes
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // If the ID in the URL is actually for a subcategory, we should use the parent category ID
        // which we fetch in the other useEffect and store in 'category'.
        // However, for fetching products, the backend getProducts handles 'category' (parent)
        // and 'subcategory' separately.

        const params: any = { category: category?._id || id };
        if (selectedSubcategory !== "all") {
          params.subcategory = selectedSubcategory;
        }
        // Include user location for seller service radius filtering
        if (userLocation?.latitude && userLocation?.longitude) {
          params.latitude = userLocation.latitude;
          params.longitude = userLocation.longitude;
        }

        const response = await getProducts(params);
        if (response.success) {
          // Ensure products have default tags/name array for filtering logic if missing
          const safeProducts = response.data.map((p: any) => {
            const name = p.name || p.productName || "";
            return {
              ...p,
              tags: Array.isArray(p.tags) ? p.tags : [],
              nameParts: name ? name.toLowerCase().split(" ") : [],
            };
          });
          setProducts(safeProducts);
        } else {
          setError("Failed to fetch products for this category.");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Network error while loading products.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProducts();
    }
  }, [id, selectedSubcategory, category?._id, userLocation]);

  // Client-side filtering of products
  const categoryProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. In Stock Filter
      if (inStockOnly && product.isAvailable === false) {
        return false;
      }

      // 2. Price Filter
      const { displayPrice } = calculateProductPrice(product, undefined, user?.customerType);
      if (priceFilter === "under100" && displayPrice >= 100) return false;
      if (priceFilter === "100to200" && (displayPrice < 100 || displayPrice > 200)) return false;
      if (priceFilter === "200to500" && (displayPrice < 200 || displayPrice > 500)) return false;
      if (priceFilter === "above500" && displayPrice <= 500) return false;

      return true;
    });
  }, [products, priceFilter, inStockOnly, user?.customerType]);

  const activeFiltersCount = (priceFilter !== "all" ? 1 : 0) + (inStockOnly ? 1 : 0);

  if ((categoryLoading || loading) && !products.length && !category) {
    return null; // Let global IconLoader handle it
  }

  if (error && !products.length && !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center bg-white">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  if (!category && !categoryLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="w-24 h-24 bg-[#0a193b]/5 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <span className="text-4xl text-[#0a193b]">📦</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0a193b] mb-4 tracking-tight">
          Category not found
        </h1>
        <p className="text-neutral-500 md:text-lg max-w-sm mx-auto mb-10 leading-relaxed">
          The collection you're looking for doesn't exist or may have been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3.5 bg-[#0a193b] text-white rounded-2xl font-bold hover:bg-[#0a193b]/90 transition-all shadow-lg active:scale-95"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleClearFilters = () => {
    setPriceFilter("all");
    setInStockOnly(false);
  };

  const handleApplyFilters = () => {
    setIsFiltersOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex flex-col">
      {/* Premium Sticky Header Section */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-black/[0.04]">
        {/* Top Bar: Back & Title */}
        <div className="flex items-center gap-4 px-4 py-4 md:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-neutral-800 bg-white border border-black/[0.04] shadow-sm hover:bg-neutral-50 rounded-full transition-all active:scale-95"
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-[#0a193b] tracking-tight">
              {category?.name || "Category"}
            </h1>
            <span className="text-[11px] md:text-xs font-medium text-[#c5a059] uppercase tracking-widest mt-0.5">
              Fresh & organic selection
            </span>
          </div>
        </div>

        {/* Sticky Subcategory Chips */}
        <div className="px-4 md:px-6 lg:px-8 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2">
            {subcategories.map((subcat) => {
              const subId = subcat.id || subcat._id;
              const isSelected = selectedSubcategory === subId;
              return (
                <button
                  key={subId}
                  onClick={() => setSelectedSubcategory(subId)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 flex-shrink-0 whitespace-nowrap border ${
                    isSelected
                      ? "bg-[#0a193b] border-[#0a193b] text-white shadow-md shadow-[#0a193b]/20"
                      : "bg-white border-black/[0.06] text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <span className="text-lg leading-none">
                    {subcat.image ? (
                      <img src={subcat.image} alt="" className="w-5 h-5 object-cover rounded-full" />
                    ) : (
                      subcat.icon || "📦"
                    )}
                  </span>
                  <span>{subcat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Filter Bar */}
        <div className="px-4 md:px-6 lg:px-8 py-2 border-t border-black/[0.02] flex items-center">
          <button
            onClick={() => setIsFiltersOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-black/[0.04] rounded-full shadow-sm hover:bg-neutral-50 transition-all text-sm font-bold text-[#0a193b]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* Product Area: Clean Cream Surface */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-6">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8">
          {categoryProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id || product._id}
                  product={product}
                  showStockInfo={false}
                  showBadge={true}
                  showOptionsText={true}
                  categoryStyle={true}
                  storeStyle={true}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="text-5xl mb-6 opacity-20">📦</div>
              <p className="text-neutral-500 font-medium md:text-lg">
                No products found in this category.
              </p>
              <button 
                onClick={() => navigate('/')}
                className="mt-4 text-[#c5a059] font-bold hover:underline"
              >
                Explore other categories
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Modal */}
      <AnimatePresence>
        {isFiltersOpen && (
          <>
            {/* Hide footer when modal is open */}
            <style>{`
              nav[class*="fixed bottom-0"] {
                display: none !important;
              }
            `}</style>
            <div className="fixed inset-0 z-[100]">
              {/* Backdrop - Semi-transparent overlay with brand color blend */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-[#0a193b]/40 backdrop-blur-sm"
                onClick={() => setIsFiltersOpen(false)}
              />

              {/* Modal - Slides up from bottom, compact size matching brand theme */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-[#0a193b] rounded-t-[2.5rem] shadow-2xl max-h-[60vh] flex flex-col overflow-hidden border-t border-white/10">
                
                {/* Touch drag indicator pill */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

                {/* Header */}
                <div className="px-6 py-4 bg-[#0a193b] border-b border-white/5">
                  <h2 className="text-base font-black text-white tracking-tight">
                    Filters
                  </h2>
                </div>

                {/* Content Area */}
                <div className="flex flex-1 overflow-hidden min-h-0 bg-[#08122b]">
                  {/* Left Column - Filter Categories (w-36 for safe text padding) */}
                  <div className="w-36 border-r border-white/5 flex-shrink-0 bg-[#060e22]">
                    <button
                      onClick={() => setSelectedFilterCategory("Price")}
                      className={`w-full px-4 py-5 text-left text-xs font-black tracking-wider uppercase transition-all duration-150 border-b border-white/[0.02] ${selectedFilterCategory === "Price"
                        ? "bg-[#0a193b] text-[#c5a059] border-l-4 border-[#c5a059]"
                        : "text-white/60 hover:bg-[#0a193b]/50 hover:text-white"
                        }`}>
                      Price
                    </button>
                    <button
                      onClick={() => setSelectedFilterCategory("Availability")}
                      className={`w-full px-4 py-5 text-left text-xs font-black tracking-wider uppercase transition-all duration-150 border-b border-white/[0.02] ${selectedFilterCategory === "Availability"
                        ? "bg-[#0a193b] text-[#c5a059] border-l-4 border-[#c5a059]"
                        : "text-white/60 hover:bg-[#0a193b]/50 hover:text-white"
                        }`}>
                      Availability
                    </button>
                  </div>

                  {/* Right Column - Filter Options */}
                  <div className="flex-1 overflow-y-auto bg-[#0a193b]">
                    {selectedFilterCategory === "Price" && (
                      <div className="p-4 space-y-2">
                        {[
                          { id: "all", label: "All Prices" },
                          { id: "under100", label: "Under ₹100" },
                          { id: "100to200", label: "₹100 - ₹200" },
                          { id: "200to500", label: "₹200 - ₹500" },
                          { id: "above500", label: "Above ₹500" },
                        ].map((option) => {
                          const isChecked = priceFilter === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => setPriceFilter(option.id)}
                              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/[0.04] rounded-xl transition-colors">
                              <span className="flex-1 text-left text-sm font-semibold text-white/90">
                                {option.label}
                              </span>
                              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isChecked ? "border-[#c5a059] bg-transparent" : "border-white/20 bg-transparent"
                                }`}>
                                  {isChecked && <div className="w-2.5 h-2.5 rounded-full bg-[#c5a059]" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedFilterCategory === "Availability" && (
                      <div className="p-4">
                        <button
                          onClick={() => setInStockOnly(!inStockOnly)}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/[0.04] rounded-xl transition-colors">
                          <span className="flex-1 text-left text-sm font-semibold text-white/90">
                            In Stock Only
                          </span>
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {inStockOnly ? (
                              <div className="w-5 h-5 border-2 border-[#c5a059] bg-[#c5a059] rounded-md flex items-center justify-center">
                                <svg
                                  className="w-3.5 h-3.5 text-[#0a193b]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={4}
                                  viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-5 h-5 border-2 border-white/20 rounded-md bg-transparent"></div>
                            )}
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-white/5 flex gap-3 bg-[#08122b]">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2.5 border border-[#c5a059]/30 text-[#c5a059] hover:bg-[#c5a059]/10 rounded-xl font-bold text-sm transition-all duration-200 bg-transparent active:scale-95">
                    Clear Filter
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 px-4 py-2.5 bg-[#c5a059] hover:bg-[#b08e4f] text-[#0a193b] rounded-xl font-bold text-sm transition-all duration-200 shadow-md shadow-[#c5a059]/10 active:scale-95">
                    Apply {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
