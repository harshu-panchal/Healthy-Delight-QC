import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
    <div className="pb-4 md:pb-8 bg-transparent min-h-screen">
      {/* Page Header - Ribbon Style */}
      <div className="px-4 py-8 md:px-6 md:py-10 bg-transparent flex items-center justify-start -ml-4 md:-ml-6 lg:-ml-8 overflow-visible">
        <div className="relative flex items-center">
          {/* Subtle Ribbon Tail Wrap */}
          <div className="absolute -left-0.5 top-full -mt-1.5 w-3 h-3 bg-[#8A6642] origin-top-right -rotate-45 -z-10 opacity-60"></div>

          {/* Premium Glass-Brown Ribbon Body */}
          <div className="bg-gradient-to-r from-[#8A6642] to-[#A88A68] pl-5 md:pl-7 lg:pl-10 pr-10 py-2 md:py-3 rounded-r-lg shadow-lg relative flex items-center border-y border-white/10">
            <h1 className="text-xs md:text-sm font-bold text-white uppercase tracking-[0.25em] drop-shadow-sm">
              All Categories
            </h1>

            {/* Elegant Minimal Notch */}
            <div className="absolute -right-3 top-0 bottom-0 w-6 bg-[#A88A68]" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-transparent pb-6">
        {allCategories.length > 0 ? (
          <div className="px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5 lg:gap-6">
              {allCategories.map((cat, index) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className="group flex flex-col items-center relative active:scale-95 transition-transform duration-300 pb-2">
                  {/* Completely Static Circular Icon */}
                  <div
                    className="w-20 h-20 md:w-24 md:h-24 aspect-square rounded-full bg-gradient-to-br from-[#E6D5C3] to-[#DFCBB7] flex items-center justify-center shadow-md border-[1.5px] border-[#8A6642] group-hover:border-[#6B4E31] relative overflow-hidden flex-shrink-0 mb-1 z-0">

                    {/* Inner Glassy Highlight */}
                    <div className="w-[82%] h-[82%] rounded-full bg-white/50 backdrop-blur-[1px] flex items-center justify-center overflow-hidden shadow-inner transform group-hover:scale-110 transition-transform duration-500">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-[85%] h-[85%] object-contain drop-shadow-sm"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-2xl" aria-hidden="true">🥛</span>
                      )}
                    </div>
                  </div>

                  {/* Ribbon Flag Label - Overlapping more of the bottom circle */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[90%] z-10 pointer-events-none">
                    <div className="relative group-hover:scale-105 transition-transform duration-300">
                      {/* Ribbon Tail (Left Notch) */}
                      <div className="absolute top-1 -left-1.5 w-3 h-3 bg-[#6B4E31] -z-10 origin-top-right -rotate-45" />
                      {/* Ribbon Tail (Right Notch) */}
                      <div className="absolute top-1 -right-1.5 w-3 h-3 bg-[#6B4E31] -z-10 origin-top-left rotate-45" />

                      {/* Main Ribbon Body with Gradient */}
                      <div className="bg-gradient-to-r from-[#8A6642] via-[#A68662] to-[#8A6642] px-2 py-0.5 rounded shadow-sm border border-white/10">
                        <span className="block text-[9px] md:text-[11px] font-semibold text-white text-center line-clamp-1 leading-tight drop-shadow-sm">
                          {cat.name}
                        </span>
                      </div>
                    </div>
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

