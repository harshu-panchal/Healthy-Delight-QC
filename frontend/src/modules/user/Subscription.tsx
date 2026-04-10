import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "../../hooks/useLocation";
import logo from "../../../assets/logo.png";

type PlanId = "Quaterly" | "monthly" | "yearly";

export default function Subscription() {
  const userLocation = useLocation();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("Quaterly");
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);

  // Scroll Listener for Dynamic Header
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Format location display text
  const locationDisplayText = userLocation?.location?.address ||
    (userLocation?.location?.city && userLocation?.location?.state ? `${userLocation.location.city}, ${userLocation.location.state}` :
      (userLocation?.location?.city || ""));

  const plans = useMemo(
    () => [
      {
        id: "monthly" as const,
        title: "Monthly",
        price: "₹149",
        cadence: "/month",
        perks: [
          "Free delivery on all orders",
          "15% extra savings on selected",
          "Exclusive member-only trials",
        ],
        badge: "STARTER",
      },
      {
        id: "Quaterly" as const,
        title: "Quaterly",
        price: "₹499",
        cadence: "/quaterly",
        perks: [
          "Free delivery on all orders",
          "20% extra savings on selected",
          "Early access to new launches",
          "Priority Customer Support"
        ],
        badge: "BEST VALUE",
      },
      {
        id: "yearly" as const,
        title: "Yearly",
        price: "₹999",
        cadence: "/year",
        perks: [
          "Free delivery on all orders",
          "25% extra savings on selected",
          "Premium Member Hotline",
          "Free samples with every order"
        ],
        badge: "SAVE MORE",
      },
    ],
    []
  );

  const selected = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col pt-[160px] md:pt-[180px]">
      {/* Premium Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8f6f2] to-[#f6f1e6] -z-10" />

      {/* Decorative Texture Overlay (Optional, keep it very subtle) */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none -z-5" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }}></div>

      {/* Premium Home-Style Fixed Header */}
      <header
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300"
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
          <div className="flex items-center justify-between gap-6">
            {/* Nav & Logo & Location Container */}
            <div className="flex items-center gap-4 md:gap-8 flex-1 min-w-0">
              {/* Back & Logo */}
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
                  <span className="hidden lg:block text-xl font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                    Healthy Delight
                  </span>
                </div>
              </div>

              {/* Location (Only if available) */}
              {locationDisplayText && (
                <div onClick={() => navigate('/account')} className="flex items-center gap-2 cursor-pointer max-w-[150px] md:max-w-md group overflow-hidden">
                  <div className="p-1.5 rounded-full bg-white/10 text-white/90 group-hover:bg-white/20 transition-all border border-white/20 hidden sm:flex">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 leading-none mb-0.5">Delivery to</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white/95 truncate group-hover:text-white transition-colors">{locationDisplayText}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-white transition-colors">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Button */}
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

        {/* Home-Style Search Bar */}
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
              placeholder="Search for plans and benefits..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-neutral-800 placeholder-slate-400"
              autoComplete="off"
            />
          </form>
        </div>
      </header>


      {/* Modern Full-Width Hero Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full py-12 px-5 md:px-10 mb-6 relative overflow-hidden flex flex-col items-center text-center"
      >
        <div className="relative z-10 max-w-4xl">
          <h2 className="text-3xl md:text-5xl font-black text-[#0a193b] leading-tight mb-6">
            Healthy Delight <span className="text-[#c5a059]">Plus</span>
          </h2>
          <p className="text-[16px] md:text-[18px] text-neutral-800/80 font-bold max-w-2xl mx-auto leading-relaxed">
            Transform your health journey with absolute freedom. Get free delivery and premium extra savings on every single order.
          </p>
        </div>
      </motion.div>

      {/* Main Content Area (Rest of the plans) */}
      <div className="relative z-10 pb-20 px-5 md:px-10 lg:px-12 max-w-7xl mx-auto w-full">

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((p, idx) => {
            const isSelected = p.id === selectedPlan;
            const isBestValue = p.id === "Quaterly";

            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setSelectedPlan(p.id)}
                className={`flex flex-col text-left p-8 rounded-[24px] transition-all duration-300 relative border-2 ${
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
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      isBestValue ? "bg-amber-500/10 text-amber-600" : "bg-slate-500/10 text-slate-600"
                    }`}>
                      {p.badge}
                    </span>
                    {isSelected && (
                      <div className="w-6 h-6 bg-[#0a193b] rounded-full flex items-center justify-center text-white shadow-md">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="mb-10">
                    <h3 className="text-[17px] font-bold text-slate-800 uppercase tracking-tight mb-2">{p.title}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[#0a193b]">{p.price}</span>
                      <span className="text-sm font-bold text-slate-400 capitalize">{p.cadence}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-5 mb-10">
                    {p.perks.map((perk, pIdx) => (
                      <div key={pIdx} className="flex gap-4 items-start">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                        <span className="text-[14px] font-semibold text-slate-600 leading-tight">{perk}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-auto pt-8 border-t ${isSelected ? 'border-slate-100' : 'border-transparent'}`}>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Global CTA Section */}
        <div className="mt-20 flex flex-col items-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => alert("Payment flow not implemented in this demo.")}
            className="w-full max-w-md h-20 bg-[#0a193b] rounded-full text-white font-bold flex items-center justify-between px-10 shadow-[0_20px_60px_rgba(10,25,59,0.3)] hover:bg-[#122b5e] transition-all"
          >
            <div className="flex flex-col items-start leading-none gap-2">
              <span className="text-[11px] uppercase font-black tracking-widest text-[#c5a059]">Continue with</span>
              <span className="text-xl">{selected?.title} Plan</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black">{selected?.price}</span>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </motion.button>
          
          <p className="mt-8 text-xs text-slate-400 font-medium opacity-80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure 256-bit encrypted payment gateway
          </p>
        </div>
      </div>
    </div>
  );
}

