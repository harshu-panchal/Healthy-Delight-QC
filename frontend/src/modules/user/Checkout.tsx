import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../hooks/useOrders";
import { useLocation as useLocationContext } from "../../hooks/useLocation";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import RazorpayCheckout from "../../components/RazorpayCheckout";

// import { products } from '../../data/products'; // Removed
import { OrderAddress, Order } from "../../types/order";
import PartyPopper from "./components/PartyPopper";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "../../components/ui/sheet";
import WishlistButton from "../../components/WishlistButton";

import {
  getCoupons,
  validateCoupon,
  Coupon as ApiCoupon,
} from "../../services/api/customerCouponService";
import { appConfig } from "../../services/configService";
import {
  getAddresses,
  updateAddress,
} from "../../services/api/customerAddressService";
import GoogleMapsLocationPicker from "../../components/GoogleMapsLocationPicker";
import { getProducts } from "../../services/api/customerProductService";
import { addToWishlist } from "../../services/api/customerWishlistService";
import { updateProfile } from "../../services/api/customerService";
import { calculateProductPrice } from "../../utils/priceUtils";

// const STORAGE_KEY = 'saved_address'; // Removed

// Similar products helper removed - using API

export default function Checkout() {
  const {
    cart,
    updateQuantity,
    clearCart,
    addToCart,
    removeFromCart,
    refreshCart,
    loading: cartLoading,
  } = useCart();
  const { addOrder } = useOrders();
  const { location: userLocation } = useLocationContext();
  const { showToast: showGlobalToast } = useToast();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState<number>(0);
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);
  const [savedAddress, setSavedAddress] = useState<OrderAddress | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<OrderAddress | null>(
    null
  );

  // Recalculate delivery charges when address changes
  useEffect(() => {
    if (selectedAddress?.latitude && selectedAddress?.longitude) {
      refreshCart(selectedAddress.latitude, selectedAddress.longitude);
    }
  }, [selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude]);
  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<ApiCoupon | null>(null);
  const [showPartyPopper, setShowPartyPopper] = useState(false);
  const [hasAppliedCouponBefore, setHasAppliedCouponBefore] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<ApiCoupon[]>([]);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatedDiscount, setValidatedDiscount] = useState<number>(0);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [showGstinSheet, setShowGstinSheet] = useState(false);
  const [gstin, setGstin] = useState<string>("");
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [giftPackaging, setGiftPackaging] = useState<boolean>(false);
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "Online">("Online");
  const [timeSlot, setTimeSlot] = useState<string>("");

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    email: "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
    address?: any;
  } | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isMapSelected, setIsMapSelected] = useState(false);
  const isAnySheetOpen = showCouponSheet || showGstinSheet || showCancellationPolicy || showProfileModal || showMapPicker;

  // Check if user has placeholder data (needs profile completion)
  const isPlaceholderUser =
    user?.name === "User" || user?.email?.endsWith("@kosil.temp");

  // Redirect if empty
  useEffect(() => {
    if (!cartLoading && cart.items.length === 0 && !showOrderSuccess) {
      navigate("/");
    }
  }, [cart.items.length, cartLoading, navigate, showOrderSuccess]);

  // Load addresses and coupons
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [addressResponse, couponResponse] = await Promise.all([
          getAddresses(),
          getCoupons(),
        ]);

        if (
          addressResponse.success &&
          Array.isArray(addressResponse.data) &&
          addressResponse.data.length > 0
        ) {
          const defaultAddr =
            addressResponse.data.find((a: any) => a.isDefault) ||
            addressResponse.data[0];
          const mappedAddress: OrderAddress = {
            name: defaultAddr.fullName,
            phone: defaultAddr.phone,
            flat: "",
            street: defaultAddr.address,
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.pincode,
            landmark: defaultAddr.landmark || "",
            latitude: defaultAddr.latitude,
            longitude: defaultAddr.longitude,
            id: defaultAddr._id,
            _id: defaultAddr._id,
          };
          setSavedAddress(mappedAddress);
          setSelectedAddress(mappedAddress);
        }

        if (couponResponse.success) {
          setAvailableCoupons(couponResponse.data);
        }
      } catch (error) {
        console.error("Error loading checkout data:", error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch similar products dynamically
  useEffect(() => {
    const fetchSimilar = async () => {
      const items = (cart?.items || []).filter((item) => item && item.product);
      if (items.length === 0) return;

      const cartItem = items[0];
      try {
        const latitude = userLocation?.latitude ?? selectedAddress?.latitude;
        const longitude = userLocation?.longitude ?? selectedAddress?.longitude;

        const locationParams =
          latitude != null && longitude != null
            ? { latitude, longitude }
            : {};

        const itemsInCartIds = new Set(
          (cart?.items || [])
            .map((i) => i.product?.id || i.product?._id)
            .filter(Boolean)
        );

        const mapToCardProduct = (p: any) => {
          const { displayPrice, mrp } = calculateProductPrice(p);
          return {
            ...p,
            id: p._id || p.id,
            name: p.productName || p.name || "Product",
            imageUrl: p.mainImage || p.imageUrl || p.mainImageUrl || "",
            price: displayPrice,
            mrp: mrp,
            pack:
              p.pack ||
              p.variations?.[0]?.title ||
              p.variations?.[0]?.name ||
              "Standard",
          };
        };

        let response;
        if (cartItem && cartItem.product) {
          // Try to fetch by category of the first item
          let catId = "";
          const product = cartItem.product;

          if (product.categoryId) {
            catId =
              typeof product.categoryId === "string"
                ? product.categoryId
                : (product.categoryId as any)._id ||
                (product.categoryId as any).id;
          }

          if (catId) {
            response = await getProducts({
              category: catId,
              limit: 10,
              ...locationParams,
            });
          } else {
            response = await getProducts({
              limit: 10,
              sort: "popular",
              ...locationParams,
            });
          }
        } else {
          response = await getProducts({
            limit: 10,
            sort: "popular",
            ...locationParams,
          });
        }

        if (response && response.data) {
          // Filter out items already in cart
          let filtered = (response.data || [])
            .filter((p: any) => !itemsInCartIds.has(p.id || p._id))
            .map(mapToCardProduct)
            .slice(0, 6);

          // Fallback: if category-based list becomes empty, show popular products
          if (filtered.length === 0) {
            const popular = await getProducts({
              limit: 12,
              sort: "popular",
              ...locationParams,
            });
            filtered = (popular?.data || [])
              .filter((p: any) => !itemsInCartIds.has(p.id || p._id))
              .map(mapToCardProduct)
              .slice(0, 6);
          }

          setSimilarProducts(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch similar products", err);
      }
    };
    fetchSimilar();
  }, [
    cart?.items?.length,
    userLocation?.latitude,
    userLocation?.longitude,
    selectedAddress?.latitude,
    selectedAddress?.longitude,
  ]);

  if (cartLoading || ((cart?.items?.length || 0) === 0 && !showOrderSuccess)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#0a193b] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-neutral-600">
            {cartLoading ? "Loading checkout..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  const displayItems = (cart?.items || []).filter(
    (item) => item && item.product
  );
  const displayCart = {
    ...cart,
    items: displayItems,
    itemCount: displayItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    ),
    total: displayItems.reduce((sum, item) => {
      const { displayPrice } = calculateProductPrice(
        item.product,
        item.variant
      );
      return sum + displayPrice * (item.quantity || 0);
    }, 0),
  };

  const threshold = cart.freeDeliveryThreshold ?? appConfig.freeDeliveryThreshold;
  const amountNeededForFreeDelivery = Math.max(
    0,
    threshold - (displayCart.total || 0)
  );
  const cartItem = displayItems[0];

  const itemsTotal = displayItems.reduce((sum, item) => {
    if (!item?.product) return sum;
    const { mrp } = calculateProductPrice(item.product, item.variant);
    return sum + mrp * (item.quantity || 0);
  }, 0);

  const discountedTotal = displayCart.total;
  const savedAmount = itemsTotal - discountedTotal;
  const handlingCharge = cart.platformFee ?? appConfig.platformFee;
  const deliveryCharge = cart.estimatedDeliveryFee ?? (displayCart.total >= threshold ? 0 : appConfig.deliveryFee);

  // Recalculate or use validated discount
  // If we have a selected coupon, we should re-validate if cart total changes,
  // but for simplicity, we'll re-calculate locally if possible or trust the previous validation if acceptable (better to re-validate)
  const subtotalBeforeCoupon =
    discountedTotal + handlingCharge + deliveryCharge;

  // Local calculation for immediate feedback, relying on backend validation on Apply
  let currentCouponDiscount = 0;
  if (selectedCoupon) {
    // Logic mirrors backend for UI update purposes
    if (
      selectedCoupon.minOrderValue &&
      subtotalBeforeCoupon < selectedCoupon.minOrderValue
    ) {
      // Invalid now
    } else {
      if (selectedCoupon.discountType === "percentage") {
        currentCouponDiscount = Math.round(
          (subtotalBeforeCoupon * selectedCoupon.discountValue) / 100
        );
        if (
          selectedCoupon.maxDiscountAmount &&
          currentCouponDiscount > selectedCoupon.maxDiscountAmount
        ) {
          currentCouponDiscount = selectedCoupon.maxDiscountAmount;
        }
      } else {
        currentCouponDiscount = selectedCoupon.discountValue;
      }
    }
  }

  // Calculate tip amount (use custom tip if custom tip input is shown, otherwise use selected tip)
  const finalTipAmount = showCustomTipInput ? customTipAmount : tipAmount || 0;
  const giftPackagingFee = giftPackaging ? 30 : 0;
  const grandTotal = Math.max(
    0,
    discountedTotal +
    handlingCharge +
    deliveryCharge +
    finalTipAmount +
    giftPackagingFee -
    currentCouponDiscount
  );

  const handleApplyCoupon = async (coupon: ApiCoupon) => {
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(coupon.code, subtotalBeforeCoupon);
      if (result.success && result.data?.isValid) {
        const isFirstTime = !hasAppliedCouponBefore;
        setSelectedCoupon(coupon);
        setValidatedDiscount(result.data.discountAmount);
        setShowCouponSheet(false);
        if (isFirstTime) {
          setHasAppliedCouponBefore(true);
          setShowPartyPopper(true);
        }
      } else {
        setCouponError(result.message || "Invalid coupon");
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || "Failed to apply coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setSelectedCoupon(null);
    setValidatedDiscount(0);
    setCouponError(null);
  };

  const handleMoveToWishlist = async (product: any, variantId?: string, variantTitle?: string) => {
    if (!product?.id && !product?._id) return;

    const productId = product.id || product._id;

    try {
      if (!userLocation?.latitude || !userLocation?.longitude) {
        showGlobalToast(
          "Location is required to move items to wishlist",
          "error"
        );
        return;
      }

      // Add to wishlist
      await addToWishlist(
        productId,
        userLocation.latitude,
        userLocation.longitude
      );
      // Remove from cart
      await removeFromCart(productId, variantId, variantTitle);
      // Show success message
      showGlobalToast("Item moved to wishlist");
    } catch (error: any) {
      console.error("Failed to move to wishlist:", error);
      const msg =
        error.response?.data?.message || "Failed to move item to wishlist";
      showGlobalToast(msg, "error");
    }
  };

  const handlePlaceOrder = async (arg?: any) => {
    // Only bypass if explicitly passed true (handles event objects from onClick)
    const bypassProfileCheck = arg === true;

    if (!selectedAddress || cart.items.length === 0) {
      return;
    }

    if (!timeSlot || timeSlot.trim() === "") {
      alert("Please select a shift time to place your order.");
      return;
    }

    // Check if user needs to complete their profile first
    if (!bypassProfileCheck && isPlaceholderUser) {
      setProfileFormData({
        name: user?.name === "User" ? "" : user?.name || "",
        email: user?.email?.endsWith("@kosil.temp") ? "" : user?.email || "",
      });
      setShowProfileModal(true);
      return;
    }

    // Validate required address fields
    if (!selectedAddress.city || !selectedAddress.pincode) {
      console.error("Address is missing required fields (city or pincode)");
      alert("Please ensure your address has city and pincode.");
      return;
    }

    // Use user's current location as fallback if address doesn't have coordinates
    const finalLatitude = selectedAddress.latitude ?? userLocation?.latitude;
    const finalLongitude = selectedAddress.longitude ?? userLocation?.longitude;

    // Validate that we have location data (either from address or user's current location)
    if (finalLatitude == null || finalLongitude == null) {
      console.error(
        "Address is missing location data (latitude/longitude) and user location is not available"
      );
      alert(
        "Location is required for delivery. Please ensure your address has location data or enable location access."
      );
      return;
    }

    // Create address object with location data (use fallback if needed)
    const addressWithLocation: OrderAddress = {
      ...selectedAddress,
      latitude: finalLatitude,
      longitude: finalLongitude,
    };

    const orderId = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    const order: Order = {
      id: orderId,
      items: cart.items,
      totalItems: cart.itemCount,
      subtotal: discountedTotal,
      fees: {
        platformFee: handlingCharge,
        deliveryFee: deliveryCharge,
      },
      totalAmount: grandTotal,
      address: addressWithLocation,
      timeSlot,
      paymentMethod: paymentMethod,
      status: "Placed",
      createdAt: new Date().toISOString(),
      tipAmount: finalTipAmount,
      gstin: gstin || undefined,
      couponCode: selectedCoupon?.code || undefined,
      giftPackaging: giftPackaging,
    };

    try {
      const placedId = await addOrder(order);
      if (placedId) {
        if (paymentMethod === "Online") {
          setPendingOrderId(placedId);
          setShowRazorpayCheckout(true);
        } else {
          setPlacedOrderId(placedId);
          clearCart();
          setShowOrderSuccess(true);
        }
      }
    } catch (error: any) {
      console.error("Order placement failed", error);
      // Show user-friendly error message
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Failed to place order. Please try again.";
      alert(errorMessage);
    }
  };

  const handleGoToOrders = () => {
    if (placedOrderId) {
      navigate(`/orders/${placedOrderId}`);
    } else {
      navigate("/orders");
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedAddress?.id || !mapLocation) return;
    setIsUpdatingLocation(true);
    try {
      // Prepare update payload
      const updatePayload: any = {
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
      };

      // If address details are available from map, update them too
      if (mapLocation.address) {
        if (mapLocation.address.street)
          updatePayload.address = mapLocation.address.street;
        if (mapLocation.address.city)
          updatePayload.city = mapLocation.address.city;
        if (mapLocation.address.state)
          updatePayload.state = mapLocation.address.state;
        if (mapLocation.address.pincode)
          updatePayload.pincode = mapLocation.address.pincode;
        if (mapLocation.address.landmark)
          updatePayload.landmark = mapLocation.address.landmark;
      }

      // Update the address in backend
      await updateAddress(selectedAddress.id, updatePayload);

      // Update local state
      const updated = {
        ...selectedAddress,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        street: mapLocation.address?.street || selectedAddress.street,
        city: mapLocation.address?.city || selectedAddress.city,
        state: mapLocation.address?.state || selectedAddress.state,
        pincode: mapLocation.address?.pincode || selectedAddress.pincode,
        landmark: mapLocation.address?.landmark || selectedAddress.landmark,
      };
      setSelectedAddress(updated);
      setSavedAddress(updated); // Sync
      setShowMapPicker(false);
      setIsMapSelected(true); // Mark map as selected
      showGlobalToast("Location and address updated successfully!");
    } catch (err) {
      console.error(err);
      // showGlobalToast('Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Handle profile completion submission
  const handleProfileSubmit = async () => {
    if (!profileFormData.name.trim() || !profileFormData.email.trim()) {
      setProfileError("Please enter both name and email");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileFormData.email)) {
      setProfileError("Please enter a valid email address (e.g., username@domain.com)");
      return;
    }

    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      const response = await updateProfile({
        name: profileFormData.name.trim(),
        email: profileFormData.email.trim(),
      });

      if (response.success) {
        // Update local user data
        updateUser({
          ...user,
          id: user?.id || "",
          name: response.data.name,
          email: response.data.email,
        });

        setShowProfileModal(false);
        showGlobalToast("Profile updated successfully!");

        // Directly trigger order placement, bypassing the profile check
        handlePlaceOrder(true);
      }
    } catch (error: any) {
      setProfileError(
        error.response?.data?.message ||
        "Failed to update profile. Please try again."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div
      className="bg-white min-h-screen flex flex-col pb-16">
      {/* Party Popper Animation */}
      <PartyPopper
        show={showPartyPopper}
        onComplete={() => setShowPartyPopper(false)}
      />

      {/* Profile Completion Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-neutral-900 mb-2">
                Complete Your Profile
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Please provide your name and email to continue with your order.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileFormData.name}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        name: e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                      }))
                    }
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0a193b] transition-colors"
                    disabled={isUpdatingProfile}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileFormData.email}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter your email"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0a193b] transition-colors"
                    disabled={isUpdatingProfile}
                  />
                </div>

                {profileError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {profileError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                    disabled={isUpdatingProfile}>
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSubmit}
                    disabled={
                      isUpdatingProfile ||
                      !profileFormData.name.trim() ||
                      !profileFormData.email.trim()
                    }
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isUpdatingProfile ||
                      !profileFormData.name.trim() ||
                      !profileFormData.email.trim()
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-[#0a193b] text-white hover:bg-[#0a193b]/90"
                      }`}>
                    {isUpdatingProfile ? "Saving..." : "Save & Continue"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {showMapPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowMapPicker(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl overflow-hidden w-full max-w-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-neutral-900">
                  Pin Delivery Location
                </h3>
                <button onClick={() => setShowMapPicker(false)}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <GoogleMapsLocationPicker
                initialLat={
                  mapLocation?.lat ||
                  userLocation?.latitude ||
                  selectedAddress?.latitude ||
                  0
                }
                initialLng={
                  mapLocation?.lng ||
                  userLocation?.longitude ||
                  selectedAddress?.longitude ||
                  0
                }
                onLocationSelect={(lat, lng, address) =>
                  setMapLocation({ lat, lng, address })
                }
                height="300px"
              />

              <div className="p-4 bg-white border-t">
                <p className="text-xs text-neutral-500 mb-3 text-center">
                  Move the map to set your exact delivery location
                </p>
                <button
                  onClick={handleUpdateLocation}
                  disabled={isUpdatingLocation}
                  className="w-full py-3 bg-neutral-900 text-white font-bold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {isUpdatingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    "Confirm Location"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Celebration Page */}
      {showOrderSuccess && (
        <div
          className="fixed inset-0 z-[70] bg-white flex flex-col items-center justify-center h-screen w-screen overflow-hidden"
          style={{ animation: "fadeIn 0.3s ease-out" }}>
          {/* Confetti Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Animated confetti pieces */}
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  backgroundColor: [
                    "#22c55e",
                    "#3b82f6",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                  ][Math.floor(Math.random() * 6)],
                  animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2
                    }s infinite`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          {/* Success Content */}
          <div className="relative z-10 flex flex-col items-center px-6">
            {/* Success Tick Circle */}
            <div
              className="relative mb-8"
              style={{
                animation:
                  "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both",
              }}>
              {/* Outer ring animation */}
              <div
                className="absolute inset-0 w-32 h-32 rounded-full border-4 border-[#0a193b]"
                style={{
                  animation: "ringPulse 1.5s ease-out infinite",
                  opacity: 0.3,
                }}
              />
              {/* Main circle */}
              <div className="w-32 h-32 bg-gradient-to-br from-[#0a193b] to-[#0a193b]/80 rounded-full flex items-center justify-center shadow-2xl">
                <svg
                  className="w-16 h-16 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: "checkDraw 0.5s ease-out 0.5s both" }}>
                  <path d="M5 12l5 5L19 7" className="check-path" />
                </svg>
              </div>
              {/* Sparkles */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    animation: `sparkle 0.6s ease-out ${0.3 + i * 0.1}s both`,
                    transform: `rotate(${i * 60}deg) translateY(-80px)`,
                  }}
                />
              ))}
            </div>

            {/* Location Info */}
            <div
              className="text-center"
              style={{ animation: "slideUp 0.5s ease-out 0.6s both" }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-5 h-5 text-red-500">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedAddress?.city || "Your Location"}
                </h2>
              </div>
              <p className="text-gray-500 text-base">
                {selectedAddress
                  ? `${selectedAddress.street}, ${selectedAddress.city}`
                  : "Delivery Address"}
              </p>
            </div>

            {/* Order Placed Message */}
            <div
              className="mt-12 text-center"
              style={{ animation: "slideUp 0.5s ease-out 0.8s both" }}>
              <h3 className="text-3xl font-bold text-[#0a193b] mb-2">
                Order Placed!
              </h3>
              <p className="text-gray-600">Your order is on the way</p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoToOrders}
              className="mt-10 bg-[#0a193b] hover:bg-[#0a193b]/90 text-white font-semibold py-4 px-12 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105"
              style={{ animation: "slideUp 0.5s ease-out 1s both" }}>
              Track Your Order
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="px-4 md:px-6 lg:px-8 py-2 md:py-3 flex items-center justify-between">
          {/* Back Arrow */}
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label="Go back">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Title */}
          <h1 className="text-base font-bold text-neutral-900">Checkout</h1>

          {/* Spacer to maintain layout */}
          <div className="w-7 h-7"></div>
        </div>
      </div>

      {/* Ordering for someone else */}
      <div className="px-4 md:px-6 lg:px-8 py-2 md:py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-700">
            Ordering for someone else?
          </span>
          <button
            onClick={() =>
              navigate("/checkout/address", {
                state: {
                  editAddress: savedAddress,
                },
              })
            }
            className="text-xs text-[#0a193b] font-bold hover:underline transition-colors">
            Add details
          </button>
        </div>
      </div>

      {/* Saved Address Section */}
      {savedAddress && (
        <div className="px-4 md:px-6 lg:px-8 py-2 md:py-3 border-b border-neutral-200">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-neutral-900 mb-0.5">
              Delivery Address
            </h3>
            <p className="text-[10px] text-neutral-600">
              Select or edit your saved address
            </p>
          </div>

          <div
            className={`border rounded-lg p-2.5 cursor-pointer transition-all ${selectedAddress && !isMapSelected
              ? "border-[#0a193b] bg-[#0a193b]/5"
              : "border-neutral-300 bg-white"
              }`}
            onClick={() => {
              setSelectedAddress(savedAddress);
              setIsMapSelected(false);
            }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedAddress && !isMapSelected
                      ? "border-[#0a193b] bg-[#0a193b]"
                      : "border-neutral-400"
                      }`}>
                    {selectedAddress && !isMapSelected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-neutral-900">
                    {savedAddress.name}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-600 mb-0.5">
                  {savedAddress.phone}
                </p>
                <p className="text-[10px] text-neutral-600">
                  {savedAddress.flat ? `${savedAddress.flat}, ` : ""}
                  {savedAddress.street}
                  {savedAddress.landmark ? (
                    <>
                      ,{" "}
                      <span className="font-medium text-[#0a193b]">
                        Near {savedAddress.landmark}
                      </span>
                    </>
                  ) : (
                    ""
                  )}
                  , {savedAddress.city} - {savedAddress.pincode}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/checkout/address", {
                    state: {
                      editAddress: savedAddress,
                    },
                  });
                }}
                className="text-xs text-[#0a193b] font-bold ml-2">
                Edit
              </button>
            </div>
          </div>
          {/* Set Location on Map Button */}
          <div className="mt-2.5">
            <button
              onClick={() => {
                // Prioritize current GPS location (matches homepage header), then saved address
                setMapLocation({
                  lat: userLocation?.latitude || selectedAddress?.latitude || 0,
                  lng:
                    userLocation?.longitude || selectedAddress?.longitude || 0,
                });
                setShowMapPicker(true);
              }}
              className={`flex items-center gap-3 text-base font-bold px-5 py-4 rounded-xl w-full justify-center transition-colors ${isMapSelected
                ? "text-[#0a193b] bg-[#0a193b]/10 border-2 border-[#0a193b] ring-1 ring-[#0a193b]/20"
                : "text-[#0a193b] hover:text-[#0a193b]/90 bg-[#0a193b]/5 border-2 border-[#0a193b]/20 hover:bg-[#0a193b]/10 hover:border-[#0a193b]/30"
                }`}>
              {isMapSelected ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="10"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {isMapSelected
                ? "Precise Location Selected"
                : selectedAddress?.latitude
                  ? "Update Precise Location on Map"
                  : "Set Exact Location on Map"}
            </button>
          </div>
        </div>
      )}

      {/* Main Product Card (Cart) */}
      <div className="px-4 md:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-50 bg-neutral-50/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Your Cart</h2>
            <span className="text-[10px] font-bold text-[#0a193b] bg-[#0a193b]/5 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {displayCart.itemCount || 0} {(displayCart.itemCount || 0) === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="divide-y divide-neutral-50">
            {displayItems
              .filter((item) => item.product)
              .map((item) => {
                const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                const variantTitle = (item.product as any).variantTitle || item.product.pack;
                const { displayPrice, mrp, hasDiscount } = calculateProductPrice(item.product, item.variant);

                return (
                  <div key={item.product?.id || Math.random()} className="p-4 flex items-center gap-4">
                    {/* Left: Product Image */}
                    <div className="w-20 h-20 bg-neutral-50 rounded-2xl flex-shrink-0 overflow-hidden p-2 flex items-center justify-center">
                      <img
                        src={item.product?.imageUrl || item.product?.mainImage}
                        alt={item.product?.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 mb-0.5">
                        {item.product?.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 font-medium mb-1.5 uppercase">
                        {item.product?.pack}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToWishlist(item.product, variantId, variantTitle);
                        }}
                        className="text-[10px] font-medium text-neutral-400 hover:text-[#0a193b] font-bold transition-colors">
                        Move to wishlist
                      </button>
                    </div>

                    {/* Right: Stepper & Price */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-neutral-900">₹{(displayPrice * item.quantity).toLocaleString()}</span>
                        {hasDiscount && <span className="text-[10px] text-neutral-400 line-through">₹{(mrp * item.quantity).toLocaleString()}</span>}
                      </div>

                      <div className="flex items-center gap-3 bg-neutral-50 rounded-xl px-1.5 py-1">
                        <button
                          onClick={() => updateQuantity(item.product?.id, item.quantity - 1, variantId, variantTitle)}
                          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-[#0a193b] hover:bg-white rounded-lg transition-all font-bold text-lg">
                          −
                        </button>
                        <span className="text-xs font-bold text-neutral-900 min-w-[1rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product?.id, item.quantity + 1, variantId, variantTitle)}
                          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-[#0a193b] hover:bg-white rounded-lg transition-all font-bold text-lg">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* You might also like (Recommendations) */}
      <div className="px-4 md:px-6 lg:px-8 py-4 pb-2">
        <h2 className="text-base font-bold text-neutral-900 mb-4 tracking-tight">You might also like</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
          {similarProducts.map((product) => {
            const { displayPrice, mrp, hasDiscount, discount } = calculateProductPrice(product);
            const productId = product.id || product._id;
            const inCartItem = (cart?.items || []).find(item => (item.product?.id || item.product?._id) === productId);
            const inCartQty = inCartItem?.quantity || 0;

            return (
              <div key={productId} className="flex-shrink-0 w-44 bg-white rounded-3xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-neutral-100 p-3 flex flex-col gap-3">
                <div
                  onClick={() => navigate(`/product/${productId}`)}
                  className="w-full aspect-square bg-neutral-50 rounded-2xl flex items-center justify-center p-3 cursor-pointer relative overflow-hidden group">
                  <img
                    src={product.imageUrl || product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-contain transition-transform group-hover:scale-110"
                  />
                  {hasDiscount && (
                    <div className="absolute top-2 left-2 bg-[#0a193b] text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                      {discount}% OFF
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="text-[11px] font-semibold text-neutral-800 line-clamp-1 mb-1">{product.name || product.productName}</h4>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-900">₹{displayPrice}</span>
                      {hasDiscount && <span className="text-[9px] text-neutral-400 line-through">₹{mrp}</span>}
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="w-8 h-8 rounded-full bg-[#0a193b]/5 text-[#0a193b] flex items-center justify-center hover:bg-[#0a193b] hover:text-white transition-all shadow-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Get FREE delivery banner - Themed */}
      {deliveryCharge > 0 && (
        <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100">
          <div className="flex items-center gap-2 mb-1.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M5 13h14M5 13l4-4m-4 4l4 4"
                stroke="#8A6642"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="5" r="2" fill="#8A6642" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8A6642]">
                  Get FREE delivery
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="#8A6642"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-[10px] text-[#8A6642]/80 mt-0.5">
                Add products worth ₹{amountNeededForFreeDelivery.toLocaleString('en-IN')} more
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1 bg-[#E6D5C3] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8A6642] transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  ((199 - amountNeededForFreeDelivery) / 199) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Coupon Section */}
      {selectedCoupon ? (
        <div className="px-4 py-1.5 border-b border-neutral-200">
          <div className="flex items-center justify-between bg-[#0a193b]/5 rounded-lg p-2 border border-[#0a193b]/20">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#0a193b] flex items-center justify-center flex-shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0a193b] truncate">
                  {selectedCoupon.code}
                </p>
                <p className="text-[10px] text-[#0a193b]/80 truncate">
                  {selectedCoupon.title}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs text-[#0a193b] font-bold ml-2 flex-shrink-0">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-1.5 flex justify-end border-b border-neutral-200">
          <button
            onClick={() => setShowCouponSheet(true)}
            className="text-xs text-neutral-600 flex items-center gap-1">
            See all coupons
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 18l6-6-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Required Selection: Shift Time */}
      <div className="px-4 md:px-6 lg:px-8 py-6 bg-white border-b border-neutral-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-neutral-900 tracking-tight">Delivery Shift</h3>
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mt-0.5">Required Selection</p>
          </div>
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "Morning (9:00 AM - 12:00 PM)", label: "Morning", sub: "9:00 AM - 12:00 PM" },
            { value: "Evening (5:00 PM - 9:00 PM)", label: "Evening", sub: "5:00 PM - 9:00 PM" },
          ].map((slot) => {
            const selected = timeSlot === slot.value;
            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => setTimeSlot(slot.value)}
                className={`group relative p-3.5 rounded-2xl border-2 transition-all duration-300 ${selected
                  ? "border-[#0a193b] bg-[#0a193b]/5 shadow-[0_4px_15px_rgba(10,25,59,0.1)]"
                  : "border-neutral-100 bg-white hover:border-neutral-200"
                  }`}
              >
                <div className="flex flex-col gap-1">
                  <span className={`text-xs font-bold leading-tight ${selected ? "text-[#0a193b]" : "text-neutral-900"}`}>
                    {slot.label}
                  </span>
                  <span className="text-[9px] font-medium text-neutral-500 uppercase tracking-tight">{slot.sub}</span>
                </div>
                {selected && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-[#0a193b] rounded-full flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!timeSlot && (
          <div className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-red-50 rounded-xl text-[10px] font-bold text-red-600 border border-red-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            Please select a delivery shift to proceed
          </div>
        )}
      </div>

      {/* Optional Add-ons Group */}
      <div className="px-4 md:px-6 lg:px-8 py-6 bg-white border-b border-neutral-100 space-y-6">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-neutral-900 tracking-tight">Optional Add-ons</h3>
          <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mt-0.5">Customize your delivery</p>
        </div>

        {/* GSTIN Entry */}
        <button
          onClick={() => setShowGstinSheet(true)}
          className="w-full flex items-center justify-between bg-neutral-50/50 hover:bg-neutral-50 p-4 rounded-2xl border border-neutral-100 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-sm font-bold">%</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-neutral-900">Add GSTIN</p>
              <p className="text-[10px] text-neutral-500 font-medium">
                {gstin ? `GSTIN: ${gstin}` : "Claim GST input credit on your order"}
              </p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300 group-hover:text-neutral-900 transition-colors"><path d="M9 18l6-6-6-6" /></svg>
        </button>

        {/* Improved Tip UI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Tip your delivery partner</h4>
            <span className="text-[9px] font-bold text-[#0a193b] uppercase">100% goes to partner</span>
          </div>
          <div className="flex gap-2 pb-1">
            {[20, 30, 50].map((amount) => (
              <button
                key={amount}
                onClick={() => { setTipAmount(amount); setShowCustomTipInput(false); }}
                className={`relative flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${tipAmount === amount && !showCustomTipInput
                  ? "bg-[#0a193b] text-white shadow-[0_4px_12px_rgba(10,25,59,0.2)]"
                  : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  }`}>
                ₹{amount}
                {amount === 30 && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-amber-400 text-[6px] text-amber-900 px-1 py-0 rounded-full border border-amber-500 whitespace-nowrap font-bold">
                    Recommended
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => { setShowCustomTipInput(true); setTipAmount(null); }}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${showCustomTipInput ? "bg-[#0a193b] text-white shadow-[0_4px_12px_rgba(10,25,59,0.2)]" : "bg-neutral-50 text-neutral-600"
                }`}>
              Custom
            </button>
          </div>
          {showCustomTipInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={customTipAmount || ""}
                onChange={(e) => setCustomTipAmount(Math.max(0, Number(e.target.value)))}
                placeholder="Enter tip amount"
                className="flex-1 px-4 py-2.5 bg-white border border-[#0a193b]/20 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0a193b]/10"
              />
              <button onClick={() => { setShowCustomTipInput(false); setTipAmount(null); }} className="text-[10px] font-bold text-neutral-400 uppercase">Cancel</button>
            </div>
          )}
        </div>

        {/* Improved Gift Packaging UI */}
        <button
          onClick={() => setGiftPackaging(!giftPackaging)}
          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${giftPackaging ? "bg-[#0a193b]/5 border-[#0a193b]/20 shadow-sm" : "bg-neutral-50/50 border-neutral-100"
            }`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${giftPackaging ? "bg-[#0a193b]/10 text-[#0a193b]" : "bg-neutral-100 text-neutral-400"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H4v4M2 12h20M7 8V5c0-1.7 1.3-3 3-3h4c1.7 0 3 1.3 3 3v3M12 2v20M2 12v6c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-6" /></svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-neutral-900">Gift Packaging</p>
              <p className="text-[10px] text-neutral-500 font-medium tracking-tight">Add an elegant gift wrap for only ₹30</p>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${giftPackaging ? "bg-[#0a193b] border-[#0a193b] scale-110" : "border-neutral-200 bg-white"}`}>
            {giftPackaging && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </div>
        </button>

        {/* Cancellation Policy */}
        <div className="pt-2">
          <button
            onClick={() => setShowCancellationPolicy(true)}
            className="text-[10px] font-bold text-neutral-400 hover:text-neutral-900 transition-colors uppercase tracking-widest flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            Cancellation Policy
          </button>
        </div>
      </div>

      {/* Bill details */}
      <div id="bill-summary" className="px-4 md:px-6 lg:px-8 py-2.5 md:py-3 border-b border-neutral-200">
        <h2 className="text-base font-bold text-neutral-900 mb-2.5">
          Bill details
        </h2>

        <div className="space-y-2">
          {/* Items total */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-700">Items total</span>
              {savedAmount > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                  Saved ₹{savedAmount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {itemsTotal > discountedTotal && (
                <span className="text-xs text-neutral-500 line-through">
                  ₹{itemsTotal}
                </span>
              )}
              <span className="text-xs font-medium text-neutral-900">
                ₹{discountedTotal}
              </span>
            </div>
          </div>

          {/* Handling charge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
              <span className="text-xs text-neutral-700">Handling charge</span>
            </div>
            <span className="text-xs font-medium text-neutral-900">
              ₹{handlingCharge}
            </span>
          </div>

          {/* Delivery charge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" />
                <circle cx="18.5" cy="18.5" r="1.5" fill="currentColor" />
              </svg>
              <span className="text-xs text-neutral-700">Delivery charge</span>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`text-xs font-bold ${deliveryCharge === 0 ? "text-[#0a193b]" : "text-neutral-900"
                  }`}>
                {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
              </span>
              {deliveryCharge > 0 && (
                <span className="text-[10px] text-orange-600 mt-0.5">
                  Shop for ₹{amountNeededForFreeDelivery} more to get FREE delivery
                </span>
              )}
            </div>
          </div>

          {/* Coupon discount */}
          {selectedCoupon && currentCouponDiscount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs text-neutral-700">
                  Coupon discount
                </span>
                <span className="text-[10px] bg-[#0a193b]/5 text-[#0a193b] px-1.5 py-0.5 rounded-full font-medium">
                  {selectedCoupon.code}
                </span>
              </div>
              <span className="text-xs font-medium text-[#0a193b]">
                -₹{currentCouponDiscount.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Tip amount */}
          {finalTipAmount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs text-neutral-700">
                  Tip to delivery partner
                </span>
              </div>
              <span className="text-xs font-medium text-neutral-900">
                ₹{finalTipAmount}
              </span>
            </div>
          )}

          {/* Gift Packaging */}
          {giftPackaging && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <span className="text-xs text-neutral-700">Gift Packaging</span>
              </div>
              <span className="text-xs font-medium text-neutral-900">
                ₹{giftPackagingFee}
              </span>
            </div>
          )}

          {/* Grand total */}
          <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
            <span className="text-sm font-bold text-neutral-900">
              Grand total
            </span>
            <span className="text-sm font-bold text-neutral-900">
              ₹{Math.max(0, grandTotal)}
            </span>
          </div>
        </div>
      </div>




      {/* GSTIN Sheet Modal */}
      <Sheet open={showGstinSheet} onOpenChange={setShowGstinSheet}>
        <SheetContent side="bottom" className="max-h-[50vh]">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="text-base font-bold text-neutral-900">
                Add GSTIN
              </SheetTitle>
              <SheetClose onClick={() => setShowGstinSheet(false)}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="px-4 pb-4 mt-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                GSTIN Number
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => {
                  const value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "");
                  if (value.length <= 15) {
                    setGstin(value);
                  }
                }}
                placeholder="Enter 15-character GSTIN"
                className="w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0a193b]/20 focus:border-[#0a193b]"
                maxLength={15}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Format: 15 characters (e.g., 27AAAAA0000A1Z5)
              </p>
            </div>
            <button
              onClick={() => {
                if (gstin.length === 15) {
                  setShowGstinSheet(false);
                } else {
                  alert("Please enter a valid 15-character GSTIN");
                }
              }}
              className="w-full bg-[#0a193b] text-white py-3 px-4 font-bold text-sm uppercase tracking-wide hover:bg-[#0a193b]/90 transition-colors rounded-lg">
              Save GSTIN
            </button>
            {gstin && (
              <button
                onClick={() => {
                  setGstin("");
                  setShowGstinSheet(false);
                }}
                className="w-full mt-2 bg-neutral-100 text-neutral-700 py-2 px-4 font-medium text-sm hover:bg-neutral-200 transition-colors rounded-lg">
                Remove GSTIN
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancellation Policy Sheet Modal */}
      <Sheet
        open={showCancellationPolicy}
        onOpenChange={setShowCancellationPolicy}>
        <SheetContent side="bottom" className="max-h-[90vh] h-[90vh] p-0 rounded-t-3xl border-none">
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto my-4 flex-shrink-0" />

          <SheetHeader className="text-left px-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="text-xl font-bold text-neutral-900">
                Cancellation Policy
              </SheetTitle>
              <SheetClose
                onClick={() => setShowCancellationPolicy(false)}
                className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-32">
            <div className="space-y-8 mt-6">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  Order Cancellation
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                  You can cancel your order before it is confirmed by the
                  seller. Once confirmed, cancellation may not be possible as the preparation starts immediately to ensure 17-minute delivery.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  Refund Policy
                </h3>
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
                  <ul className="space-y-4 font-medium">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0a193b]/10 text-[#0a193b] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <span className="text-sm text-neutral-700">Refunds are processed within 5-7 business days</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0a193b]/10 text-[#0a193b] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <span className="text-sm text-neutral-700">Amount will be credited to your original payment method</span>
                    </li>
                    <li className="flex items-start gap-3 text-red-600">
                      <div className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="12" /></svg>
                      </div>
                      <span className="text-sm">Delivery charges & platform fees are non-refundable</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  Partial Cancellation
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                  Partial cancellation of items in an order is not allowed. You
                  can cancel the entire order or contact customer support for
                  assistance before the order is marked as "Out for Delivery".
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  Contact Support
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-neutral-600 font-medium">Email: <span className="text-neutral-900 font-bold">support@kosil.com</span></p>
                  <p className="text-sm text-neutral-600 font-medium">Phone: <span className="text-neutral-900 font-bold">+91 00000 00000</span></p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>



      {/* Payment Method Selection */}
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50/50">
        <h3 className="text-sm font-bold text-neutral-900 mb-2">Payment Method</h3>
        <div className="space-y-2">
          {/* Online Payment Option */}
          <div
            onClick={() => setPaymentMethod("Online")}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "Online"
              ? "border-[#0a193b] bg-[#0a193b]/5"
              : "border-neutral-200 bg-white"
              }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "Online" ? "bg-[#0a193b]/10 text-[#0a193b]" : "bg-neutral-100 text-neutral-500"
              }`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div>
              <span className={`text-xs font-bold block ${paymentMethod === "Online" ? "text-[#0a193b]" : "text-neutral-900"}`}>Online Payment</span>
              <span className="text-[10px] text-neutral-500">Secure payment via Razorpay</span>
            </div>
            {paymentMethod === "Online" && (
              <div className="ml-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0a193b]">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>

          {/* COD Option */}
          <div
            onClick={() => setPaymentMethod("COD")}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "COD"
              ? "border-[#0a193b] bg-[#0a193b]/5"
              : "border-neutral-200 bg-white"
              }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "COD" ? "bg-[#0a193b]/10 text-[#0a193b]" : "bg-neutral-100 text-neutral-500"
              }`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div>
              <span className={`text-xs font-bold block ${paymentMethod === "COD" ? "text-[#0a193b]" : "text-neutral-900"}`}>Cash on Delivery</span>
              <span className="text-[10px] text-neutral-500">Pay when you receive your order</span>
            </div>
            {paymentMethod === "COD" && (
              <div className="ml-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0a193b]">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Made with love by Healthy Delight */}
      <div className="px-4 py-2 mt-4">
        <div className="w-full flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <span className="text-[10px] font-medium">Made with</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              className="text-red-500 text-sm">
              ❤️
            </motion.span>
            <span className="text-[10px] font-medium">by</span>
            <span className="text-[10px] font-semibold text-[#0a193b]">
              Healthy Delight
            </span>
          </div>
        </div>
      </div>
      {/* Coupon Sheet Modal */}
      <Sheet open={showCouponSheet} onOpenChange={setShowCouponSheet}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="text-base font-bold text-neutral-900">
                Available Coupons
              </SheetTitle>
              <SheetClose onClick={() => setShowCouponSheet(false)}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(85vh-80px)]">
            <div className="space-y-2.5 mt-2">
              {availableCoupons.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p>No coupons available at the moment.</p>
                </div>
              ) : (
                availableCoupons.map((coupon) => {
                  const subtotalBeforeCoupon =
                    discountedTotal + handlingCharge + deliveryCharge;
                  const meetsMinOrder =
                    !coupon.minOrderValue ||
                    subtotalBeforeCoupon >= coupon.minOrderValue;
                  const isSelected = selectedCoupon?._id === coupon._id;

                  return (
                    <div
                      key={coupon._id}
                      className={`border-2 rounded-lg p-2.5 transition-all ${isSelected
                        ? "border-[#0a193b] bg-[#0a193b]/5"
                        : meetsMinOrder
                          ? "border-neutral-200 bg-white"
                          : "border-neutral-200 bg-neutral-50 opacity-60"
                        }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#0a193b]">
                              {coupon.code}
                            </span>
                            <span className="text-xs font-semibold text-neutral-900">
                              {coupon.title}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-600 mb-1">
                            {coupon.description}
                          </p>
                          {coupon.minOrderValue && (
                            <p className="text-[10px] text-neutral-500">
                              Min. order: ₹{coupon.minOrderValue}
                            </p>
                          )}
                        </div>
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-[#0a193b]">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M20 6L9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span className="text-xs font-bold">Applied</span>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              meetsMinOrder && handleApplyCoupon(coupon)
                            }
                            disabled={!meetsMinOrder || isValidatingCoupon}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${meetsMinOrder
                              ? "bg-[#0a193b] text-white hover:bg-[#0a193b]/90"
                              : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                              }`}>
                            {isValidatingCoupon ? "..." : "Apply"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Sticky CTA Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-neutral-100 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.04)] px-4 py-4 md:py-5 pb-8 md:pb-6 transition-transform duration-300 ease-in-out ${isAnySheetOpen ? "translate-y-full" : "translate-y-0"}`}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-6">
          {/* Left side: Price display */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-neutral-900">₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>
            <button
              onClick={() => {
                const element = document.getElementById('bill-summary');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-[10px] font-bold text-[#0a193b] uppercase tracking-widest text-left hover:underline">
              View Bill Details
            </button>
          </div>

          {/* Right side: Action Button */}
          <div className="flex-1 max-w-[220px]">
            {selectedAddress ? (
              <button
                onClick={handlePlaceOrder}
                disabled={cart.items.length === 0 || !timeSlot}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(10,25,59,0.25)] transition-all active:scale-95 ${cart.items.length > 0 && timeSlot
                  ? "bg-[#0a193b] text-white hover:bg-[#0a193b]/90 hover:shadow-[0_12px_30px_rgba(10,25,59,0.3)]"
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                  }`}>
                Place Order
              </button>
            ) : (
              <button
                onClick={() =>
                  navigate("/checkout/address", {
                    state: {
                      editAddress: savedAddress,
                    },
                  })
                }
                className="w-full bg-[#0a193b] text-white py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(10,25,59,0.25)] hover:bg-[#0a193b]/90 hover:shadow-[0_12px_30px_rgba(10,25,59,0.3)] transition-all active:scale-95">
                Continue to Address
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Razorpay Checkout Modal */}
      {
        showRazorpayCheckout && pendingOrderId && user && (
          <RazorpayCheckout
            orderId={pendingOrderId}
            amount={grandTotal}
            customerDetails={{
              name: user.name || "Customer",
              email: user.email || "",
              phone: user.phone || "",
            }}
            onSuccess={(paymentId) => {
              setShowRazorpayCheckout(false);
              setPlacedOrderId(pendingOrderId);
              setPendingOrderId(null);
              clearCart();
              setShowOrderSuccess(true);
              showGlobalToast("Payment successful!", "success");
            }}
            onFailure={(error) => {
              setShowRazorpayCheckout(false);
              setPendingOrderId(null);
              showGlobalToast(error || "Payment failed. Please try again.", "error");
            }}
          />
        )
      }
      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes checkDraw {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }

        @keyframes ringPulse {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.3);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes sparkle {
          0% {
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(0);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation, 0deg)) translateY(-80px) scale(1);
            opacity: 0;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        .check-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 0;
        }
      `}</style>
    </div >
  );
}
