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
import { addToWishlist, getWishlist } from "../../services/api/customerWishlistService";
import { getProfile, updateProfile } from "../../services/api/customerService";
import { calculateProductPrice } from "../../utils/priceUtils";
import { updateScheduledOrderItems } from "../../services/api/customerOrderService";
import { verifyPayment } from "../../services/api/paymentService";

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
  const [couponCodeInput, setCouponCodeInput] = useState<string>("");
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [showGstinSheet, setShowGstinSheet] = useState(false);
  const [gstin, setGstin] = useState<string>("");
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [isMovingLastToWishlist, setIsMovingLastToWishlist] = useState(false);

  const [showScheduledConflictModal, setShowScheduledConflictModal] = useState(false);
  const [conflictModalDate, setConflictModalDate] = useState<string | null>(null);

  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  const fetchWishlist = async () => {
    try {
      setLoadingWishlist(true);
      let lat = userLocation?.latitude;
      let lng = userLocation?.longitude;

      if (!lat || !lng) {
        const cached = localStorage.getItem('userLocation');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            lat = parsed.latitude;
            lng = parsed.longitude;
          } catch (e) {
            console.error('Failed to parse cached location in Checkout wishlist fetch:', e);
          }
        }
      }

      const res = await getWishlist({
        latitude: lat,
        longitude: lng
      });

      if (res.success && res.data) {
        const validProducts = (res.data.products || []).filter((p: any) => p !== null && p !== undefined);
        setWishlistProducts(validProducts.map(p => ({
          ...p,
          id: p._id || (p as any).id,
          name: p.productName || (p as any).name,
          imageUrl: p.mainImageUrl || p.mainImage || (p as any).imageUrl,
          price: (p as any).price || (p as any).variations?.[0]?.price || 0,
          pack: (p as any).pack || (p as any).variations?.[0]?.name || 'Standard'
        })));
      }
    } catch (err) {
      console.error('Failed to fetch wishlist on checkout:', err);
    } finally {
      setLoadingWishlist(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    if (!showGstinSheet) {
      setGstinError(null);
    }
  }, [showGstinSheet]);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [giftPackaging, setGiftPackaging] = useState<boolean>(false);
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "Online">("Online");
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [isPlacedOrderScheduled, setIsPlacedOrderScheduled] = useState<boolean>(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  // Load scheduled order data from sessionStorage
  const [scheduledDateStr, setScheduledDateStr] = useState<string | null>(() => {
    return sessionStorage.getItem("scheduledDeliveryDate");
  });
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState<string | null>(() => {
    return sessionStorage.getItem("scheduledTimeSlot");
  });

  // Map scheduledTimeSlot to timeSlot on mount/change
  useEffect(() => {
    if (scheduledDateStr && scheduledTimeSlot) {
      if (scheduledTimeSlot === "Morning") {
        setTimeSlot("Morning (6:00 AM - 9:00 AM)");
      } else if (scheduledTimeSlot === "Evening") {
        setTimeSlot("Evening (6:00 PM - 9:00 PM)");
      }
    }
  }, [scheduledDateStr, scheduledTimeSlot]);

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
    user?.name === "User" || user?.email?.endsWith("@healthydelight.temp");

  // Redirect if empty
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialCheckDone(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Disable automatic redirection to allow empty-cart wishlist hub to display inline
  // useEffect(() => {
  //   if (initialCheckDone && !cartLoading && cart.items.length === 0 && !showOrderSuccess && !isMovingLastToWishlist) {
  //     navigate("/user");
  //   }
  // }, [cart.items.length, cartLoading, navigate, showOrderSuccess, initialCheckDone, isMovingLastToWishlist]);

  // Handle Razorpay payment redirect verification
  useEffect(() => {
    const verifyRedirectPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const razorpayPaymentId = urlParams.get("razorpay_payment_id");
      const razorpayOrderId = urlParams.get("razorpay_order_id");
      const razorpaySignature = urlParams.get("razorpay_signature");
      const savedPendingOrderId = localStorage.getItem("pendingOrderId");

      if (razorpayPaymentId && razorpayOrderId && razorpaySignature && savedPendingOrderId) {
        setIsVerifyingPayment(true);
        try {
          const verificationResponse = await verifyPayment({
            orderId: savedPendingOrderId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
          });

          if (verificationResponse.success) {
            // Remove the query parameters from the URL
            window.history.replaceState({}, document.title, window.location.pathname);

            localStorage.removeItem("pendingOrderId");
            setPlacedOrderId(savedPendingOrderId);
            clearCart();
            setShowOrderSuccess(true);
          } else {
            alert(`Payment verification failed: ${verificationResponse.message || "Unknown error"}`);
            localStorage.removeItem("pendingOrderId");
          }
        } catch (err: any) {
          console.error("Redirect verification error:", err);
          alert(`Payment verification failed: ${err.message || "Unknown error"}`);
          localStorage.removeItem("pendingOrderId");
        } finally {
          setIsVerifyingPayment(false);
        }
      }
    };

    verifyRedirectPayment();
  }, [clearCart]);

  // Load addresses and coupons
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [addressResponse, couponResponse, profileResponse] = await Promise.all([
          getAddresses(),
          getCoupons(),
          getProfile(),
        ]);

        if (profileResponse.success && profileResponse.data) {
          setWalletAmount(profileResponse.data.walletAmount);
        }

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
              limit: 30,
              ...locationParams,
            });
          } else {
            response = await getProducts({
              limit: 30,
              sort: "popular",
              ...locationParams,
            });
          }
        } else {
          response = await getProducts({
            limit: 30,
            sort: "popular",
            ...locationParams,
          });
        }

        if (response && response.data) {
          // Filter out items already in cart
          let filtered = (response.data || [])
            .filter((p: any) => !itemsInCartIds.has(p.id || p._id))
            .map(mapToCardProduct);

          // If we have less than 5 items, fetch additional popular products to fill the recommendation list to at least 5
          if (filtered.length < 5) {
            const popular = await getProducts({
              limit: 30,
              sort: "popular",
              ...locationParams,
            });
            const popularMapped = (popular?.data || [])
              .filter((p: any) => !itemsInCartIds.has(p.id || p._id))
              .map(mapToCardProduct);

            // Merge unique items
            const seenIds = new Set(filtered.map(p => p.id));
            for (const p of popularMapped) {
              if (!seenIds.has(p.id)) {
                filtered.push(p);
                seenIds.add(p.id);
              }
            }
          }

          // Slice to show a good amount of options (e.g. up to 8)
          filtered = filtered.slice(0, 8);

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

  if (isVerifyingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#0a193b] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-semibold text-neutral-800 mb-2">Verifying Payment...</p>
          <p className="text-sm text-neutral-500">Please do not close this window or refresh.</p>
        </div>
      </div>
    );
  }

  if (cartLoading && cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#0a193b] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-neutral-600">
            Loading checkout...
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
        item.variant,
        user?.customerType,
        item.quantity
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
    const { mrp } = calculateProductPrice(item.product, item.variant, user?.customerType, item.quantity);
    return sum + mrp * (item.quantity || 0);
  }, 0);

  const discountedTotal = displayCart.total;
  const savedAmount = itemsTotal - discountedTotal;
  const handlingCharge = cart.platformFee ?? appConfig.platformFee;
  const deliveryCharge = cart.estimatedDeliveryFee ?? (displayCart.total >= threshold ? 0 : appConfig.deliveryFee);

  // Calculate tax amount dynamically from cart items
  const taxTotal = displayItems.reduce((sum, item) => {
    if (!item?.product) return sum;
    const { displayPrice } = calculateProductPrice(item.product, item.variant, user?.customerType, item.quantity);
    const taxPercentage = (item.product as any).tax?.percentage || 0;
    return sum + (displayPrice * (taxPercentage / 100)) * (item.quantity || 0);
  }, 0);

  // Recalculate or use validated discount
  // If we have a selected coupon, we should re-validate if cart total changes,
  // but for simplicity, we'll re-calculate locally if possible or trust the previous validation if acceptable (better to re-validate)
  const subtotalBeforeCoupon =
    discountedTotal + handlingCharge + deliveryCharge + taxTotal;

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
    taxTotal +
    finalTipAmount +
    giftPackagingFee -
    currentCouponDiscount
  );

  const walletDeduction = useWallet ? Math.min(walletAmount, grandTotal) : 0;
  const remainingTotal = Number((grandTotal - walletDeduction).toFixed(2));

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

  const handleApplyCouponByCode = async (code: string) => {
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(code, subtotalBeforeCoupon);
      if (result.success && result.data?.isValid) {
        const isFirstTime = !hasAppliedCouponBefore;
        const resData = result.data as any;
        const applied = resData?.coupon || {
          code: code.toUpperCase(),
          title: `Coupon ${code.toUpperCase()}`,
          description: `Saves ₹${resData?.discountAmount}`,
          discountType: resData?.coupon?.discountType || "Fixed",
          discountValue: resData?.coupon?.discountValue || resData?.discountAmount
        };
        setSelectedCoupon(applied);
        setValidatedDiscount(result.data.discountAmount);
        setCouponCodeInput("");
        if (isFirstTime) {
          setHasAppliedCouponBefore(true);
          setShowPartyPopper(true);
        }
      } else {
        setCouponError(result.message || "Invalid coupon code");
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || "Failed to apply coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
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

      // Refresh wishlist items to show them in the checkout empty state instantly!
      fetchWishlist();
    } catch (error: any) {
      setIsMovingLastToWishlist(false);
      console.error("Failed to move to wishlist:", error);
      const msg =
        error.response?.data?.message || "Failed to move item to wishlist";
      showGlobalToast(msg, "error");
    }
  };

  const handleConfirmScheduledConflict = async () => {
    setShowScheduledConflictModal(false);
    try {
      showGlobalToast("Placing a new scheduled order...", "info");
      await handlePlaceOrder(true, true);
    } catch (newOrderError: any) {
      console.error("Failed to place new scheduled order:", newOrderError);
      alert(newOrderError.response?.data?.message || "Failed to place your new scheduled order.");
    }
  };

  const handlePlaceOrder = async (arg?: any, forcePlaceNew?: boolean) => {
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
        email: (user?.email?.endsWith("@kosil.temp") || user?.email?.endsWith("@healthydelight.temp")) ? "" : user?.email || "",
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

    const effectivePaymentMethod = remainingTotal === 0 ? "Wallet" : paymentMethod;

    const order: Order & { orderType?: string; scheduledDate?: string; scheduledTimeSlot?: string; useWallet?: boolean; forcePlaceNewScheduled?: boolean } = {
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
      paymentMethod: effectivePaymentMethod,
      useWallet: useWallet,
      status: scheduledDateStr ? "Scheduled" : "Placed",
      createdAt: new Date().toISOString(),
      tipAmount: finalTipAmount,
      gstin: gstin || undefined,
      couponCode: selectedCoupon?.code || undefined,
      giftPackaging: giftPackaging,
      forcePlaceNewScheduled: forcePlaceNew,
      ...(scheduledDateStr ? {
        orderType: "Scheduled",
        scheduledDate: scheduledDateStr,
        scheduledTimeSlot: scheduledTimeSlot || undefined,
      } : {})
    };

    try {
      const placedId = await addOrder(order);
      if (placedId) {
        setIsPlacedOrderScheduled(!!scheduledDateStr);
        // Clear schedule keys from sessionStorage on order success
        sessionStorage.removeItem("scheduledDeliveryDate");
        sessionStorage.removeItem("scheduledTimeSlot");

        if (effectivePaymentMethod === "Online") {
          localStorage.setItem("pendingOrderId", placedId);
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
      if (error.response?.status === 409 && error.response?.data?.canModify) {
        setConflictModalDate(scheduledDateStr);
        setShowScheduledConflictModal(true);
        return;
      }

      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Failed to place order. Please try again.";
      alert(errorMessage);
    }
  };

  const handleGoToOrders = () => {
    if (isPlacedOrderScheduled) {
      navigate("/manage-schedule");
    } else if (placedOrderId) {
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

      {/* Scheduled Order Conflict Modal */}
      <AnimatePresence>
        {showScheduledConflictModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowScheduledConflictModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-neutral-100 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon Container */}
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-3xl animate-bounce">
                📅
              </div>

              <h3 className="text-xl font-extrabold text-[#0a193b] mb-2">
                Delivery Already Scheduled
              </h3>
              
              <p className="text-sm text-neutral-600 font-medium mb-6 leading-relaxed">
                You already have a scheduled delivery for{" "}
                <span className="font-bold text-[#0a193b]">
                  {conflictModalDate
                    ? new Date(conflictModalDate).toLocaleDateString("en-US", { weekday: "long" })
                    : "this day"}
                </span>
                . Would you like to place another new scheduled order for this day?
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowScheduledConflictModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-full hover:bg-neutral-200 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmScheduledConflict}
                  className="flex-1 py-3 text-sm font-bold text-white bg-[#0a193b] rounded-full hover:bg-[#0a193b]/90 shadow-md shadow-[#0a193b]/10 transition-all active:scale-[0.98]"
                >
                  Place New Order
                </button>
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
              <p className="text-gray-600">
                {isPlacedOrderScheduled
                  ? "Your delivery has been scheduled successfully!"
                  : "Your order is on the way"}
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoToOrders}
              className="mt-10 bg-[#0a193b] hover:bg-[#0a193b]/90 text-white font-semibold py-4 px-12 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105"
              style={{ animation: "slideUp 0.5s ease-out 1s both" }}>
              {isPlacedOrderScheduled ? "See Scheduled Orders" : "Track Your Order"}
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

      {cart.items.length === 0 && !showOrderSuccess ? (
        // Empty Cart / Wishlist Hub
        <div className="flex-grow bg-[#f8f6f2] flex flex-col pt-8 pb-16 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full flex flex-col items-center">
            {/* Empty Cart Header Card */}
            <div className="w-full bg-white rounded-3xl p-8 border border-neutral-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col items-center text-center mb-8">
              <div className="text-5xl mb-4">🛒</div>
              <h2 className="text-xl font-extrabold text-[#0a193b] mb-2">Your cart is empty</h2>
              <p className="text-sm text-neutral-500 mb-6 font-medium">Add items from your wishlist or start exploring fresh delights!</p>
              <button 
                onClick={() => navigate('/user')} 
                className="bg-[#0a193b] text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#0a193b]/90 shadow-md transition-all active:scale-95"
              >
                Go to Shopping
              </button>
            </div>

            {/* Wishlist Section */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-base font-extrabold text-[#0a193b] flex items-center gap-2">
                  <span>❤️</span> Items in Wishlist
                </h3>
                {wishlistProducts.length > 0 && (
                  <span className="text-xs font-bold text-[#0a193b] bg-[#0a193b]/5 px-2.5 py-1 rounded-full">
                    {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              {loadingWishlist ? (
                <div className="w-full bg-white rounded-3xl p-12 border border-neutral-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex justify-center items-center">
                  <div className="w-8 h-8 border-3 border-[#0a193b]/30 border-t-[#0a193b] rounded-full animate-spin"></div>
                </div>
              ) : wishlistProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {wishlistProducts.map((product) => {
                    const { displayPrice, mrp, hasDiscount } = calculateProductPrice(product);
                    return (
                      <div key={product.id} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 flex gap-4 items-center">
                        <div className="w-16 h-16 bg-neutral-50 rounded-xl flex-shrink-0 p-2 flex items-center justify-center">
                          <img src={product.imageUrl || product.mainImage} alt={product.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-neutral-900 truncate mb-0.5">{product.name}</h4>
                          <p className="text-[10px] text-neutral-400 font-semibold mb-1.5">{product.pack}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-[#0a193b]">₹{displayPrice}</span>
                            {hasDiscount && <span className="text-[10px] text-neutral-400 line-through">₹{mrp}</span>}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await addToCart(product);
                            showGlobalToast(`${product.name} added to cart`);
                          }}
                          className="bg-[#0a193b]/5 text-[#0a193b] hover:bg-[#0a193b] hover:text-white px-3 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 border border-[#0a193b]/10 shadow-sm"
                        >
                          ADD TO CART
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full bg-white rounded-3xl p-12 border border-neutral-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
                  <span className="text-3xl mb-3">❤️</span>
                  <p className="text-sm font-bold text-neutral-600">Your wishlist is currently empty</p>
                  <p className="text-xs text-neutral-400 mt-1">Shortlist items to view them here later</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col overflow-y-auto">
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

      {/* Scheduled Delivery Indicator */}
      {scheduledDateStr && scheduledTimeSlot && (
        <div className="mx-4 md:mx-6 lg:mx-8 mt-4 p-4 rounded-3xl bg-blue-50/80 border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100/50 flex items-center justify-center text-blue-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <p className="text-xs font-black text-[#0a193b]">Scheduled Delivery</p>
              <p className="text-[10px] text-neutral-600 font-semibold mt-0.5">
                {new Date(scheduledDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • {scheduledTimeSlot === "Morning" ? "Morning (6-9 AM)" : "Evening (5-8 PM)"}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/manage-schedule')}
            className="text-[10px] font-black text-blue-600 hover:underline uppercase bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm"
          >
            Change
          </button>
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
                const { displayPrice, mrp, hasDiscount } = calculateProductPrice(item.product, item.variant, user?.customerType, item.quantity);

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



      {/* Coupon Section */}
      <div className="px-4 py-4 bg-white border-b border-neutral-100">
        {selectedCoupon ? (
          <div className="flex items-center justify-between bg-[#0a193b]/5 rounded-2xl p-4 border border-[#0a193b]/20">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#0a193b] flex items-center justify-center flex-shrink-0">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#0a193b] tracking-wide">
                  {selectedCoupon.code}
                </p>
                <p className="text-[10px] text-[#0a193b]/80 font-bold mt-0.5">
                  Applied successfully! Saved ₹{currentCouponDiscount}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs text-red-600 font-extrabold ml-2 flex-shrink-0 hover:text-red-700 transition-colors uppercase tracking-wider">
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-neutral-900 tracking-tight">Promo & Coupons</h3>
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mt-0.5">Apply discount code</p>
              </div>
              <button
                onClick={() => setShowCouponSheet(true)}
                className="text-[10px] font-extrabold text-[#0a193b] hover:text-[#0a193b]/80 uppercase tracking-widest transition-colors flex items-center gap-1">
                View Available
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Coupon Code (e.g. SAVE50)"
                  value={couponCodeInput}
                  onChange={(e) => {
                    setCouponCodeInput(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  className="w-full pl-4 pr-16 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-black uppercase placeholder:text-neutral-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[#0a193b]/10 focus:border-[#0a193b] transition-all"
                />
                <button
                  onClick={() => {
                    if (couponCodeInput.trim()) {
                      const found = availableCoupons.find(c => c.code.toUpperCase() === couponCodeInput.trim().toUpperCase());
                      if (found) {
                        handleApplyCoupon(found);
                      } else {
                        handleApplyCouponByCode(couponCodeInput.trim());
                      }
                    }
                  }}
                  disabled={!couponCodeInput.trim() || isValidatingCoupon}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#0a193b] disabled:text-neutral-300 hover:text-[#0a193b]/85 transition-colors uppercase tracking-wider">
                  {isValidatingCoupon ? "..." : "Apply"}
                </button>
              </div>
            </div>

            {couponError && (
              <p className="text-[10px] font-bold text-red-600 px-1">
                ⚠️ {couponError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Required Selection: Shift Time */}
      {!scheduledDateStr && (
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
              { value: "Morning (6:00 AM - 9:00 AM)", label: "Morning", sub: "6:00 AM - 9:00 AM" },
              { value: "Evening (6:00 PM - 9:00 PM)", label: "Evening", sub: "6:00 PM - 9:00 PM" },
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
      )}

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

            </div>
          </div>

          {/* Taxes */}
          {taxTotal > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 14l6-6M9 8h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs text-neutral-700">Taxes</span>
              </div>
              <span className="text-xs font-medium text-neutral-900">
                ₹{Math.round(taxTotal * 100) / 100}
              </span>
            </div>
          )}

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

          {/* Wallet deduction */}
          {useWallet && walletAmount > 0 && (
            <div className="flex items-center justify-between text-green-700">
              <div className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 4v16M2 12h22" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="text-xs font-semibold">Wallet Deduction</span>
              </div>
              <span className="text-xs font-black">
                -₹{Math.min(walletAmount, grandTotal).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Net payment remaining */}
          {useWallet && walletAmount > 0 && (
            <div className="pt-1.5 flex items-center justify-between border-t border-dashed border-neutral-100">
              <span className="text-xs font-bold text-neutral-500">
                Remaining to Pay
              </span>
              <span className="text-xs font-black text-[#0a193b]">
                ₹{remainingTotal.toLocaleString("en-IN")}
              </span>
            </div>
          )}
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
                    setGstinError(null);
                  }
                }}
                placeholder="Enter 15-character GSTIN"
                className="w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0a193b]/20 focus:border-[#0a193b]"
                maxLength={15}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Format: 15 characters (e.g., 27AAAAA0000A1Z5)
              </p>
              {gstinError && (
                <p className="text-xs font-semibold text-red-500 mt-1.5 animate-fadeIn">
                  {gstinError}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                if (gstinRegex.test(gstin.toUpperCase())) {
                  setShowGstinSheet(false);
                } else {
                  setGstinError("Invalid GSTIN format. Please enter a valid 15-character GSTIN (e.g., 27AAAAA0000A1Z5)");
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
                  Once confirmed, instant order cancellations may not be possible as the preparation starts immediately to ensure 17-minute delivery.
                </p>
                <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                  For scheduled orders, cancellations are permitted up to <strong>1 hour before your scheduled delivery time</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  Refund Policy
                </h3>
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 space-y-2">
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                    For eligible cancellations on <strong>scheduled orders</strong>, refunds will be credited directly to your <strong>Healthy Delight Wallet</strong> to be used for future transactions.
                  </p>
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                    Please note that refunds are <strong>not available for instant orders</strong> once confirmed, as preparation and dispatch begin immediately to ensure ultra-fast delivery.
                  </p>
                </div>
              </div>


              <div className="space-y-3">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  Contact Support
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-neutral-600 font-medium">
                    Email:{" "}
                    <a 
                      href="mailto:support@healthydelight.com" 
                      onClick={(e) => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 font-bold hover:text-[#0a193b] hover:underline transition-all"
                    >
                      support@healthydelight.com
                    </a>
                  </p>
                  <p className="text-sm text-neutral-600 font-medium">
                    Phone:{" "}
                    <a 
                      href="tel:+919740234199" 
                      onClick={(e) => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 font-bold hover:text-[#0a193b] hover:underline transition-all"
                    >
                      +91 9740234199
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>



      {/* Wallet Balance Usage Option */}
      {walletAmount > 0 && (
        <div className="px-4 py-3.5 border-b border-neutral-200 bg-white">
          <div
            onClick={() => setUseWallet(!useWallet)}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${useWallet
              ? "border-green-600 bg-green-50/30 shadow-[0_4px_15px_rgba(22,163,74,0.08)]"
              : "border-neutral-100 bg-white hover:border-neutral-200"
              }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${useWallet ? "bg-green-100 text-green-700" : "bg-neutral-50 text-neutral-500"
              }`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-black block ${useWallet ? "text-green-700" : "text-neutral-900"}`}>
                Use Customer Wallet
              </span>
              <span className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                Balance: <strong className="text-neutral-800">₹{walletAmount.toLocaleString("en-IN")}</strong>
                {useWallet && (
                  <>
                    {" "}• Applied: <strong className="text-green-700">−₹{Math.min(walletAmount, grandTotal).toLocaleString("en-IN")}</strong>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center">
              {/* Custom Switch Toggle */}
              <div className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${useWallet ? 'bg-green-600' : 'bg-neutral-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform duration-200 ${useWallet ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selection */}
      {useWallet && remainingTotal === 0 ? (
        <div className="px-4 py-4 border-b border-neutral-200 bg-green-50/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-black text-green-800">Fully Covered by Wallet</p>
            <p className="text-[10px] text-green-600 font-semibold mt-0.5">No additional payment method is required for this order.</p>
          </div>
        </div>
      ) : (
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
      )}

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
              <span className="text-xl font-bold text-neutral-900">₹{remainingTotal.toLocaleString("en-IN")}</span>
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
            amount={remainingTotal}
            customerDetails={{
              name: user.name || "Customer",
              email: user.email || "",
              phone: user.phone || "",
            }}
            onSuccess={(paymentId) => {
              // Clear schedule keys from sessionStorage on order success
              sessionStorage.removeItem("scheduledDeliveryDate");
              sessionStorage.removeItem("scheduledTimeSlot");
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
        </div>
      )}
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
