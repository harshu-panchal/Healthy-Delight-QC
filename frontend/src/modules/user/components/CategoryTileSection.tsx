import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

interface CategoryTile {
  id: string;
  name: string;
  productImages?: (string | undefined)[];
  image?: string; // Support single image property
  productCount?: number;
  categoryId?: string;
  subcategoryId?: string;
  productId?: string;
  sellerId?: string;
  bgColor?: string;
  slug?: string;
  type?: "subcategory" | "product" | "category";
}

interface CategoryTileSectionProps {
  title: string;
  tiles: CategoryTile[];
  columns?: 2 | 3 | 4 | 6 | 8; // Support all column options
  showProductCount?: boolean; // Show product count only for bestsellers
}

export default function CategoryTileSection({
  title,
  tiles,
  columns = 4,
  showProductCount = false,
}: CategoryTileSectionProps) {
  const navigate = useNavigate();

  const handleTileClick = (tile: CategoryTile) => {
    if (tile.subcategoryId || tile.type === "subcategory") {
      // Navigate to subcategory page or category with subcategory filter
      if (tile.categoryId) {
        navigate(
          `/category/${tile.categoryId}?subcategory=${tile.subcategoryId || tile.id
          }`
        );
      } else if (tile.slug) {
        navigate(`/category/${tile.slug}`);
      } else {
        navigate(`/category/subcategory/${tile.subcategoryId || tile.id}`);
      }
      return;
    }
    if (tile.categoryId) {
      navigate(`/category/${tile.categoryId}`);
      return;
    }
    if (tile.productId) {
      navigate(`/product/${tile.productId}`);
      return;
    }
    if ((tile as any).sellerId) {
      // Navigate to seller's products page or category
      navigate(`/seller/${(tile as any).sellerId}`);
      return;
    }
    // Otherwise just log for now
    console.log("Clicked tile", tile.id);
  };

  // Dynamic grid classes based on column count
  const getGridCols = () => {
    switch (columns) {
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 4:
        return "grid-cols-4";
      case 6:
        return "grid-cols-6";
      case 8:
        return "grid-cols-8";
      default:
        return "grid-cols-4";
    }
  };

  const gridCols = getGridCols();
  const gapClass = columns >= 6 ? "gap-1.5 md:gap-2.5" : "gap-2.5 md:gap-4";

  return (
    <div className="mb-8 mt-6 overflow-visible px-4 md:px-6 lg:px-8">
      {/* Modern Clean Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[17px] md:text-xl font-semibold text-[#0a193b] tracking-tight">
          {title}
        </h2>
        {/* Optional 'See all' for shared sections if link exists in parent, but here we keep it clean */}
      </div>

      <div className="">
        <div className={`flex overflow-x-auto pb-6 gap-4 snap-x snap-mandatory scrollbar-hide md:grid md:pb-0 md:overflow-visible ${gridCols} ${gapClass} auto-rows-fr`}>
          {tiles.map((tile) => {
            const images =
              tile.productImages || (tile.image ? [tile.image] : []);
            const hasImages = images.filter(Boolean).length > 0;

            return (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col flex-shrink-0 w-[30%] sm:w-[25%] md:w-auto snap-start group">
                <Link
                  to={
                    tile.subcategoryId || tile.type === "subcategory"
                      ? tile.categoryId
                        ? `/category/${tile.categoryId}?subcategory=${tile.subcategoryId || tile.id
                        }`
                        : tile.slug
                          ? `/category/${tile.slug}`
                          : `/category/subcategory/${tile.subcategoryId || tile.id
                          }`
                      : tile.productId
                        ? `/product/${tile.productId}`
                        : tile.type === "category"
                          ? tile.slug
                            ? `/category/${tile.slug}`
                            : tile.categoryId
                              ? `/category/${tile.categoryId}`
                              : "#"
                          : tile.categoryId
                            ? `/category/${tile.categoryId}`
                            : (tile as any).sellerId
                              ? `/seller/${(tile as any).sellerId}`
                              : "#"
                  }
                  onClick={(e) => {
                    if (
                      !tile.categoryId &&
                      !tile.productId &&
                      !tile.subcategoryId &&
                      !(tile as any).sellerId
                    ) {
                      e.preventDefault();
                      handleTileClick(tile);
                    }
                  }}
                  className={`block bg-white rounded-[20px] border border-black/[0.04] shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.1)] transition-all duration-300 h-full p-2.5 ${showProductCount ? "md:p-4" : "p-2.5"
                    }`}>
                  
                  {/* Image Container - Circular Highlight */}
                  <div
                    className={`w-full rounded-[16px] overflow-hidden flex items-center justify-center transition-colors group-hover:bg-[#f3eee5] ${showProductCount ? "h-28 md:h-40 mb-2.5" : "aspect-square mb-2.5"
                      } ${tile.bgColor || "bg-[#f8f6f2]"}`}>
                    {hasImages ? (
                      showProductCount ? (
                        // Bestsellers: 2x2 grid
                        <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
                          {images.slice(0, 4).map((img, idx) =>
                            img ? (
                              <img
                                key={idx}
                                src={img}
                                alt=""
                                className="w-full h-full object-contain bg-white rounded-lg shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                key={idx}
                                className="w-full h-full bg-white/50 rounded-lg flex items-center justify-center text-[10px] text-neutral-400">
                                {idx + 1}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        // Other sections: Single image
                        <img
                          src={images[0]}
                          alt={tile.name}
                          className="w-[85%] h-[85%] object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-3xl font-bold text-[#0a193b]/20">${tile.name.charAt(0)}</div>`;
                            }
                          }}
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#0a193b]/20">
                        {tile.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Product count (only for bestsellers) */}
                  {showProductCount && tile.productCount && (
                    <div className="mb-2 flex justify-center">
                      <span className="inline-block bg-[#c5a059]/10 text-[#c5a059] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        +{tile.productCount} Items
                      </span>
                    </div>
                  )}

                  {/* Tile name inside for bestsellers */}
                  {showProductCount && (
                    <div className="text-[12px] md:text-[14px] font-bold text-[#0f172a] line-clamp-2 leading-tight text-center w-full block group-hover:text-[#0a193b] transition-colors">
                      {tile.name}
                    </div>
                  )}
                </Link>

                {/* Category name outside card for non-bestsellers */}
                {!showProductCount && (
                  <div className="mt-2 text-center">
                    <span className="text-[13px] md:text-sm font-semibold text-[#0f172a] group-hover:text-[#0a193b] transition-colors line-clamp-2 leading-tight">
                      {tile.name}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
