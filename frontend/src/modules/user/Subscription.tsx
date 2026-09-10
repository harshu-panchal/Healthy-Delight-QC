import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "../../hooks/useLocation";
import { useAuth } from "../../context/AuthContext";
import logo from "../../../assets/logo.png";
import {
  getPublicSubscriptionPlans,
  getMySubscription,
  purchaseSubscription,
  verifySubscriptionPayment,
  pauseSubscriptionApi,
  resumeSubscriptionApi,
  cancelSubscriptionApi,
  changeSubscriptionSlotApi,
  SubscriptionPlan,
  UserSubscription,
} from "../../services/api/customerSubscriptionService";
import { getCategories, Category as UICategory } from "../../services/api/customerProductService";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  all: '🌟',
  'cow milk': '🥛',
  'buffalo milk': '🐃',
  curd: '🥣',
  ghee: '🧈',
  paneer: '🧀',
  butter: '🧈',
  buttermilk: '🥛',
  cream: '🥣',
  organic: '🌿',
};

const getCategoryIcon = (cat: string) => {
  const lower = (cat || '').toLowerCase().trim();
  for (const [key, icon] of Object.entries(DEFAULT_CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '🥛';
};

export default function Subscription() {
  const userLocation = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [dbCategories, setDbCategories] = useState<UICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<'morning' | 'evening' | 'instant'>('morning');
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [isHeaderSolid, setIsHeaderSolid] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isChangingSlot, setIsChangingSlot] = useState<boolean>(false);
  const [newSlotSelection, setNewSlotSelection] = useState<'morning' | 'evening'>('morning');
  const [updatingSlot, setUpdatingSlot] = useState<boolean>(false);

  // Scroll Listener for Dynamic Header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Format location display text
  const locationDisplayText =
    userLocation?.location?.address ||
    (userLocation?.location?.city && userLocation?.location?.state
      ? `${userLocation.location.city}, ${userLocation.location.state}`
      : userLocation?.location?.city || "");

  // Load public plans, categories, and my active subscription
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch plans and categories in parallel
      const [fetchedPlans, catRes] = await Promise.allSettled([
        getPublicSubscriptionPlans(),
        getCategories(),
      ]);

      if (fetchedPlans.status === 'fulfilled') {
        const plansData = fetchedPlans.value || [];
        setPlans(plansData);
        if (plansData.length > 0) {
          setSelectedPlanId(plansData[0]._id);
        }
      }

      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        setDbCategories(catRes.value.data);
      }

      // Fetch active subscription if user is logged in
      if (isAuthenticated) {
        try {
          const mySub = await getMySubscription();
          setActiveSubscription(mySub);
        } catch (err) {
          console.log("No active subscription or user unauthenticated.");
          setActiveSubscription(null);
        }
      }
    } catch (err: any) {
      console.error("Error loading subscription data:", err);
      showToast('error', 'Failed to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleVoiceSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // @ts-expect-error Window interface lacks speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('error', "Your browser does not support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      console.error("Speech recognition error");
      setIsListening(false);
    };

    recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
      const speechResult = event.results[0][0].transcript;
      navigate(`/search?q=${encodeURIComponent(speechResult.trim())}`);
    };

    recognition.start();
  };

  const selectedPlan = plans.find((p) => p._id === selectedPlanId) || plans[0];

  // Helper to load Razorpay SDK dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle Subscription Purchase & Payment
  const handlePurchase = async () => {
    // Instant Delivery: Route directly to single-purchase product or catalog
    if (selectedSlot === 'instant') {
      const prodId =
        selectedPlan?.productId && typeof selectedPlan.productId === 'object'
          ? (selectedPlan.productId as any)._id
          : selectedPlan?.productId;

      if (prodId) {
        navigate(`/product/${prodId}`);
      } else {
        navigate('/search?q=milk');
      }
      return;
    }

    if (!isAuthenticated) {
      showToast('error', 'Please log in to purchase a milk subscription.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    if (!selectedPlan) {
      showToast('error', 'Please select a subscription plan.');
      return;
    }

    if (!selectedSlot || !['morning', 'evening'].includes(selectedSlot)) {
      showToast('error', 'Please select a delivery slot (Morning or Evening).');
      return;
    }

    try {
      setPurchasing(true);

      // Step 1: Initiate purchase on backend
      const purchaseData = await purchaseSubscription(selectedPlan._id, selectedSlot);

      // Step 2: Load Razorpay SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        showToast('error', 'Failed to load payment gateway. Please check your connection.');
        setPurchasing(false);
        return;
      }

      // Step 3: Open Razorpay checkout modal
      const options = {
        key: purchaseData.razorpayKey,
        amount: purchaseData.amount,
        currency: purchaseData.currency || 'INR',
        name: 'Healthy Delight Dairys',
        description: `${selectedPlan.name} Milk Subscription`,
        order_id: purchaseData.razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || user?.mobile || '',
        },
        theme: {
          color: '#0a193b',
        },
        handler: async function (response: any) {
          try {
            // Step 4: Verify payment on backend
            const activeSub = await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: selectedPlan._id,
              deliverySlot: selectedSlot,
            });

            setActiveSubscription(activeSub);
            showToast('success', 'Subscription activated successfully! Fresh milk will be delivered to your doorstep.');
          } catch (err: any) {
            console.error('Payment verification failed:', err);
            showToast('error', err.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setPurchasing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPurchasing(false);
            showToast('error', 'Payment cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Purchase initiation failed:', err);
      showToast('error', err.response?.data?.message || 'Failed to initiate purchase. Please try again.');
      setPurchasing(false);
    }
  };

  const handlePause = async () => {
    try {
      setPurchasing(true);
      const updated = await pauseSubscriptionApi();
      setActiveSubscription(updated);
      showToast('success', 'Subscription paused successfully.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to pause subscription.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleResume = async () => {
    try {
      setPurchasing(true);
      const updated = await resumeSubscriptionApi();
      setActiveSubscription(updated);
      showToast('success', 'Subscription resumed successfully! End date extended.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to resume subscription.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your milk subscription? This action cannot be undone.')) {
      return;
    }
    try {
      setPurchasing(true);
      const updated = await cancelSubscriptionApi();
      setActiveSubscription(updated);
      showToast('success', 'Subscription cancelled.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to cancel subscription.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleOpenSlotModal = () => {
    if (activeSubscription) {
      setNewSlotSelection(activeSubscription.deliverySlot || 'morning');
      setIsChangingSlot(true);
    }
  };

  const handleConfirmSlotChange = async () => {
    if (!activeSubscription) return;
    if (newSlotSelection === activeSubscription.deliverySlot) {
      setIsChangingSlot(false);
      return;
    }

    try {
      setUpdatingSlot(true);
      const updated = await changeSubscriptionSlotApi(newSlotSelection);
      setActiveSubscription(updated);
      setIsChangingSlot(false);
      showToast(
        'success',
        `Delivery slot changed to ${newSlotSelection === 'morning' ? 'Morning (6:00 AM - 9:00 AM)' : 'Evening (6:00 PM - 9:00 PM)'}! Takes effect from your next delivery.`
      );
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update delivery slot.');
    } finally {
      setUpdatingSlot(false);
    }
  };

  const handleOrderInstantExtra = () => {
    if (!activeSubscription) return;
    const prodId =
      activeSubscription.productId && typeof activeSubscription.productId === 'object'
        ? (activeSubscription.productId as any)._id
        : activeSubscription.productId ||
          (activeSubscription.plan?.productId && typeof activeSubscription.plan.productId === 'object'
            ? (activeSubscription.plan.productId as any)._id
            : activeSubscription.plan?.productId);

    if (prodId) {
      navigate(`/product/${prodId}`);
    } else {
      navigate('/search?q=milk');
    }
  };

  const getBadgeStyle = (idx: number) => {
    const styles = [
      "bg-teal-500/10 text-teal-700 border-teal-200",
      "bg-blue-500/10 text-blue-700 border-blue-200",
      "bg-amber-500/10 text-amber-700 border-amber-200",
      "bg-purple-500/10 text-purple-700 border-purple-200",
    ];
    return styles[idx % styles.length];
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const subset = plans.filter((p) => {
      if (categoryId === 'All') return true;
      const cat = p.productCategory || 'Cow Milk';
      return cat.toLowerCase() === categoryId.toLowerCase();
    });
    if (subset.length > 0 && !subset.some(p => p._id === selectedPlanId)) {
      setSelectedPlanId(subset[0]._id);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (selectedCategory === 'All') return true;
    const cat = p.productCategory || 'Cow Milk';
    return cat.toLowerCase() === selectedCategory.toLowerCase();
  });

  const getCategoryVisual = (catId: string, sizeClass = 'w-5 h-5') => {
    const found = dbCategories.find(
      (c) => c.name.toLowerCase() === (catId || '').toLowerCase()
    );
    if (found?.image) {
      return (
        <img
          src={found.image}
          alt={catId}
          className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0`}
        />
      );
    }
    return null;
  };

  const getCategoryTabVisual = (catId: string, sizeClass = 'w-5 h-5') => {
    const found = dbCategories.find(
      (c) => c.name.toLowerCase() === (catId || '').toLowerCase()
    );
    if (found?.image) {
      return (
        <img
          src={found.image}
          alt={catId}
          className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0`}
        />
      );
    }
    return <span className="shrink-0 leading-none">{catId === 'All' ? '🌟' : getCategoryIcon(catId)}</span>;
  };

  // Dynamically compute category tabs from plans
  const baseCategories = ['All', 'Cow Milk', 'Buffalo Milk', 'Curd', 'Ghee'];
  const planCategories = Array.from(new Set(plans.map((p) => p.productCategory || 'Cow Milk')));
  const combinedCategoryIds = Array.from(new Set([...baseCategories, ...planCategories]));

  const categoryTabs = combinedCategoryIds
    .filter((catId) => catId === 'All' || plans.some((p) => (p.productCategory || 'Cow Milk').toLowerCase() === catId.toLowerCase()))
    .map((catId) => ({
      id: catId,
      label: catId === 'All' ? 'All Plans' : catId === 'Curd' ? 'Fresh Curd' : catId === 'Ghee' ? 'Desi Ghee' : catId,
      visual: getCategoryTabVisual(catId, 'w-5 h-5'),
    }));

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col pt-[160px] md:pt-[2px]">
      {/* Premium Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8f6f2] to-[#f6f1e6] -z-10" />

      {/* Decorative Texture Overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none -z-5"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }}
      />

      {/* Premium Home-Style Fixed Header (MOBILE ONLY) */}
      <header
        className="md:hidden fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: isHeaderSolid
            ? '#0a193b'
            : 'linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.9) 30%, rgba(10, 25, 59, 0.7) 60%, rgba(10, 25, 59, 0.4) 85%, rgba(252, 250, 247, 0) 100%)',
          boxShadow: isHeaderSolid ? "0 12px 24px rgba(0,0,0,0.12)" : "none",
          paddingBottom: isHeaderSolid ? '8px' : '20px',
          borderBottomLeftRadius: isHeaderSolid ? '20px' : '0px',
          borderBottomRightRadius: isHeaderSolid ? '20px' : '0px',
        }}
      >
        <div className="px-5 md:px-10 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            <div className="flex items-center gap-3 md:gap-8 flex-1 min-w-0">
              <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                <button
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all border border-white/20 text-white shadow-lg"
                  aria-label="Go back"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18L9 12L15 6" />
                  </svg>
                </button>
                <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                  <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105" />
                </div>
              </div>

              {locationDisplayText && (
                <div onClick={() => navigate('/account')} className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 max-w-[130px] sm:max-w-[240px] md:max-w-md group overflow-hidden">
                  <div className="p-1.5 rounded-full bg-white/10 text-white/90 group-hover:bg-white/20 transition-all border border-white/20 hidden sm:flex">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 leading-none mb-0.5">Delivery to</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm font-bold text-white/95 truncate group-hover:text-white transition-colors">{locationDisplayText}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-white transition-colors flex-shrink-0">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/account')}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all shadow-lg"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 md:px-10 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              if (input.value.trim()) navigate(`/search?q=${encodeURIComponent(input.value.trim())}`);
            }}
            className="w-full md:max-w-2xl md:mx-auto h-12 md:h-13 bg-white rounded-2xl flex items-center gap-4 px-5 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 focus-within:ring-4 focus-within:ring-primary-500/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a193b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder={isListening ? "Listening... Speak now" : "Search for plans and benefits..."}
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-neutral-800 placeholder-slate-400"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`p-2 -mr-1 rounded-full transition-all flex items-center justify-center shrink-0 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse ring-4 ring-red-200 shadow-md"
                  : "text-[#0a193b]/60 hover:text-[#0a193b] hover:bg-neutral-100"
              }`}
              aria-label="Voice search"
              title={isListening ? "Listening..." : "Search by voice"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 p-4 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-3 border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-rose-900 text-rose-100 border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400 shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-400 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span className="flex-1">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full py-12 md:py-6 px-5 md:px-10 mb-6 relative overflow-hidden flex flex-col items-center text-center"
      >
        <div className="relative z-10 max-w-4xl">
          <h2 className="text-3xl md:text-5xl font-black text-[#0a193b] leading-tight mb-4">
            Healthy Delight <span className="text-[#c5a059]">Milk Subscription</span>
          </h2>
          <p className="text-[16px] md:text-[18px] text-neutral-800/80 font-bold max-w-2xl mx-auto leading-relaxed">
            Fresh organic A2 milk delivered right to your doorstep twice daily. Flexible schedule, free extra days, and full control.
          </p>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="relative z-10 pb-20 px-5 md:px-10 lg:px-12 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0a193b]/20 border-t-[#0a193b] rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-600">Loading subscription plans & details...</p>
          </div>
        ) : activeSubscription ? (
          /* ==================== ACTIVE SUBSCRIPTION CARD VIEW ==================== */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto bg-white rounded-3xl p-6 md:p-10 border-2 border-[#0a193b] shadow-[0_20px_50px_rgba(10,25,59,0.15)] relative overflow-hidden"
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Subscription
                </span>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <h3 className="text-2xl md:text-3xl font-black text-[#0a193b]">
                    {activeSubscription.plan?.name || "Subscription Plan"}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {getCategoryVisual(activeSubscription.productCategory || 'Cow Milk', 'w-4 h-4')}
                    <span>
                      {activeSubscription.productCategory === 'Buffalo Milk' ? '🐃 Buffalo Milk' :
                       activeSubscription.productCategory === 'Curd' ? '🥣 Fresh Curd' :
                       activeSubscription.productCategory === 'Ghee' ? '🧈 Desi Ghee' :
                       activeSubscription.productCategory === 'Cow Milk' ? '🥛 Cow Milk' :
                       `${getCategoryIcon(activeSubscription.productCategory || '')} ${activeSubscription.productCategory || 'Milk'}`}
                    </span>
                  </span>
                </div>
                {/* Linked Product for active subscription if available */}
                {(() => {
                  const linkedProd: any =
                    (activeSubscription.productId && typeof activeSubscription.productId === 'object'
                      ? activeSubscription.productId
                      : activeSubscription.plan?.productId && typeof activeSubscription.plan.productId === 'object'
                      ? activeSubscription.plan.productId
                      : null);
                  if (!linkedProd) return null;
                  return (
                    <div className="flex items-center gap-2 mt-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200/70 w-fit">
                      {linkedProd.mainImage && (
                        <img src={linkedProd.mainImage} alt="" className="w-6 h-6 rounded-lg object-cover" />
                      )}
                      <span className="text-xs font-bold text-slate-700">
                        🔗 {linkedProd.productName}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="text-right">
                <span className="text-2xl md:text-3xl font-black text-[#0a193b]">₹{activeSubscription.price}</span>
                <p className="text-xs font-bold text-slate-400 capitalize">{activeSubscription.plan?.durationInDays} Days Plan</p>
              </div>
            </div>

            {/* Subscription Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#f8f6f2] p-4 rounded-2xl border border-slate-200/60">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Daily Quota</span>
                <p className="text-lg font-black text-[#0a193b]">
                  {activeSubscription.bottlesPerDay} {activeSubscription.packageType || 'Item'}{activeSubscription.bottlesPerDay > 1 ? (activeSubscription.packageType?.endsWith('s') ? '' : 's') : ''}
                  {activeSubscription.unit && activeSubscription.unit.toLowerCase() !== (activeSubscription.packageType || '').toLowerCase() && (
                    <span className="text-sm font-normal text-slate-500 ml-1">({activeSubscription.unit})</span>
                  )}{' '}
                  / day
                </p>
              </div>

              <div className="bg-[#f8f6f2] p-4 rounded-2xl border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Delivery Slot</span>
                    {activeSubscription.status === 'active' && (
                      <button
                        type="button"
                        onClick={handleOpenSlotModal}
                        className="text-[11px] font-bold text-primary-700 hover:text-primary-900 bg-white hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs transition-colors flex items-center gap-1"
                        title="Change delivery slot for upcoming drops"
                      >
                        <span>🔄</span> Change
                      </button>
                    )}
                  </div>
                  <p className="text-lg font-black text-[#0a193b] capitalize flex items-center gap-2">
                    {activeSubscription.deliverySlot === 'morning' ? '🌅 Morning' : '🌙 Evening'}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {activeSubscription.deliverySlot === 'morning' ? '6:00 AM - 9:00 AM' : '6:00 PM - 9:00 PM'}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    Daily scheduled drop
                  </span>
                </div>
              </div>

              <div className="bg-[#f8f6f2] p-4 rounded-2xl border border-slate-200/60">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Free Days</span>
                <p className="text-lg font-black text-emerald-700">
                  {activeSubscription.freeDaysUsed || 0} / {activeSubscription.freeDaysTotal || 0} Used
                </p>
              </div>
            </div>

            {/* Quick Action: Instant Extra Milk Delivery */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 border-2 border-amber-300/80 rounded-2xl p-5 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-300 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-[#0a193b] text-base">
                      Need Extra Milk Today?
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-xs">
                      Fresh milk in mins
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    Ran out of milk before your scheduled slot? Order extra bottles right now for fast doorstep delivery in minutes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOrderInstantExtra}
                className="shrink-0 px-5 py-3 rounded-xl bg-[#0a193b] hover:bg-[#122b5e] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 group"
              >
                <span>⚡ Order Extra Milk Now</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Delivery Timeline & Seller Info */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3 mb-8 text-sm font-semibold text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500">Start Date:</span>
                <span className="font-bold text-[#0a193b]">{new Date(activeSubscription.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500">End Date:</span>
                <span className="font-bold text-[#0a193b]">{new Date(activeSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {activeSubscription.seller && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Fulfilling Store:</span>
                  <span className="font-bold text-[#0a193b]">{activeSubscription.seller.storeName || 'Healthy Delight Partner Store'}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {activeSubscription.status === 'active' && (() => {
                const maxPause = activeSubscription.maxPauseDaysAllowed ?? 0;
                const usedPause = activeSubscription.totalPauseDaysUsed ?? 0;
                const limitReached = usedPause >= maxPause;
                return (
                  <div className="flex-1 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={handlePause}
                      disabled={purchasing || limitReached}
                      className={`w-full py-3.5 px-6 font-bold rounded-xl text-center shadow-lg transition-all ${
                        limitReached
                          ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      title={limitReached ? `Pause limit reached (${usedPause}/${maxPause} days used)` : undefined}
                    >
                      ⏸️ Pause Subscription
                    </button>
                    <span className="text-[11px] font-semibold text-slate-500 text-center">
                      {limitReached
                        ? `Pause limit reached (${usedPause}/${maxPause} days used)`
                        : `${usedPause} of ${maxPause} pause days used`}
                    </span>
                  </div>
                );
              })()}

              {activeSubscription.status === 'paused' && (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={purchasing}
                  className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center shadow-lg transition-all"
                >
                  ▶️ Resume Subscription
                </button>
              )}

              {activeSubscription.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={purchasing}
                  className="py-3.5 px-6 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-center transition-all"
                >
                  ❌ Cancel Subscription
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/account')}
                className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-center transition-all"
              >
                View Account
              </button>
            </div>

            {/* Slot Change Modal */}
            <AnimatePresence>
              {isChangingSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 relative z-10"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                      <div>
                        <h3 className="text-lg font-black text-[#0a193b]">Change Delivery Slot</h3>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          Select your preferred delivery shift
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChangingSlot(false)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 mb-5">
                      {/* Morning Slot option */}
                      <button
                        type="button"
                        onClick={() => setNewSlotSelection('morning')}
                        className={`w-full p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                          newSlotSelection === 'morning'
                            ? 'border-[#0a193b] bg-amber-50/50 shadow-md ring-2 ring-[#0a193b]/10'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-2xl">🌅</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#0a193b]">Morning Slot</span>
                            {activeSubscription.deliverySlot === 'morning' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-500 block">6:00 AM - 9:00 AM</span>
                        </div>
                      </button>

                      {/* Evening Slot option */}
                      <button
                        type="button"
                        onClick={() => setNewSlotSelection('evening')}
                        className={`w-full p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                          newSlotSelection === 'evening'
                            ? 'border-[#0a193b] bg-indigo-50/50 shadow-md ring-2 ring-[#0a193b]/10'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-2xl">🌙</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#0a193b]">Evening Slot</span>
                            {activeSubscription.deliverySlot === 'evening' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-500 block">6:00 PM - 9:00 PM</span>
                        </div>
                      </button>
                    </div>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl mb-5 flex items-start gap-2.5">
                      <span className="text-base leading-none">ℹ️</span>
                      <p className="text-xs text-amber-900 font-medium leading-relaxed">
                        Slot change takes effect starting from your next scheduled delivery.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsChangingSlot(false)}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSlotChange}
                        disabled={updatingSlot || newSlotSelection === activeSubscription.deliverySlot}
                        className="flex-1 py-3 px-4 rounded-xl bg-[#0a193b] hover:bg-[#122b5e] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {updatingSlot ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <span>Confirm Slot Change</span>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ==================== PLAN SELECTION & PURCHASE FLOW ==================== */
          <>
            {/* Multi-Product Category Selector */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="text-center mb-5">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100/90 px-3.5 py-1 rounded-full border border-emerald-200">
                  Select Product to Subscribe
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#0a193b] mt-2 tracking-tight">
                  Choose Your Subscription by Product
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Enjoy daily doorstep delivery of Pure Cow Milk, Rich Buffalo Milk, Fresh Curd, or Desi Ghee.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center justify-center gap-2 flex-wrap p-2 bg-white rounded-2xl shadow-sm border border-slate-200/80">
                {categoryTabs.map((tab) => {
                  const isActive = selectedCategory === tab.id;
                  const count = tab.id === 'All'
                    ? plans.length
                    : plans.filter(p => (p.productCategory || 'Cow Milk').toLowerCase() === tab.id.toLowerCase()).length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleCategorySelect(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#0a193b] text-white shadow-md scale-[1.02]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <span className="flex items-center justify-center">{tab.visual}</span>
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Empty State if category has no plans */}
            {filteredPlans.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-lg mx-auto mb-12">
                <div className="text-5xl mb-3">🥛</div>
                <h4 className="text-lg font-black text-[#0a193b]">No {selectedCategory} plans available right now</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 mb-6 leading-relaxed">
                  We are currently crafting fresh subscription options for this category. In the meantime, discover our other pure dairy subscription plans.
                </p>
                <button
                  type="button"
                  onClick={() => handleCategorySelect('All')}
                  className="px-5 py-2.5 bg-[#0a193b] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#122b5e] transition-colors"
                >
                  View All Available Plans
                </button>
              </div>
            ) : (
              /* Pricing Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-12">
                {filteredPlans.map((p, idx) => {
                  const isSelected = p._id === selectedPlanId;

                  // Dynamic packaging and unit calculation - zero hardcoding by category!
                  const rawPkg = (p.packageType || '').trim();
                  const rawUnit = (p.unit || '').trim();
                  const pkgType = rawPkg || (rawUnit && !['litre', 'l', 'ml', 'kg', 'g', 'gram'].includes(rawUnit.toLowerCase()) ? rawUnit : 'Bottle');
                  const pkgPlural = pkgType.endsWith('s')
                    ? pkgType
                    : (pkgType.endsWith('x') || pkgType.endsWith('ch') || pkgType.endsWith('sh'))
                    ? `${pkgType}es`
                    : `${pkgType}s`;
                  const displayPkg = p.bottlesPerDay > 1 ? pkgPlural : pkgType;

                  let sizeText = '';
                  if (rawUnit && rawUnit.toLowerCase() !== pkgType.toLowerCase()) {
                    const cleanUnit = rawUnit.replace(/\s*each\s*$/i, '').trim();
                    if (cleanUnit) {
                      sizeText = `(${cleanUnit} each)`;
                    }
                  }

                  const categoryLabel = p.productCategory ? p.productCategory.toLowerCase() : 'item';

                  return (
                    <motion.button
                      key={p._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setSelectedPlanId(p._id)}
                      className={`flex flex-col text-left p-6 md:p-8 rounded-[24px] transition-all duration-300 relative border-2 ${
                        isSelected
                          ? "bg-white border-[#0a193b] shadow-[0_20px_48px_rgba(10,25,59,0.12)] scale-[1.03] z-10"
                          : "bg-white/60 border-transparent hover:bg-white hover:border-[#0a193b]/20 shadow-sm"
                      }`}
                    >
                      {/* Visual Accent for Selected Plan */}
                      {isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a193b] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                          Selected
                        </div>
                      )}

                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getBadgeStyle(idx)}`}>
                            {p.durationInDays} DAYS PLAN
                          </span>
                          {isSelected && (
                            <div className="w-6 h-6 bg-[#0a193b] rounded-full flex items-center justify-center text-white shadow-md">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Product Category & Cadence Tag */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-3">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {getCategoryVisual(p.productCategory || 'Cow Milk', 'w-4 h-4')}
                            <span>
                              {p.productCategory === 'Buffalo Milk' ? '🐃 Buffalo Milk' :
                               p.productCategory === 'Curd' ? '🥣 Fresh Curd' :
                               p.productCategory === 'Ghee' ? '🧈 Desi Ghee' :
                               p.productCategory === 'All' ? '🌟 Dairy' :
                               p.productCategory === 'Cow Milk' ? '🥛 Cow Milk' :
                               `${getCategoryIcon(p.productCategory || '')} ${p.productCategory || 'Milk'}`}
                            </span>
                          </span>
                          {p.deliveryFrequency && p.deliveryFrequency !== 'daily' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 capitalize">
                              {p.deliveryFrequency}
                            </span>
                          )}
                        </div>

                        {/* Linked Product for Plan if present, or dynamic Category image */}
                        {p.productId && typeof p.productId === 'object' && p.productId.productName ? (
                          <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200/60 mb-3">
                            {p.productId.mainImage && (
                              <img
                                src={p.productId.mainImage}
                                alt={p.productId.productName}
                                className="w-9 h-9 rounded-lg object-cover shadow-xs border border-white shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">
                                Linked Product
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate block">
                                {p.productId.productName}
                              </span>
                            </div>
                          </div>
                        ) : (() => {
                          const catObj = dbCategories.find(c => c.name.toLowerCase() === (p.productCategory || 'Cow Milk').toLowerCase());
                          if (catObj?.image) {
                            return (
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200/60 mb-3">
                                <img
                                  src={catObj.image}
                                  alt={catObj.name}
                                  className="w-9 h-9 rounded-lg object-cover shadow-xs border border-white shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                                    Category
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 truncate block">
                                    {catObj.name}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="mb-6">
                          <h3 className="text-[18px] font-bold text-slate-800 uppercase tracking-tight mb-2">{p.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-[#0a193b]">₹{p.price}</span>
                            <span className="text-sm font-bold text-slate-400 capitalize">/ {p.durationInDays} days</span>
                          </div>
                        </div>

                        {/* Free Days Prominent Highlight */}
                        {p.freeDays > 0 && (
                          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                              +
                            </div>
                            <div>
                              <span className="text-xs font-black text-emerald-800 uppercase block leading-none">
                                {p.freeDays} Days Free Included
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-600">Included in this plan</span>
                            </div>
                          </div>
                        )}

                        <div className="flex-1 space-y-4 mb-4 text-sm font-semibold text-slate-600">
                          <div className="flex gap-3 items-start">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>
                              <strong>{p.bottlesPerDay} {displayPkg}</strong> {sizeText && <span>{sizeText} </span>}— fresh {categoryLabel} daily quota
                            </span>
                          </div>

                          <div className="flex gap-3 items-start">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                            <span>Free daily doorstep delivery</span>
                          </div>

                          {p.description && (
                            <div className="flex gap-3 items-start">
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </div>
                              <span>{p.description}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Delivery Option Selection Area */}
            <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-12">
              <h3 className="text-lg font-extrabold text-[#0a193b] mb-1 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="10" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Choose Delivery Option
              </h3>
              <p className="text-xs font-semibold text-slate-500 mb-5">
                Select a recurring daily schedule or get fresh milk delivered to your doorstep right now in minutes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Daily Morning Slot */}
                <button
                  type="button"
                  onClick={() => setSelectedSlot('morning')}
                  className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                    selectedSlot === 'morning'
                      ? 'border-[#0a193b] bg-amber-50/50 shadow-md ring-2 ring-[#0a193b]/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl">🌅</div>
                  <div>
                    <span className="font-bold text-sm text-[#0a193b] block">Daily Morning Slot</span>
                    <span className="text-xs font-semibold text-slate-500 block">6:00 AM - 9:00 AM</span>
                    <span className="text-[10px] text-amber-800 font-bold mt-1 inline-block bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                      Recurring Subscription
                    </span>
                  </div>
                </button>

                {/* 2. Daily Evening Slot */}
                <button
                  type="button"
                  onClick={() => setSelectedSlot('evening')}
                  className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                    selectedSlot === 'evening'
                      ? 'border-[#0a193b] bg-indigo-50/50 shadow-md ring-2 ring-[#0a193b]/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl">🌙</div>
                  <div>
                    <span className="font-bold text-sm text-[#0a193b] block">Daily Evening Slot</span>
                    <span className="text-xs font-semibold text-slate-500 block">6:00 PM - 9:00 PM</span>
                    <span className="text-[10px] text-indigo-800 font-bold mt-1 inline-block bg-indigo-100/70 px-2 py-0.5 rounded-full border border-indigo-200">
                      Recurring Subscription
                    </span>
                  </div>
                </button>

                {/* 3. Instant Delivery ("Fresh milk in mins") */}
                <button
                  type="button"
                  onClick={() => setSelectedSlot('instant')}
                  className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all relative overflow-hidden ${
                    selectedSlot === 'instant'
                      ? 'border-amber-500 bg-gradient-to-br from-amber-50/90 to-orange-50/90 shadow-md ring-2 ring-amber-400/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl">⚡</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-[#0a193b] block">Instant Delivery</span>
                    </div>
                    <span className="text-xs font-bold text-amber-700 block">Fresh milk in mins</span>
                    <span className="text-[10px] text-amber-900 font-bold mt-1 inline-block bg-amber-200/60 px-2 py-0.5 rounded-full border border-amber-300">
                      ⚡ 1-time drop right now
                    </span>
                  </div>
                </button>
              </div>

              {/* Instant Delivery Notice Banner */}
              {selectedSlot === 'instant' && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <span className="font-black text-sm block text-[#0a193b]">
                        Need milk right now? Fresh milk in mins
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        Skip recurring plans and get farm-fresh milk delivered to your doorstep right away in minutes.
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 shrink-0">
                    Instant One-Time Order
                  </span>
                </div>
              )}
            </div>

            {/* Global CTA Section */}
            <div className="flex flex-col items-center">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePurchase}
                disabled={purchasing || !selectedPlan || !selectedSlot}
                className={`w-full max-w-md h-16 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white font-bold flex items-center justify-between px-8 transition-all ${
                  selectedSlot === 'instant'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-[0_20px_60px_rgba(245,158,11,0.35)]'
                    : 'bg-[#0a193b] hover:bg-[#122b5e] shadow-[0_20px_60px_rgba(10,25,59,0.3)]'
                }`}
              >
                <div className="flex flex-col items-start leading-none gap-1.5 min-w-0">
                  <span className={`text-[10px] uppercase font-black tracking-widest ${selectedSlot === 'instant' ? 'text-amber-100' : 'text-[#c5a059]'}`}>
                    {purchasing ? 'Processing...' : selectedSlot === 'instant' ? 'Order Instantly' : 'Continue with'}
                  </span>
                  <span className="text-[16px] md:text-[17px] font-bold truncate max-w-[220px]">
                    {selectedSlot === 'instant'
                      ? 'Fresh milk in mins'
                      : (selectedPlan?.name || 'Selected Plan')}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {selectedSlot !== 'instant' && (
                    <span className="text-xl font-black">₹{selectedPlan?.price || 0}</span>
                  )}
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    {purchasing ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : selectedSlot === 'instant' ? (
                      <span className="text-lg">⚡</span>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </motion.button>

              <p className="mt-8 text-xs text-slate-700 font-bold flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {selectedSlot === 'instant'
                  ? 'Fast doorstep delivery dispatched immediately in minutes'
                  : 'Secure 256-bit encrypted Razorpay payment gateway'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
