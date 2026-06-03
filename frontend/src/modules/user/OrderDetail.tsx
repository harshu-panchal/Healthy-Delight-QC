import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/ui/button";
import { useOrders } from "../../hooks/useOrders";
import { useAuth } from "../../context/AuthContext";
import { OrderStatus } from "../../types/order";
import GoogleMapsTracking from "../../components/GoogleMapsTracking";
import { useDeliveryTracking } from "../../hooks/useDeliveryTracking";
import DeliveryPartnerCard from "../../components/DeliveryPartnerCard";
import {
  cancelOrder,
  updateOrderNotes,
  getSellerLocationsForOrder,
  refreshDeliveryOtp,
  getOrderTracking,
} from "../../services/api/customerOrderService";

const formatOrderFriendly = (orderNumber?: string, orderId?: string) => {
  if (orderNumber && orderNumber !== 'N/A') {
    if (orderNumber.startsWith('ORD')) {
      const numericPart = orderNumber.replace('ORD', '');
      if (numericPart.length > 6) {
        return `ORD-${numericPart.slice(-6)}`;
      }
      return orderNumber;
    }
    return orderNumber.length > 10 ? orderNumber.slice(0, 8) : orderNumber;
  }
  if (orderId) {
    const cleanId = orderId.includes('-') ? orderId.split('-').slice(-1)[0] : orderId;
    if (cleanId.length > 6) {
      return `ORD-${cleanId.slice(-6).toUpperCase()}`;
    }
    return `ORD-${cleanId.toUpperCase()}`;
  }
  return 'Unknown';
};

// Icon Components
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const Share2Icon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.48L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);



const HelpCircleIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);



const ReceiptIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="16" y2="15" />
  </svg>
);

const CircleSlashIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

// Animated checkmark component
const AnimatedCheckmark = ({ delay = 0 }) => (
  <motion.svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    initial="hidden"
    animate="visible"
    className="mx-auto">
    <motion.circle
      cx="40"
      cy="40"
      r="36"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    />
    <motion.path
      d="M24 40 L35 51 L56 30"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: delay + 0.4, ease: "easeOut" }}
    />
  </motion.svg>
);

// Section item component
const SectionItem = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  showArrow = true,
  rightContent,
}: {
  icon?: any;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  showArrow?: boolean;
  rightContent?: React.ReactNode;
}) => (
  <motion.button
    onClick={onClick}
    disabled={!onClick}
    className={`w-full flex items-center gap-4.5 p-6 transition-all text-left border-b border-dashed border-slate-100 last:border-0 ${onClick ? "hover:bg-slate-50/80 cursor-pointer active:bg-slate-100/50" : "cursor-default"
      }`}
    whileTap={onClick ? { scale: 0.993 } : undefined}>
    {Icon && (
      <div className="w-10 h-10 rounded-xl bg-[#0a193b]/5 flex items-center justify-center flex-shrink-0 border border-[#0a193b]/5 shadow-sm shadow-[#0a193b]/2">
        <Icon className="w-5 h-5 text-[#0a193b]/80" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-slate-800 text-sm tracking-tight leading-snug">{title}</p>
      {subtitle && <p className="text-xs font-medium text-slate-400 mt-0.5 leading-normal">{subtitle}</p>}
    </div>
    {rightContent ||
      (onClick && showArrow && <ChevronRightIcon className="w-4 h-4 text-slate-400" />)}
  </motion.button>
);

export default function OrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "true";
  const { getOrderById, fetchOrderById, loading: contextLoading } = useOrders();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(id ? getOrderById(id) : undefined);
  const [loading, setLoading] = useState(!order);

  const [showConfirmation, setShowConfirmation] = useState(confirmed);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    order?.status || "Placed"
  );
  const [estimatedTime, setEstimatedTime] = useState(29);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    durationValue: number;
    distanceValue: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const trackingFailedRef = useRef(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedTip, setSelectedTip] = useState<number | "other" | null>(null);
  const [customTip, setCustomTip] = useState("");

  // Real-time delivery tracking via WebSocket
  const {
    deliveryLocation,
    eta,
    distance,
    status: trackingStatus,
    orderStatus: socketOrderStatus, // Real-time order status from socket
    isConnected,
    lastUpdate,
    error: trackingError,
    reconnectAttempts,
    reconnect,
  } = useDeliveryTracking(id);

  // Seller locations for the order
  const [sellerLocations, setSellerLocations] = useState<any[]>([]);
  const [loadingSellerLocations, setLoadingSellerLocations] = useState(false);

  // Fetch order if not in context
  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;

      const existingOrder = getOrderById(id);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderStatus(existingOrder.status);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const fetchedOrder = await fetchOrderById(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        setOrderStatus(fetchedOrder.status);
      }
      setLoading(false);

      // Fetch initial tracking records for dynamic ETA
      if (!trackingFailedRef.current) {
        try {
          const trackingResponse = await getOrderTracking(id);
          if (trackingResponse?.success && trackingResponse?.data?.tracking?.eta) {
            console.log("📍 Initialized estimatedTime from DB tracking ETA:", trackingResponse.data.tracking.eta);
            setEstimatedTime(trackingResponse.data.tracking.eta);
          }
        } catch (err) {
          console.warn("Could not fetch initial order tracking ETA:", err);
          trackingFailedRef.current = true;
          // Retry after 1 minute
          setTimeout(() => {
            trackingFailedRef.current = false;
          }, 60000);
        }
      }
    };

    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch seller locations when order is loaded
  useEffect(() => {
    const fetchSellerLocations = async () => {
      if (!id || !order) return;

      // Only fetch if order has delivery boy assigned and status is before "Picked up" or "Out for Delivery"
      const shouldFetch =
        order.status &&
        order.status !== "Delivered" &&
        order.status !== "Cancelled" &&
        order.status !== "Picked up" &&
        order.status !== "Out for Delivery";

      if (shouldFetch) {
        try {
          setLoadingSellerLocations(true);
          const response = await getSellerLocationsForOrder(id);
          if (response.success && response.data) {
            setSellerLocations(response.data || []);
          }
        } catch (err) {
          console.error("Failed to fetch seller locations:", err);
        } finally {
          setLoadingSellerLocations(false);
        }
      }
    };

    fetchSellerLocations();
  }, [id, order?.status]);

  // Update orderStatus when order state changes
  useEffect(() => {
    if (order) {
      setOrderStatus(order.status);
    }
  }, [order]);

  // Real-time order status updates from socket
  useEffect(() => {
    if (socketOrderStatus && socketOrderStatus !== orderStatus) {
      console.log("🔄 Real-time status update:", socketOrderStatus);
      setOrderStatus(socketOrderStatus as OrderStatus);

      // Re-fetch order to get complete updated data
      if (id) {
        fetchOrderById(id).then((fetchedOrder) => {
          if (fetchedOrder) {
            setOrder(fetchedOrder);
          }
        });
      }
    }
  }, [socketOrderStatus, orderStatus, id, fetchOrderById]);

  // Simulate order status progression
  useEffect(() => {
    if (confirmed && order) {
      const timer1 = setTimeout(() => {
        setShowConfirmation(false);
        setOrderStatus("Accepted");
      }, 3000);
      return () => clearTimeout(timer1);
    }
  }, [confirmed, order]);

  // Countdown timer
  useEffect(() => {
    if (orderStatus === "Accepted" || orderStatus === "On the way") {
      const timer = setInterval(() => {
        setEstimatedTime((prev) => Math.max(0, prev - 1));
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [orderStatus]);

  // Synchronize dynamic ETA updates from WebSocket tracking hook
  useEffect(() => {
    if (eta && eta > 0) {
      console.log("📍 Syncing estimatedTime to live WebSocket tracking ETA:", eta);
      setEstimatedTime(eta);
    }
  }, [eta]);

  // Check if order is eligible for customer cancellation
  const isCancellable = () => {
    if (!order) return false;
    if (["Delivered", "Cancelled", "Returned", "Rejected", "Out for Delivery", "Shipped"].includes(orderStatus)) {
      return false;
    }
    if (order.orderType === "Scheduled" && order.scheduledDate) {
      try {
        const isMorning = order.scheduledTimeSlot === "Morning";
        const startHour = isMorning ? 6 : 18; // Morning: 6 AM, Evening: 6 PM
        const deliveryStartTime = new Date(order.scheduledDate);
        deliveryStartTime.setHours(startHour, 0, 0, 0);

        const oneHourBefore = new Date(deliveryStartTime.getTime() - 60 * 60 * 1000);
        const now = new Date();
        return now < oneHourBefore;
      } catch (e) {
        console.error("Scheduled cancellation window check error:", e);
        return false;
      }
    }
    return ["Placed", "Pending", "Received", "Accepted"].includes(orderStatus);
  };

  // Handler functions
  const handleRefresh = async () => {
    if (!id) return;
    setIsRefreshing(true);
    const fetchedOrder = await fetchOrderById(id);
    if (fetchedOrder) {
      setOrder(fetchedOrder);
      setOrderStatus(fetchedOrder.status);
    }
    // Add a small delay for the animation
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRefreshOtp = async () => {
    if (!id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshDeliveryOtp(id);
      // Re-fetch order to get updated OTP and expiry
      const fetchedOrder = await fetchOrderById(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        setOrderStatus(fetchedOrder.status);
      }
    } catch (error) {
      console.error("Failed to refresh OTP:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleShare = async () => {
    const friendlyId = formatOrderFriendly(order?.orderNumber, order?.id);
    const shareText = `Track my Healthy Delight order: Order #${friendlyId}`;
    const shareUrl = window.location.href;
    const shareData = {
      title: `Order #${friendlyId}`,
      text: shareText,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        setShowShareSheet(true);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error sharing with native sheet:", error);
        setShowShareSheet(true);
      }
    }
  };

  const handleShareOption = async (option: 'whatsapp' | 'telegram' | 'sms' | 'email' | 'copy') => {
    const friendlyId = formatOrderFriendly(order?.orderNumber, order?.id);
    const shareText = `Track my Healthy Delight order: Order #${friendlyId}`;
    const shareUrl = window.location.href;

    switch (option) {
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'sms':
        window.location.href = `sms:?body=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(`Healthy Delight Order Tracking - #${friendlyId}`)}&body=${encodeURIComponent(shareText + '\n\nTrack here: ' + shareUrl)}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy link:", err);
        }
        break;
    }
    setShowShareSheet(false);
  };

  const handleCallStore = () => {
    const storeNumber =
      sellerLocations[0]?.mobile ||
      order?.items?.[0]?.product?.seller?.mobile ||
      order?.seller?.phone ||
      "1234567890";
    window.location.href = `tel:${storeNumber}`;
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }

    if (!id) return;

    try {
      // TODO: Call backend API to cancel order
      await cancelOrder(id, cancellationReason);
      setOrderStatus("Cancelled" as any);
      setShowCancelModal(false);
      alert("Order cancelled successfully");
      // Refresh order to get updated status
      handleRefresh();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order");
    }
  };





  if (loading && !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-sm text-neutral-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">
            Order Not Found
          </h1>
          <button onClick={() => navigate(-1)}>
            <Button>Back</Button>
          </button>
        </div>
      </div>
    );
  }

  const displayETA = routeInfo ? Math.ceil(routeInfo.durationValue / 60) : (eta || estimatedTime);

  const statusConfig: Record<
    string,
    { title: string; subtitle: string; themeColor: string; textColor: string; bgColor: string; glowColor: string; badgeIcon: string }
  > = {
    Placed: {
      title: "Order placed",
      subtitle: "Order will reach you shortly",
      themeColor: "#f59e0b",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      glowColor: "shadow-amber-500/20",
      badgeIcon: "⏳",
    },
    Accepted: {
      title: "Preparing your order",
      subtitle: `Arriving in ${displayETA} mins`,
      themeColor: "#10b981",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      glowColor: "shadow-emerald-500/20",
      badgeIcon: "✓",
    },
    "On the way": {
      title: "Order picked up",
      subtitle: `Arriving in ${displayETA} mins`,
      themeColor: "#3b82f6",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      glowColor: "shadow-blue-500/20",
      badgeIcon: "🚴",
    },
    Delivered: {
      title: "Order delivered",
      subtitle: "Enjoy your order!",
      themeColor: "#10b981",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      glowColor: "shadow-emerald-500/20",
      badgeIcon: "🎉",
    },
    Received: {
      title: "Order received",
      subtitle: "Processing your order",
      themeColor: "#f59e0b",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      glowColor: "shadow-amber-500/20",
      badgeIcon: "⏳",
    },
    Pending: {
      title: "Order pending",
      subtitle: "Waiting for confirmation",
      themeColor: "#f59e0b",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      glowColor: "shadow-amber-500/20",
      badgeIcon: "⏳",
    },
    Processed: {
      title: "Order processed",
      subtitle: "Preparing for delivery",
      themeColor: "#10b981",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      glowColor: "shadow-emerald-500/20",
      badgeIcon: "⚙️",
    },
    Shipped: {
      title: "Order shipped",
      subtitle: "On the way to you",
      themeColor: "#3b82f6",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      glowColor: "shadow-blue-500/20",
      badgeIcon: "🚚",
    },
    "Out for Delivery": {
      title: "Out for delivery",
      subtitle: `Arriving in ${displayETA} mins`,
      themeColor: "#10b981",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      glowColor: "shadow-emerald-500/20",
      badgeIcon: "🛵",
    },
    Cancelled: {
      title: "Order cancelled",
      subtitle: "This order has been cancelled",
      themeColor: "#ef4444",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      glowColor: "shadow-red-500/20",
      badgeIcon: "✕",
    },
    Rejected: {
      title: "Order cancelled",
      subtitle: "Sorry! Seller has rejected this order. We sincerely apologize for the inconvenience.",
      themeColor: "#ef4444",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      glowColor: "shadow-red-500/20",
      badgeIcon: "✕",
    },
    Returned: {
      title: "Order returned",
      subtitle: "This order has been returned",
      themeColor: "#6b7280",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
      glowColor: "shadow-gray-500/20",
      badgeIcon: "↩",
    },
  };

  const currentStatus = statusConfig[orderStatus] || statusConfig["Received"];

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Order Confirmed Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center px-8">
              <AnimatedCheckmark delay={0.3} />
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="text-2xl font-bold text-gray-900 mt-6">
                Order Confirmed!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="text-gray-600 mt-2">
                Your order has been placed successfully
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="mt-8">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-3">
                  Loading order details...
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Signature Dark Header */}
      <motion.div
        className={`text-white sticky top-0 z-40 shadow-lg border-b border-white/5 transition-all duration-300 ${orderStatus === 'Cancelled' || orderStatus === 'Rejected'
            ? 'bg-gradient-to-br from-red-700 via-rose-800 to-red-700 shadow-red-900/10'
            : 'bg-gradient-to-br from-[#0a193b] via-[#11254f] to-[#0a193b] shadow-[#0a193b]/10'
          }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}>
        {/* Navigation bar */}
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <motion.button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-white/10 rounded-full transition-colors"
            whileTap={{ scale: 0.9 }}>
            <ArrowLeftIcon className="w-6 h-6 text-white/90" />
          </motion.button>
          <div className="flex flex-col items-center">
            <img src="/assets/logo.png" alt="Healthy Delight" className="h-7 object-contain brightness-0 invert" />
            <span className="text-[9px] text-white/45 font-bold tracking-widest mt-1.5">TRACK ORDER</span>
          </div>
          <motion.button
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}>
            <Share2Icon className="w-5 h-5 text-white/90" />
          </motion.button>
        </div>

        {/* Status section */}
        <div className="px-4 pb-5 pt-2 text-center max-w-lg mx-auto">
          <motion.h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-white bg-clip-text"
            key={currentStatus.title}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}>
            {currentStatus.title}
          </motion.h1>

          {/* Premium Glowing Status Pill */}
          <motion.div
            className="inline-flex items-center gap-2.5 bg-white/10 border border-white/10 backdrop-blur-md rounded-full px-6 py-2.5 shadow-inner"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}>
            <span className="text-[12px] font-bold text-white/90 flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-[10px] ${currentStatus.bgColor} ${currentStatus.textColor}`}>
                {currentStatus.badgeIcon}
              </span>
              {currentStatus.subtitle}
            </span>
            {(orderStatus === "Accepted" || orderStatus === "On the way") && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50" />
                <span className="text-[11px] font-bold text-emerald-400">On time</span>
              </>
            )}
            <motion.button
              onClick={handleRefresh}
              className="ml-1.5 p-1 hover:bg-white/10 rounded-full transition-colors"
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 0.5 }}>
              <RefreshCwIcon className="w-3.5 h-3.5 text-white/70" />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Map Section */}
      {!showConfirmation &&
        !["Delivered", "Cancelled", "Returned", "Rejected"].includes(orderStatus) && (
          <GoogleMapsTracking
            sellerLocations={sellerLocations.map((s) => ({
              lat: s.latitude,
              lng: s.longitude,
              name: s.storeName,
            }))}
            customerLocation={{
              lat:
                order?.deliveryAddress?.latitude ||
                order?.address?.latitude ||
                0,
              lng:
                order?.deliveryAddress?.longitude ||
                order?.address?.longitude ||
                0,
            }}
            deliveryLocation={deliveryLocation || undefined}
            isTracking={isConnected && !!deliveryLocation}
            showRoute={
              isConnected &&
              !!deliveryLocation &&
              !["Delivered", "Cancelled", "Returned", "Rejected"].includes(orderStatus)
            }
            routeOrigin={deliveryLocation || undefined}
            routeDestination={{
              lat:
                order?.deliveryAddress?.latitude ||
                order?.address?.latitude ||
                0,
              lng:
                order?.deliveryAddress?.longitude ||
                order?.address?.longitude ||
                0,
            }}
            routeWaypoints={
              order?.status === "Picked up" ||
                order?.status === "Out for Delivery"
                ? []
                : sellerLocations.map((s) => ({
                  lat: s.latitude,
                  lng: s.longitude,
                }))
            }
            destinationName={
              order?.status === "Picked up" ||
                order?.status === "Out for Delivery"
                ? order?.deliveryAddress?.address?.split(",")[0] ||
                order?.address?.split(",")[0] ||
                "Delivery Address"
                : sellerLocations.length > 0
                  ? "Sellers & Delivery Address"
                  : "Delivery Address"
            }
            onRouteInfoUpdate={setRouteInfo}
            lastUpdate={lastUpdate}
          />
        )}

      {/* Tracking Error Display */}
      {trackingError && (
        <div className="mx-4 mt-2 px-4 py-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-center gap-2">
          <span>⚠️</span>
          <span>{trackingError}</span>
        </div>
      )}

      {/* Delivery Partner Card */}
      {(order?.deliveryPartner || order?.deliveryOtp) && (
        <DeliveryPartnerCard
          partner={{
            name: order?.deliveryPartner?.name || "Delivery Partner",
            phone: order?.deliveryPartner?.phone,
            profileImage: order?.deliveryPartner?.profileImage,
            vehicleNumber: order?.deliveryPartner?.vehicleNumber,
          }}
          eta={displayETA}
          distance={routeInfo ? routeInfo.distanceValue : distance}
          isTracking={isConnected && !!deliveryLocation}
          deliveryOtp={order?.deliveryOtp}
          status={orderStatus}
          deliveredAt={order?.deliveredAt}
          createdAt={order?.createdAt}
          onCall={() => {
            const phone = order?.deliveryPartner?.phone || "1234567890";
            window.location.href = `tel:${phone}`;
          }}
        />
      )}

      {/* Scrollable Content */}
      <div className="px-4 py-4 space-y-4 pb-24 max-w-lg mx-auto">
        {/* Delivery Partner Assignment - Only show if no partner assigned yet */}
        {!order?.deliveryPartner && !["Cancelled", "Rejected"].includes(orderStatus) && (
          <motion.div
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm shadow-slate-100/50 flex items-center gap-4 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 shadow-sm border border-amber-100">
              <span className="text-2xl animate-bounce">🥛</span>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm tracking-tight leading-snug">
                {order?.status === "Placed" || order?.status === "Accepted"
                  ? "Assigning delivery partner shortly"
                  : "Preparing your order"}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5 leading-normal">
                Our sellers are putting extra love in preparing your order
              </p>
            </div>
          </motion.div>
        )}

        {/* Delivery Partner Safety */}
        {!["Cancelled", "Rejected"].includes(orderStatus) && (
          <motion.div
            className="w-full bg-white border border-slate-100 rounded-2xl p-5 shadow-sm shadow-slate-100/50 flex items-center gap-4 relative overflow-hidden text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100">
              <ShieldIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm tracking-tight leading-snug">
                Delivery Partner Safety
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5 leading-normal">
                100% vaccinated partners practicing contactless, clean delivery.
              </p>
            </div>
          </motion.div>
        )}

        {/* Delivery Details Banner */}
        {!["Cancelled", "Rejected"].includes(orderStatus) && (
          <motion.div
            className="bg-gradient-to-r from-amber-50/60 to-orange-50/60 border border-amber-100 rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm shadow-amber-500/2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}>
            <span className="text-sm">✨</span>
            <p className="text-[#0a193b] text-[11px] font-bold tracking-wider uppercase">
              All your delivery details in one place
            </p>
          </motion.div>
        )}

        {/* Contact & Address Section */}
        <motion.div
          className="bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}>
          <SectionItem
            title={`${order.address?.name || order.user?.name || user?.name || "Customer"} • ${order.address?.phone || order.user?.phone || user?.phone || "9XXXXXXXX"}`}
            subtitle="Registered contact number for delivery partner calls"
          />
          <SectionItem
            title="Delivery Location"
            subtitle={
              order.address
                ? `${order.address.address}, ${order.address.city}, ${order.address.state || ""}`
                : "Add delivery address"
            }
          />
        </motion.div>

        {/* Store & Items Section */}
        <motion.div
          className="bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}>

          {/* Store Info header */}
          <div className="flex items-center gap-4.5 p-6 border-b border-dashed border-slate-100 bg-slate-50/30">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#0a193b] text-base tracking-tight leading-snug">
                {sellerLocations[0]?.storeName || order?.items?.[0]?.product?.seller?.storeName || "Healthy Delight Kitchen"}
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 leading-normal uppercase tracking-wider">
                {sellerLocations[0]?.city || sellerLocations[0]?.address || "Local Kitchen Outlet"}
              </p>
            </div>
            <motion.button
              className="w-10 h-10 rounded-xl bg-green-50/80 border border-green-100 flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm text-green-700 hover:bg-green-100 transition-colors"
              whileTap={{ scale: 0.9 }}
              onClick={handleCallStore}>
              <PhoneIcon className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Order items detail row */}
          <div
            className="p-6 hover:bg-slate-50/50 transition-colors"
            onClick={() => setShowItemsModal(true)}
            style={{ cursor: "pointer" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0a193b]/5 flex items-center justify-center flex-shrink-0 border border-[#0a193b]/5 shadow-sm shadow-[#0a193b]/2">
                <ReceiptIcon className="w-5 h-5 text-[#0a193b]/80" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 text-sm tracking-tight">
                    Order Details
                  </p>
                  <span className="text-xs font-black text-[#0a193b] mr-2 bg-[#0a193b]/5 px-2 py-0.5 rounded-lg border border-[#0a193b]/10">
                    ₹{order.total?.toFixed(0) || "0"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#0a193b]/60 mt-0.5">
                  ID: #{formatOrderFriendly(order.orderNumber, order.id)}
                </p>
                <div className="mt-3 space-y-2">
                  {order.items?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                      <span className="w-4 h-4 rounded border border-emerald-500/80 flex items-center justify-center bg-emerald-50/50 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      </span>
                      <span className="truncate">
                        <span className="font-extrabold text-slate-700">{item.quantity}</span> x{" "}
                        {item.product?.name || item.productName || "Delight Item"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-slate-400 self-center" />
            </div>
          </div>
        </motion.div>



        {/* Premium Quick Actions */}
        <motion.div
          className="flex flex-col gap-3 pt-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}>

          {isCancellable() && (
            <Button
              onClick={() => setShowCancelModal(true)}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Cancel Order
            </Button>
          )}

          <div className="flex gap-3 w-full">
            {order?.invoiceEnabled ? (
              <Link to={`/invoice/${id}`} className="flex-1">
                <Button className="w-full bg-gradient-to-r from-[#0a193b] to-[#122b5e] hover:from-[#122b5e] hover:to-[#0a193b] text-white font-bold py-2.5 rounded-xl shadow-lg shadow-[#0a193b]/10 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  View Invoice
                </Button>
              </Link>
            ) : (
              <div className="flex-1">
                <Button
                  className="w-full bg-slate-200 border border-slate-300 text-slate-400 font-semibold py-2.5 rounded-xl cursor-not-allowed"
                  disabled
                  title="Invoice will be available after delivery is completed">
                  Invoice Unavailable
                </Button>
              </div>
            )}
            <Link to="/order-again" className="flex-1">
              <Button variant="outline" className="w-full border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl transition-colors cursor-pointer">
                All Orders
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCancelModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2">
                Cancel Order
              </h2>
              <p className="text-xs font-medium text-slate-500 mb-4 leading-normal">
                Are you sure you want to cancel this order? Please share your reason to help us improve:
              </p>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium text-slate-700 placeholder-slate-400"
                rows={3}
                placeholder="Share your feedback..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                  onClick={() => setShowCancelModal(false)}>
                  Keep Order
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                  onClick={handleCancelOrder}>
                  Cancel Order
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Order Items Detail Modal */}
      <AnimatePresence>
        {showItemsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowItemsModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-[75vh] overflow-y-auto shadow-2xl border border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-4">
                Order Items
              </h2>
              <div className="space-y-4">
                {order?.items?.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex gap-3.5 border-b border-dashed border-slate-100 pb-4 last:border-0">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden">
                      {item.product?.mainImage ? (
                        <img
                          src={item.product.mainImage}
                          alt={
                            item.product?.name || item.productName || "Product"
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm tracking-tight leading-snug">
                        {item.product?.name || item.productName}
                      </p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">
                        Qty: {item.quantity}
                      </p>
                      {item.variant && (
                        <p className="text-[10px] font-bold text-[#0a193b]/60 bg-[#0a193b]/5 inline-block px-1.5 py-0.5 rounded-md mt-1">{item.variant}</p>
                      )}
                      <p className="text-sm font-extrabold text-slate-800 mt-1.5">
                        ₹
                        {item.total?.toFixed(0) ||
                          (item.unitPrice * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-5 bg-[#0a193b] hover:bg-[#122b5e] text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors shadow-lg shadow-[#0a193b]/10"
                onClick={() => setShowItemsModal(false)}>
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Bottom Share Sheet Fallback */}
      <AnimatePresence>
        {showShareSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowShareSheet(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl border-t border-slate-100/80 z-10 overflow-hidden">
              
              {/* Drag indicator handle */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

              <h2 className="text-xl font-black text-slate-800 text-center tracking-tight mb-1">
                Share Order Tracking
              </h2>
              <p className="text-xs font-semibold text-slate-400 text-center mb-6">
                Share tracking link via available apps
              </p>

              {/* Share Apps Grid */}
              <div className="grid grid-cols-5 gap-3 mb-6 px-2">
                {/* WhatsApp */}
                <button
                  onClick={() => handleShareOption('whatsapp')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-11.758c.241.678.898 2.5 1.018 2.741.12.242.196.417.12.567-.075.15-.376.301-.527.452-.15.15-.327.316-.48.452-.178.158-.363.33-.157.678.206.348.916 1.507 1.963 2.438 1.35 1.198 2.486 1.568 2.837 1.719.351.15.556.12.766-.12.21-.24.902-1.053 1.143-1.413.241-.36.481-.3.812-.18.331.12 2.102 1.053 2.463 1.233.36.18.601.27.69.421.09.15.09.87-.27 1.23-.36.36-2.102 2.102-2.823 2.102-.72 0-1.652-.27-4.63-1.472-3.626-1.458-5.962-5.185-6.143-5.426-.18-.241-1.442-1.923-1.442-3.67 0-1.747.902-2.607 1.222-2.952.32-.345.702-.435.932-.435.23 0 .461.002.662.012.21.01.491-.037.766.632z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={() => handleShareOption('telegram')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500 hover:bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.917-1.123 6.452-1.603 8.981-.203 1.071-.628 1.43-1.011 1.465-.831.077-1.461-.548-2.266-1.075-1.258-.826-1.968-1.341-3.19-2.146-1.411-.931-.497-1.442.308-2.278.211-.219 3.882-3.563 3.957-3.88.009-.04-.002-.187-.079-.255-.078-.068-.192-.045-.275-.026-.118.027-2.001 1.272-5.642 3.731-.533.366-1.017.545-1.451.535-.479-.01-1.401-.271-2.086-.493-.84-.272-1.507-.416-1.449-.878.03-.241.362-.488.997-.74 3.9-1.696 6.5-2.818 7.8-3.363 3.711-1.554 4.48-1.825 4.982-1.834.11-.002.356.025.516.155.134.109.171.256.183.359.012.096.015.289.006.398z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Telegram</span>
                </button>

                {/* SMS */}
                <button
                  onClick={() => handleShareOption('sms')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">SMS</span>
                </button>

                {/* Email */}
                <button
                  onClick={() => handleShareOption('email')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Email</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={() => handleShareOption('copy')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-800 flex items-center justify-center shadow-lg shadow-slate-700/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Copy Link</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowShareSheet(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all duration-200 cursor-pointer">
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copied Toast Banner */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-full shadow-xl border border-white/10 flex items-center gap-2">
            <span className="text-emerald-400 text-sm">✓</span>
            <span>Link copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
