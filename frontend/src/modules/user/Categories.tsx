import { useEffect, useState } from "react";
import {
  getCategories,
  Category as CustomerCategory,
} from "../../services/api/customerProductService";
import { useNavigate } from "react-router-dom";

export default function Categories() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const navigate = useNavigate();

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

  if (error && !categories.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center bg-white">
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
    <div className="pb-4 md:pb-8 bg-white min-h-screen">
      {/* Page Header */}
      <div className="px-4 py-4 md:px-6 md:py-6 bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
          Categories
        </h1>
      </div>

      <div className="bg-neutral-50 pt-3 pb-6">
        {allCategories.length > 0 ? (
          <div className="px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {allCategories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className="group relative bg-gradient-to-b from-emerald-50/70 via-white to-amber-50/60 rounded-2xl shadow-sm border border-emerald-100/80 transition-all active:scale-[0.97] overflow-hidden">
                  {/* Soft glassy highlight */}
                  <div className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-white/70 blur-md opacity-60" />

                  {/* Image / icon badge */}
                  <div className="relative w-full pt-3 pb-1 flex items-center justify-center">
                    <div className="relative w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-white shadow-md ring-2 ring-emerald-100/90 overflow-hidden flex items-center justify-center transition-transform">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-3xl md:text-4xl" aria-hidden="true">
                          🥛
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom label area */}
                  <div className="px-2 pt-1 pb-2 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] md:text-[11px] font-semibold text-slate-900 text-center leading-tight line-clamp-2">
                      {cat.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 text-neutral-500 px-4">
            <p className="text-lg md:text-xl mb-2">No categories found</p>
            <p className="text-sm md:text-base">
              Please create categories from the admin panel
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

