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

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { location: userLocation } = useLocationContext();

  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ApiCategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("Type");
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

  // Client-side filtering removed in favor of backend subcategory filtering
  const categoryProducts = products;

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

  // Extract filter options from products
  const getFilterOptions = () => {
    // Current category ID from resolved category or from URL params
    const currentId = category?._id || id;

    // Filter products that belong to this category or subcategory
    const categoryProducts = products.filter((p) => {
      // Check for direct categoryId match, or match on populated category object
      // Using String() to ensure safe comparison between potential ObjectId and String
      const productCatId = String(p.categoryId || (p.category && (p.category._id || p.category.id)) || "");
      return productCatId === String(currentId);
    });

    const filterMap = new Map<string, number>();

    categoryProducts.forEach((product) => {
      // Extract main ingredient/type from product name
      // Use fallback to productName if name is missing
      const rawName = product.name || (product as any).productName || "";
      if (!rawName) return;

      const name = rawName.toLowerCase();
      // Remove common prefixes like "fresh", "organic", etc.
      const cleanName = name
        .replace(/^(fresh|organic|premium|best|new)\s+/i, "")
        .trim();

      const commonTypes = [
        { keywords: ["tomato", "tomatoes"], display: "Tomato" },
        { keywords: ["potato", "potatoes"], display: "Potato" },
        { keywords: ["chilli", "chili", "chilies"], display: "Chilli" },
        { keywords: ["spinach"], display: "Spinach" },
        { keywords: ["brinjal", "eggplant"], display: "Brinjal" },
        { keywords: ["onion", "onions"], display: "Onion" },
        { keywords: ["peanut", "peanuts"], display: "Peanuts" },
        { keywords: ["lemon", "lemons"], display: "Lemon" },
        { keywords: ["mushroom", "mushrooms"], display: "Mushroom" },
        {
          keywords: ["capsicum", "bell pepper", "pepper"],
          display: "Capsicum",
        },
        { keywords: ["ginger"], display: "Ginger" },
        { keywords: ["carrot", "carrots"], display: "Carrot" },
        { keywords: ["fenugreek", "methi"], display: "Fenugreek" },
        { keywords: ["broccoli"], display: "Broccoli" },
        { keywords: ["cucumber", "cucumbers"], display: "Cucumber" },
        { keywords: ["cabbage"], display: "Cabbage" },
        { keywords: ["cauliflower"], display: "Cauliflower" },
        { keywords: ["ladyfinger", "okra"], display: "Ladyfinger" },
        { keywords: ["beans"], display: "Beans" },
        { keywords: ["peas"], display: "Peas" },
        { keywords: ["garlic"], display: "Garlic" },
        { keywords: ["apple", "apples"], display: "Apple" },
        { keywords: ["banana", "bananas"], display: "Banana" },
        { keywords: ["orange", "oranges"], display: "Orange" },
        { keywords: ["mango", "mangoes"], display: "Mango" },
      ];

      for (const type of commonTypes) {
        if (type.keywords.some((keyword) => cleanName.includes(keyword))) {
          filterMap.set(type.display, (filterMap.get(type.display) || 0) + 1);
          break;
        }
      }
    });

    return Array.from(filterMap.entries())
      .map(([name, count]) => ({ name, count, icon: getIconForFilter(name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getIconForFilter = (name: string): string => {
    const iconMap: Record<string, string> = {
      Tomato: "🍅",
      Potato: "🥔",
      Chilli: "🌶️",
      Spinach: "🥬",
      Brinjal: "🍆",
      Onion: "🧅",
      Peanuts: "🥜",
      Lemon: "🍋",
      Mushroom: "🍄",
      Capsicum: "🫑",
      Ginger: "🫚",
      Carrot: "🥕",
      Fenugreek: "🌿",
      Broccoli: "🥦",
      Cucumber: "🥒",
      Cabbage: "🥬",
      Cauliflower: "🥦",
      Apple: "🍎",
      Banana: "🍌",
      Orange: "🍊",
      Mango: "🥭",
    };
    return iconMap[name] || "🥬";
  };

  const filterOptions = getFilterOptions();
  const filteredOptions = filterOptions.filter((option) =>
    option.name.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  const handleFilterToggle = (filterName: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterName)
        ? prev.filter((f) => f !== filterName)
        : [...prev, filterName]
    );
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
  };

  const handleApplyFilters = () => {
    // Apply filters logic here
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

        {/* Sticky Filter & Sort Bar */}
        <div className="px-4 md:px-6 lg:px-8 py-2 border-t border-black/[0.02] flex items-center gap-3">
          <button
            onClick={() => setIsFiltersOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-black/[0.04] rounded-full shadow-sm hover:bg-neutral-50 transition-all text-sm font-bold text-[#0a193b]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            </svg>
            Filters
          </button>
          
          <button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-black/[0.04] rounded-full shadow-sm hover:bg-neutral-50 transition-all text-sm font-bold text-[#0a193b]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 16 4 4 4-4" /><path d="M7 20V4" />
              <path d="m21 8-4-4-4 4" /><path d="M17 4v16" />
            </svg>
            Sort
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
              {/* Backdrop - Semi-transparent overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/40"
                onClick={() => setIsFiltersOpen(false)}
              />

              {/* Modal - Slides up from bottom, compact size matching image */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-neutral-200">
                  <h2 className="text-base font-bold text-neutral-900">
                    Filters
                  </h2>
                </div>

                {/* Search Bar */}
                <div className="px-5 py-3 border-b border-neutral-200">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search across filters..."
                      value={filterSearchQuery}
                      onChange={(e) => setFilterSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-neutral-700 placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Left Column - Filter Categories */}
                  <div className="w-24 border-r border-neutral-200 flex-shrink-0 bg-neutral-50">
                    <button
                      onClick={() => setSelectedFilterCategory("Type")}
                      className={`w-full px-3 py-3 text-left text-sm font-medium transition-colors ${selectedFilterCategory === "Type"
                        ? "bg-green-50 text-green-700"
                        : "text-neutral-600 hover:bg-neutral-100"
                        }`}>
                      Type
                    </button>
                    <button
                      onClick={() => setSelectedFilterCategory("Properties")}
                      className={`w-full px-3 py-3 text-left text-sm font-medium transition-colors ${selectedFilterCategory === "Properties"
                        ? "bg-green-50 text-green-700"
                        : "text-neutral-600 hover:bg-neutral-100"
                        }`}>
                      Properties
                    </button>
                  </div>

                  {/* Right Column - Filter Options */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4">
                      {filteredOptions.map((option) => {
                        const isChecked = selectedFilters.includes(option.name);
                        return (
                          <button
                            key={option.name}
                            onClick={() => handleFilterToggle(option.name)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 rounded-lg transition-colors">
                            <span className="text-xl flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              {option.icon}
                            </span>
                            <span className="flex-1 text-left text-sm font-medium text-neutral-700">
                              {option.name}
                            </span>
                            <span className="text-sm text-neutral-500">
                              ({option.count})
                            </span>
                            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                              {isChecked ? (
                                <div className="w-5 h-5 border-2 border-green-600 bg-green-600 rounded-sm flex items-center justify-center">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-neutral-300 rounded-sm bg-white"></div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-4 border-t border-neutral-200 flex gap-3 bg-white">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2.5 border border-green-600 text-green-600 rounded-lg font-medium text-sm hover:bg-green-50 transition-colors bg-white">
                    Clear Filter
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${selectedFilters.length > 0
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      }`}
                    disabled={selectedFilters.length === 0}>
                    Apply
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
