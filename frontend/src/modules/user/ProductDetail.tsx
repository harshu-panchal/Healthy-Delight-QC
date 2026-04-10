import {
  useParams,
  useNavigate,
  useLocation as useRouterLocation,
} from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { products } from '../../data/products'; // REMOVED
// import { categories } from '../../data/categories'; // REMOVED
import { useCart } from "../../context/CartContext";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import { getProductById } from "../../services/api/customerProductService";
import WishlistButton from "../../components/WishlistButton";
import { calculateProductPrice } from "../../utils/priceUtils";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { cart, addToCart, updateQuantity } = useCart();
  const { location } = useLocation();
  const { startLoading, stopLoading } = useLoading();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [isProductDetailsExpanded, setIsProductDetailsExpanded] =
    useState(false);
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailableAtLocation, setIsAvailableAtLocation] =
    useState<boolean>(true);

  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      startLoading();
      try {
        // Check if navigation came from store page
        const fromStore = (routerLocation.state as any)?.fromStore === true;

        // Fetch product details with location
        const response = await getProductById(
          id,
          location?.latitude,
          location?.longitude
        );
        if (response.success && response.data) {
          const productData = response.data as any;

          // Set location availability flag
          setIsAvailableAtLocation(productData.isAvailableAtLocation !== false);

          // Get all images (main + gallery)
          const allImages = [
            productData.mainImage || productData.imageUrl || "",
            ...(productData.galleryImages ||
              productData.galleryImageUrls ||
              []),
          ].filter(Boolean);

          setProduct({
            ...productData,
            // Ensure all critical fields have safe defaults
            id: productData._id || productData.id,
            name: productData.productName || productData.name || "Product",
            imageUrl: productData.mainImage || productData.imageUrl || "",
            allImages: allImages,
            price: productData.price || 0,
            mrp: productData.mrp || productData.price || 0,
            pack:
              productData.variations?.[0]?.title ||
              productData.variations?.[0]?.value ||
              productData.smallDescription ||
              "Standard",
          });

          // Reset selected variant and image when product changes
          setSelectedVariantIndex(0);
          setSelectedImageIndex(0);
          setSimilarProducts(response.data.similarProducts || []);

        } else {
          setProduct(null);
          setError(response.message || "Product not found");
        }
      } catch (error: any) {
        console.error("Failed to fetch product", error);
        setProduct(null);
        setError(
          error.message || "Something went wrong while fetching product details"
        );
      } finally {
        setLoading(false);
        stopLoading();
      }
    };


    fetchProduct();
  }, [id, location?.latitude, location?.longitude]);

  // Get selected variant
  const selectedVariant = product?.variations?.[selectedVariantIndex] || null;
  const {
    displayPrice: variantPrice,
    mrp: variantMrp,
    discount,
    hasDiscount,
  } = calculateProductPrice(product, selectedVariantIndex);

  const variantStock =
    selectedVariant?.stock !== undefined
      ? selectedVariant.stock
      : product?.stock || 0;
  const variantTitle =
    selectedVariant?.title ||
    selectedVariant?.value ||
    product?.pack ||
    "Standard";
  const isVariantAvailable =
    selectedVariant?.status !== "Sold out" &&
    (variantStock > 0 || variantStock === 0); // 0 means unlimited

  // Get all images for gallery
  const allImages =
    product?.allImages || [product?.imageUrl || ""].filter(Boolean);
  const currentImage = allImages[selectedImageIndex] || product?.imageUrl || "";

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  // Handle touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end - perform swipe
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedImageIndex < allImages.length - 1) {
      setIsTransitioning(true);
      setSelectedImageIndex(selectedImageIndex + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }

    if (isRightSwipe && selectedImageIndex > 0) {
      setIsTransitioning(true);
      setSelectedImageIndex(selectedImageIndex - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  // Get quantity in cart - check by product ID and variant if available
  const cartItem = product
    ? cart.items.find((item) => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      const productId = product.id || product._id;

      if (itemProductId !== productId) return false;

      // If product has variations, we need to match the selected one
      if (product.variations && product.variations.length > 0) {
        if (selectedVariant) {
          const itemVariantId =
            (item.product as any).variantId ||
            (item.product as any).selectedVariant?._id;
          const itemVariantTitle =
            (item.product as any).variantTitle || (item.product as any).pack;

          return (
            itemVariantId === selectedVariant._id ||
            itemVariantTitle === variantTitle ||
            (itemVariantId && itemVariantId === variantTitle)
          );
        }
        // If product has variations but none selected (shouldn't happen), don't match
        return false;
      }

      // If product has NO variations, any item with this product ID in cart is a match
      return true;
    })
    : null;
  const inCartQty = cartItem?.quantity || 0;

  if (loading && !product) {
    return null; // Let the global IconLoader handle this
  }

  if (error && !product) {
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

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 md:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
            Product not found
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Get category info - safe access
  const category =
    product.category && product.category.name
      ? { name: product.category.name, id: product.category._id }
      : null;

  const handleAddToCart = () => {
    if (!isAvailableAtLocation) {
      // Show alert if trying to add item outside delivery area
      alert("This product is not available for delivery at your location.");
      return;
    }
    if (!isVariantAvailable && variantStock !== 0) {
      alert("This variant is currently out of stock.");
      return;
    }
    // Create product with selected variant info
    const productWithVariant = {
      ...product,
      price: variantPrice,
      mrp: variantMrp,
      pack: variantTitle,
      selectedVariant: selectedVariant,
      variantId: selectedVariant?._id,
      variantTitle: variantTitle,
    };
    addToCart(productWithVariant, addButtonRef.current);
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header with back button and action icons */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-4">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-neutral-50 transition-all border border-neutral-100"
            aria-label="Go back">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Action icons */}
          <div className="flex items-center gap-3">
            {product?.id && (
              <WishlistButton
                productId={product.id}
                size="md"
                className="bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-neutral-100"
              />
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="pt-0">
        {/* Product Image Gallery Hero */}
        <div className="relative w-full bg-white pt-20 pb-12 px-6 flex flex-col items-center">
          <div
            className="w-full max-w-[400px] aspect-square relative bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-neutral-50 overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              touchAction: allImages.length > 1 ? "pan-x" : "pan-y pinch-zoom",
            }}>
            {/* Mobile swipe carousel */}
            <div
              className={`w-full h-full flex transition-transform duration-500 ease-out ${isTransitioning ? "opacity-90" : "opacity-100"}`}
              style={{ transform: `translateX(-${selectedImageIndex * 100}%)` }}>
              {allImages.map((image: string, index: number) => (
                <div key={index} className="w-full h-full flex-shrink-0 flex items-center justify-center p-4">
                  {image ? (
                    <img
                      src={image}
                      alt={`${product.name} - ${index + 1}`}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                  ) : (
                    <div className="text-neutral-200 text-8xl font-bold">
                      {product.name?.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Image Indicators */}
            {allImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {allImages.map((_: string, index: number) => (
                  <div
                    key={index}
                    className={`h-1 rounded-full transition-all duration-300 ${index === selectedImageIndex ? "w-6 bg-emerald-600" : "w-1.5 bg-neutral-200"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Location Availability Banner */}
          {!isAvailableAtLocation && (
            <div className="mt-8 mx-4 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <p className="text-xs font-semibold text-red-700">Not available for delivery at your location</p>
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div className="px-6 pb-8 space-y-6">
          <div className="space-y-4">
            {/* Name & Delivery Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                17 Mins delivery
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 leading-tight">
                {product.name}
              </h1>
              <p className="text-sm md:text-base text-neutral-500 font-medium">
                {variantTitle}
              </p>
            </div>

            {/* Pricing Row */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-neutral-900">
                ₹{variantPrice.toLocaleString("en-IN")}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-neutral-400 line-through font-medium">
                    ₹{variantMrp.toLocaleString("en-IN")}
                  </span>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Variant Selection */}
          {product.variations && product.variations.length > 1 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Select {product.variationType || "Variant"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((variant: any, index: number) => {
                  const vTitle = variant.title || variant.value || `Variant ${index + 1}`;
                  const isOutOfStock = variant.status === "Sold out" || (variant.stock === 0 && variant.stock !== undefined);
                  const isSelected = index === selectedVariantIndex;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedVariantIndex(index)}
                      disabled={isOutOfStock}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm"
                          : isOutOfStock
                            ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                            : "border-neutral-100 bg-white text-neutral-600 hover:border-neutral-200"
                      }`}>
                      {vTitle}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider line */}
          <div className="border-t border-neutral-200 mb-1.5"></div>

          {/* View product details link */}
          <button
            onClick={() =>
              setIsProductDetailsExpanded(!isProductDetailsExpanded)
            }
            className="flex items-center gap-0.5 text-sm text-green-600 font-medium">
            View product details
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isProductDetailsExpanded ? "rotate-180" : ""
                }`}>
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Expanded Product Details Section */}
        {isProductDetailsExpanded && (
          <div className="mt-1.5">
            {/* Service Guarantees Card */}
            <div className="bg-white rounded-lg p-3 mb-2">
              <div className="grid grid-cols-3 gap-2">
                {/* Replacement */}
                <div className="flex flex-col items-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mb-1">
                    <path
                      d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3M20.49 15a9 9 0 0 1-14.85 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-bold text-neutral-900">
                    48 hours
                  </span>
                  <span className="text-xs text-neutral-600">Replacement</span>
                </div>

                {/* Support */}
                <div className="flex flex-col items-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mb-1">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13 8H7M17 12H7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-sm font-bold text-neutral-900">
                    24/7
                  </span>
                  <span className="text-xs text-neutral-600">Support</span>
                </div>

                {/* Delivery */}
                <div className="flex flex-col items-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mb-1">
                    <path
                      d="M5 17H2l1-7h18l1 7h-3M5 17l-1-5h20l-1 5M5 17v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5M9 22h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-bold text-neutral-900">
                    Fast
                  </span>
                  <span className="text-xs text-neutral-600">Delivery</span>
                </div>
              </div>
            </div>

            {/* Highlights Section */}
            <div className="bg-neutral-100 rounded-lg mb-2 overflow-hidden">
              <button
                onClick={() => setIsHighlightsExpanded(!isHighlightsExpanded)}
                className="w-full px-2 py-2.5 flex items-center justify-between bg-neutral-100">
                <span className="text-sm font-semibold text-neutral-700">
                  Highlights
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transition-transform ${isHighlightsExpanded ? "rotate-180" : ""
                    }`}>
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isHighlightsExpanded && (
                <div className="bg-white px-2 py-2">
                  <div className="space-y-1.5">
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Key Features:
                        </span>
                        <span className="text-xs text-neutral-600">
                          {product.tags.map((tag: string, index: number) => (
                            <span key={tag}>
                              {tag
                                .replace(/-/g, " ")
                                .split(" ")
                                .map(
                                  (word: string) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ")}
                              {index < (product.tags?.length || 0) - 1
                                ? ", "
                                : ""}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Source:
                      </span>
                      <span className="text-xs text-neutral-600">
                        {product.madeIn || "From India"}
                      </span>
                    </div>
                    {category && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Category:
                        </span>
                        <span className="text-xs text-neutral-600">
                          {category.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="bg-neutral-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                className="w-full px-2 py-2.5 flex items-center justify-between bg-neutral-100">
                <span className="text-sm font-semibold text-neutral-700">
                  Info
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transition-transform ${isInfoExpanded ? "rotate-180" : ""
                    }`}>
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isInfoExpanded && (
                <div className="bg-white px-2 py-2">
                  <div className="space-y-1.5">
                    {product.description && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Description:
                        </span>
                        <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                          {product.description}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Unit:
                      </span>
                      <span className="text-xs text-neutral-600">
                        {product.pack}
                      </span>
                    </div>
                    {product.fssaiLicNo && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          FSSAI License:
                        </span>
                        <span className="text-xs text-neutral-600">
                          {product.fssaiLicNo}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Shelf Life:
                      </span>
                      <span className="text-xs text-neutral-600">
                        Refer to package
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Disclaimer:
                      </span>
                      <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                        Every effort is made to maintain accuracy of all
                        Information. However, actual product packaging and
                        materials may contain more and/or different information.
                        It is recommended not to solely rely on the information
                        presented.
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Customer Care Details:
                      </span>
                      <span className="text-xs text-neutral-600">
                        Email: help@kosil.com
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Country of Origin:
                      </span>
                      <span className="text-xs text-neutral-600">
                        {product.madeIn || "India"}
                      </span>
                    </div>
                    {product.manufacturer && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Manufacturer:
                        </span>
                        <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                          {product.manufacturer}
                        </span>
                      </div>
                    )}
                    {/* Marketer same as manufacturer if not present, or hidden */}

                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Return Policy:
                      </span>
                      <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                        {product.isReturnable
                          ? `This product is returnable within ${product.maxReturnDays || 2
                          } days.`
                          : "This product is non-returnable."}
                      </span>
                    </div>
                    {product.sellerId && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Seller:
                        </span>
                        <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                          Healthy Delight Partner (
                          {product.sellerId.slice(-6).toUpperCase()})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-8 mb-32 px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">Similar Products</h2>
              <button 
                 onClick={() => navigate('/category/' + (product.category?._id || product.category?.id))}
                 className="text-xs font-bold text-emerald-600 uppercase tracking-widest">See All</button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6">
              {similarProducts.map((item) => {
                const sCartItem = cart.items.find(c => (c.product.id || c.product._id) === (item.id || item._id));
                const sQty = sCartItem?.quantity || 0;
                const { displayPrice, mrp, hasDiscount, discount } = calculateProductPrice(item);

                return (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-44 bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-neutral-100 p-3 space-y-3">
                    <div 
                      onClick={() => navigate(`/product/${item.id || item._id}`)}
                      className="w-full aspect-square bg-neutral-50 rounded-xl flex items-center justify-center p-2 cursor-pointer relative overflow-hidden">
                      <img
                        src={item.imageUrl || item.mainImage}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                      {hasDiscount && (
                        <div className="absolute top-2 left-2 bg-emerald-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                          {discount}% OFF
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-semibold text-neutral-800 line-clamp-1">{item.name || item.productName}</h4>
                      <p className="text-[10px] text-neutral-400 font-medium">17 Mins</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-900">₹{displayPrice}</span>
                        {hasDiscount && <span className="text-[9px] text-neutral-400 line-through">₹{mrp}</span>}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-neutral-100 p-4 pb-8 md:pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-6">
          <div className="flex flex-col">
             <div className="flex items-center gap-1.5">
               <span className="text-xl font-bold text-neutral-900">₹{variantPrice.toLocaleString("en-IN")}</span>
               {hasDiscount && <span className="text-xs text-neutral-400 line-through font-medium">₹{variantMrp.toLocaleString("en-IN")}</span>}
             </div>
             <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Incl. all taxes</p>
          </div>

          <div className="flex-1 max-w-[200px]">
            <AnimatePresence mode="wait">
              {inCartQty === 0 ? (
                <motion.button
                  key="add-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleAddToCart}
                  disabled={!isAvailableAtLocation || (!isVariantAvailable && variantStock !== 0)}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(16,185,129,0.25)] transition-all active:scale-95 ${
                    !isAvailableAtLocation || (!isVariantAvailable && variantStock !== 0)
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-[0_12px_30px_rgba(16,185,129,0.3)]"
                  }`}>
                  {!isAvailableAtLocation 
                    ? "Unavailable" 
                    : (!isVariantAvailable && variantStock !== 0) 
                      ? "Out of Stock" 
                      : "Add to Cart"}
                </motion.button>
              ) : (
                <motion.div
                  key="stepper"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between bg-emerald-600 rounded-2xl p-1.5 shadow-[0_8px_25px_rgba(16,185,129,0.25)]">
                  <button
                    onClick={() => updateQuantity(product.id || product._id, inCartQty - 1, selectedVariant?._id, variantTitle)}
                    className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center transition-colors hover:bg-emerald-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <span className="text-sm font-bold text-white px-2">{inCartQty}</span>
                  <button
                    onClick={() => updateQuantity(product.id || product._id, inCartQty + 1, selectedVariant?._id, variantTitle)}
                    className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center transition-colors hover:bg-emerald-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
