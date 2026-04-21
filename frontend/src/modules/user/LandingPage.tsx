import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import logo from "../../../assets/logo.png";
import bg from "../../../assets/bg.png";
import heroVideo from "../../../assets/landing/Hero_bg.mp4";
import { PurityPath } from "./components/PurityPath";
import appHome from "../../../assets/landing/app_home.png";
import appCategories from "../../../assets/landing/app_categories.png";
import appSubscription from "../../../assets/landing/app_subscription.png";
import imgFreshMilk from "../../../assets/landing/fresh_milk.jpg";
import imgCurd from "../../../assets/landing/curd.jpg";
import imgPaneer from "../../../assets/landing/paneer.jpg";
import imgGhee from "../../../assets/landing/ghee.jpg";
import imgDesserts from "../../../assets/landing/desserts.jpg";
import imgIceCreams from "../../../assets/landing/ice_creams.jpg";

// ─── Intersection-observer hook for scroll-reveal ───────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Reusable fade-up reveal wrapper ────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "100% Organic Sourcing",
    desc: "Directly from certified partner farms — no middlemen, no shortcuts, no compromise on purity.",
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Daily Doorstep Delivery",
    desc: "Your morning dairy essentials arrive fresh at your door before the first cup of chai.",
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Trusted Dairy Practices",
    desc: "Hygienic collection, cold-chain handling, and quality-tested at every step of the journey.",
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v4" strokeLinecap="round" />
        <circle cx="12" cy="15" r="1" fill="currentColor" />
      </svg>
    ),
    title: "Guaranteed Freshness",
    desc: "From farm to your family in under 24 hours. Every bottle, every batch — date-stamped and verified.",
  },
];

const PRODUCTS = [
  { image: imgFreshMilk, label: "Fresh Milk", desc: "Full cream, toned & skimmed" },
  { image: imgCurd, label: "Curd & Yogurt", desc: "Set, greek & flavoured" },
  { image: imgPaneer, label: "Paneer & Cheese", desc: "Soft, firm & aged varieties" },
  { image: imgGhee, label: "Butter & Ghee", desc: "Cultured, salted & pure" },
  { image: imgDesserts, label: "Desserts", desc: "Kheer, custard & puddings" },
  { image: imgIceCreams, label: "Ice Creams", desc: "Kulfi, gelato & scoops" },
];

const TRUST_ITEMS = [
  {
    icon: (
      <svg width="32" height="32" fill="none" stroke="#c5a059" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Sourced Fresh",
    desc: "Every product is collected from farms within 50 km — freshness is non-negotiable.",
  },
  {
    icon: (
      <svg width="32" height="32" fill="none" stroke="#c5a059" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="7" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 12v4M10 14h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Careful Handling",
    desc: "Cold-chain logistics ensure your dairy reaches you at the perfect temperature, every time.",
  },
  {
    icon: (
      <svg width="32" height="32" fill="none" stroke="#c5a059" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Consistent Delivery",
    desc: "Subscriptions that never miss a day. Your schedule, your quantities — fully flexible.",
  },
];

// ─── Counter Component ───────────────────────────────────────────────────────
function Counter({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const count = useMotionValue(0);
  const spring = useSpring(count, { stiffness: 45, damping: 15 });
  const display = useTransform(spring, (latest) => {
    const val = Math.round(latest);
    if (val >= 1000) return (val / 1000).toFixed(0) + "K" + suffix;
    return val + suffix;
  });

  return (
    <motion.span
      onViewportEnter={() => {
        if (!hasAnimated) {
          setTimeout(() => {
            count.set(value);
            setHasAnimated(true);
          }, delay * 1000);
        }
      }}
    >
      {display}
    </motion.span>
  );
}

// ─── Wave Divider Component ──────────────────────────────────────────────────
function WaveDivider({ fill, className = "", flip = false }: { fill: string; className?: string; flip?: boolean }) {
  return (
    <div className={`absolute left-0 w-full overflow-hidden leading-[0] z-10 ${flip ? 'rotate-180 top-[-1px]' : 'bottom-[-1px]'} ${className}`}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="relative block w-full h-[40px] md:h-[80px]"
        style={{ fill }}
      >
        <path d="M0,64 C240,140 480,0 720,64 C960,128 1200,32 1440,64 V128 H0 Z" />
      </svg>
    </div>
  );
}

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "Marketing Professional",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    quote: "Authentic, fresh, and reliable. The daily subscription has transformed my morning routine. I don't have to worry about quality or timing anymore.",
    rating: 5,
  },
  {
    name: "Arjun Mehta",
    role: "Health Coach",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop",
    quote: "I've personally visited their partner farms. The level of hygiene and animal care is unmatched in the industry. This is my only recommendation for pure dairy.",
    rating: 5,
  },
  {
    name: "Anjali Gupta",
    role: "Mother of Two",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
    quote: "My kids finally drink milk without complaining! The freshness in the curd and paneer is noticeably better than anything we find in supermarkets.",
    rating: 5,
  },
];

const FAQ_ITEMS = [
  {
    q: "What time do you deliver the dairy products?",
    a: "We prioritize freshness and convenience. All daily orders and subscriptions are delivered fresh to your doorstep before 7:00 AM every single morning.",
  },
  {
    q: "Are your products truly 100% organic?",
    a: "Yes. Every drop of milk and every dairy batch comes from certified partner farms that follow strict organic protocols, meaning no synthetic hormones or harmful pesticides.",
  },
  {
    q: "Can I pause or modify my subscription easily?",
    a: "Absolutely! Using the Healthy Delight app, you can pause, skip, or change your delivery quantities anytime before midnight for the next day's delivery.",
  },
  {
    q: "How do you ensure the cold chain maintenance?",
    a: "We use insulated, temperature-controlled logistics from the farm collection point right up to the final distribution hub to ensure perfect freshness.",
  },
  {
    q: "Is there a minimum order requirement?",
    a: "There is no minimum order! Whether you need one bottle of milk or a weekly supply of ghee, we are happy to deliver freshness to your door.",
  },
];

// ─── Phone SVG Mockup ────────────────────────────────────────────────────────
function PhoneMockup({ screenImg, className = "" }: { screenImg: string; className?: string }) {
  return (
    <div
      style={{
        filter: "drop-shadow(0 30px 60px rgba(10,25,59,0.25)) drop-shadow(0 8px 20px rgba(0,0,0,0.15))",
      }}
      className={`relative w-[260px] md:w-[280px] mx-auto ${className}`}
    >
      <svg viewBox="0 0 320 640" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        {/* Phone shell */}
        <rect x="4" y="4" width="312" height="632" rx="42" fill="#1a1a2e" />
        <rect x="8" y="8" width="304" height="624" rx="38" fill="#0f0f23" />
        <rect x="12" y="12" width="296" height="616" rx="35" fill="#0a193b" />

        {/* Status bar notch */}
        <rect x="120" y="16" width="80" height="16" rx="8" fill="#1a1a2e" />

        {/* Screen bg placeholder - changed from cream to navy to remove white box */}
        <rect x="12" y="34" width="296" height="594" rx="0" fill="#0a193b" />

        {/* Phone side buttons */}
        <rect x="0" y="160" width="4" height="50" rx="2" fill="#2a2a4a" />
        <rect x="316" y="140" width="4" height="35" rx="2" fill="#2a2a4a" />
        <rect x="316" y="185" width="4" height="35" rx="2" fill="#2a2a4a" />

        {/* Home indicator */}
        <rect x="130" y="622" width="60" height="4" rx="2" fill="#0a193b" fillOpacity="0.3" />
      </svg>

      {/* Actual Screen Image Overlay */}
      <div 
        className="absolute overflow-hidden"
        style={{
          top: "5.4%",
          left: "4%",
          width: "92%",
          height: "92.5%",
          borderRadius: "32px",
        }}
      >
        <img 
          src={screenImg} 
          alt="App Screenshot" 
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Glow rings */}
      <div className="absolute -inset-4 rounded-[56px] border border-[#c5a059]/10 pointer-events-none" />
    </div>
  );
}

// ─── Auto-Rotating App Showcase ──────────────────────────────────────────────
function AppShowcase() {
  const images = [appHome, appCategories, appSubscription];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  const getPosition = (idx: number) => {
    const diff = (idx - index + images.length) % images.length;
    if (diff === 0) return "center";
    if (diff === 1) return "right";
    return "left";
  };

  const variants = {
    center: { zIndex: 30, x: 0, scale: 1, opacity: 1, filter: "blur(0px)", rotate: 0 },
    right: { zIndex: 20, x: 130, scale: 0.8, opacity: 0.3, filter: "blur(4px)", rotate: 0 },
    left: { zIndex: 20, x: -130, scale: 0.8, opacity: 0.3, filter: "blur(4px)", rotate: 0 },
  };

  return (
    <div className="relative w-full h-[450px] md:h-[550px] flex items-center justify-center pt-10">
      <AnimatePresence mode="popLayout">
        {images.map((img, i) => {
          const pos = getPosition(i);
          return (
            <motion.div
              key={img}
              initial={variants[pos]}
              animate={variants[pos]}
              transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
              className="absolute"
            >
              <PhoneMockup screenImg={img} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── FAQ Component ───────────────────────────────────────────────────────────
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {FAQ_ITEMS.map((item, i) => (
        <div 
          key={i}
          className="border border-[#0a193b]/10 rounded-2xl overflow-hidden transition-all duration-300 bg-white"
          style={{ boxShadow: openIndex === i ? "0 12px 24px rgba(10,25,59,0.06)" : "none" }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <span className="font-bold text-[#0a193b] pr-8 leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>{item.q}</span>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openIndex === i ? 'bg-[#c5a059] text-[#0a193b]' : 'bg-[#0a193b]/5 text-[#0a193b]'}`}>
              <svg 
                width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                className={`transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
          
          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="px-6 pb-6 text-[#0a193b]/60 text-[14px] leading-relaxed border-t border-[#0a193b]/5 pt-4">
                  {item.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [navSolid, setNavSolid] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#f8f6f2", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── A. STICKY NAV ─────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: navSolid
            ? "rgba(10,25,59,0.98)"
            : "linear-gradient(180deg, rgba(10,25,59,0.92) 0%, rgba(10,25,59,0.5) 70%, transparent 100%)",
          backdropFilter: navSolid ? "blur(18px)" : "blur(6px)",
          boxShadow: navSolid ? "0 4px 32px rgba(0,0,0,0.18)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-10 flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
            <img src={logo} alt="Healthy Delight" className="h-12 md:h-16 w-auto object-contain brightness-0 invert" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-white/70 hover:text-white text-[14px] font-medium transition-colors">Features</a>
            <a href="#products" className="text-white/70 hover:text-white text-[14px] font-medium transition-colors">Products</a>
            <a href="#story" className="text-white/70 hover:text-white text-[14px] font-medium transition-colors">Our Story</a>
            <Link
              to="/login"
              className="text-white/80 hover:text-white text-[14px] font-semibold transition-colors border border-white/20 rounded-xl px-4 py-2 hover:border-white/40"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate("/user")}
              className="text-[14px] font-bold px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "#c5a059", color: "#0a193b" }}
            >
              Get Started
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2.5 rounded-xl bg-white/10 text-white border border-white/20"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div
          style={{
            maxHeight: mobileMenuOpen ? "320px" : "0",
            overflow: "hidden",
            transition: "max-height 0.35s ease",
            background: "rgba(10,25,59,0.98)",
          }}
        >
          <div className="px-5 pb-6 pt-2 flex flex-col gap-3">
            {[["#features", "Features"], ["#products", "Products"], ["#story", "Our Story"]].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/80 hover:text-white text-[15px] font-semibold py-2.5 border-b border-white/10 transition-colors"
              >
                {label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-white/80 text-[15px] font-semibold py-2.5 border-b border-white/10">Sign In</Link>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/user"); }}
              className="mt-1 py-3 rounded-xl font-bold text-[15px] w-full"
              style={{ background: "#c5a059", color: "#0a193b" }}
            >
              Get Started →
            </button>
          </div>
        </div>
      </nav>

      {/* ── B. HERO ───────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a193b 0%, #0d2347 50%, #0a193b 100%)",
        }}
      >
        {/* Background texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #c5a059 0%, transparent 50%), radial-gradient(circle at 80% 20%, #c5a059 0%, transparent 40%), radial-gradient(circle at 60% 80%, rgba(197,160,89,0.5) 0%, transparent 35%)",
          }}
        />
        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "url('/assets/bg.png')",
            backgroundSize: "400px auto",
          }}
        />

        {/* Farm video overlay */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          style={{ filter: "brightness(0.8) contrast(1.1)" }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a193b]/50 via-[#0a193b]/30 to-[#0a193b]/90 pointer-events-none" />

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[12px] font-bold uppercase tracking-[0.15em]"
            style={{ background: "rgba(197,160,89,0.15)", border: "1px solid rgba(197,160,89,0.35)", color: "#c5a059" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse" />
            Farm-Fresh · Organic · Daily Delivery
          </div>

          <h1
            className="text-[40px] md:text-[64px] lg:text-[72px] font-black leading-[1.04] text-white mb-6"
            style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.03em" }}
          >
            Fresh, Organic Milk
            <br />
            <span style={{ color: "#c5a059" }}>&amp; Dairy</span> — Delivered
            <br />
            Daily
          </h1>

          <p className="text-white/65 text-[16px] md:text-[20px] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            From our partner farms to your doorstep — ethically sourced, hygienically handled, and delivered fresh every single morning.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/user")}
              className="group relative overflow-hidden flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-[16px] transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl"
              style={{ background: "#c5a059", color: "#0a193b", boxShadow: "0 16px 48px rgba(197,160,89,0.35)" }}
            >
              <div className="relative z-10 flex items-center gap-3">
                <span>Explore Products</span>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              
              {/* Shine effect */}
              <motion.div 
                className="absolute inset-0 z-0"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  width: "50%",
                  transform: "skewX(-25deg)"
                }}
                animate={{ x: ["-200%", "400%"] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  repeatDelay: 1.5 
                }}
              />
            </button>
            <a
              href="#story"
              className="px-8 py-4 rounded-2xl font-semibold text-[16px] text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-all duration-200"
            >
              Our Story
            </a>
          </div>

          {/* Social proof strip */}
          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            {[
              { val: 25, suf: "+", label: "Partner Farms", delay: 0.4 },
              { val: 10000, suf: "+", label: "Happy Families", delay: 0.6 },
              { val: 6, suf: " AM", label: "Morning Delivery", delay: 0.8 },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-[32px] md:text-[40px] font-black text-white mb-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {stat.label === "Morning Delivery" ? (
                    <span>{stat.val}{stat.suf}</span>
                  ) : (
                    <Counter value={stat.val} suffix={stat.suf} delay={stat.delay} />
                  )}
                </div>
                <div className="text-[11px] font-bold text-[#c5a059] uppercase tracking-[0.2em]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>



        {/* Wave Divider to Story (Cream) */}
        <WaveDivider fill="#f8f6f2" className="absolute bottom-0 left-0 z-10" />
      </section>

      {/* ── C. BRAND STORY ────────────────────────────────────────────────── */}
      <section id="story" className="relative py-20 md:py-28" style={{ background: "#f8f6f2" }}>
        {/* Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.3] pointer-events-none" 
          style={{ backgroundImage: `url(${bg})`, backgroundSize: '400px auto', backgroundRepeat: 'repeat' }} 
        />
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-10">
          <Reveal>
            <div className="text-center mb-14 md:mb-20">
              <div className="inline-block text-[11px] font-black text-[#c5a059] uppercase tracking-[0.25em] mb-3">Our Story</div>
              <h2
                className="text-[32px] md:text-[48px] font-black text-[#0a193b] leading-tight"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}
              >
                From Farm to Your Doorstep
              </h2>
              <div className="w-12 h-1 bg-[#c5a059] mx-auto mt-5 rounded-full" />
            </div>
          </Reveal>

          {/* Journey steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-[52px] left-[calc(16.66%)] right-[calc(16.66%)] h-0.5" style={{ background: "linear-gradient(90deg, #c5a059, #c5a059)" }} />

            {[
              {
                step: "01",
                icon: "🌿",
                title: "The Farm",
                desc: "Our partner farms across Gujarat, Maharashtra, and UP follow strict organic protocols. Happy cows, clean pastures, zero synthetic hormones.",
              },
              {
                step: "02",
                icon: "🚚",
                title: "Collection & Care",
                desc: "Within hours of milking, our cold-chain vehicles collect and transport to local processing hubs — maintaining pristine temperatures throughout.",
              },
              {
                step: "03",
                icon: "🏠",
                title: "Your Doorstep",
                desc: "Before 7 AM, your order is packed and dispatched. Fresh milk, set curd, quality paneer — at your door, every single day.",
              },
            ].map(({ step, icon, title, desc }, i) => (
              <Reveal key={step} delay={i * 120} className="h-full">
                <div
                  className="relative h-full text-center p-8 rounded-3xl bg-white border border-[#0a193b]/6 hover:shadow-2xl transition-all duration-500 group flex flex-col"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
                >
                  <motion.div
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-6 relative z-10 flex-shrink-0"
                    style={{ background: "#0a193b" }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    {icon}
                  </motion.div>
                  <div className="text-[10px] font-black text-[#c5a059] uppercase tracking-[0.3em] mb-2">{step}</div>
                  <h3
                    className="text-[20px] font-bold text-[#0a193b] mb-3"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {title}
                  </h3>
                  <p className="text-[#0a193b]/60 text-[14px] leading-relaxed flex-1">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Wave Divider to Features (Navy) */}
        <WaveDivider fill="#0a193b" />
      </section>

      {/* ── D. KEY FEATURES ───────────────────────────────────────────────── */}
      <section
        id="features"
        className="relative py-20 md:py-28 overflow-hidden"
        style={{ background: "#0a193b" }}
      >
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          <Reveal>
            <div className="text-center mb-14 md:mb-20">
              <div className="inline-block text-[11px] font-black text-[#c5a059] uppercase tracking-[0.25em] mb-3">Why Choose Us</div>
              <h2
                className="text-[32px] md:text-[48px] font-black text-white leading-tight"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}
              >
                Built on Trust &amp; Freshness
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div
                  className="group p-7 rounded-3xl border border-white/10 hover:border-[#c5a059]/30 transition-all duration-400 cursor-default"
                  style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-[#c5a059] transition-all duration-300 group-hover:scale-110"
                    style={{ background: "rgba(197,160,89,0.12)", border: "1px solid rgba(197,160,89,0.2)" }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    className="text-[19px] font-bold text-white mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-white/55 text-[14px] leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Wave Divider to Products (Cream) */}
        <WaveDivider fill="#f8f6f2" />
      </section>

      {/* ── E. PRODUCT HIGHLIGHTS ─────────────────────────────────────────── */}
      <section id="products" className="relative pt-20 pb-10 md:pt-28 md:pb-12 overflow-hidden" style={{ background: "#f8f6f2" }}>
        {/* Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.3] pointer-events-none" 
          style={{ backgroundImage: `url(${bg})`, backgroundSize: '400px auto', backgroundRepeat: 'repeat' }} 
        />
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-10">
          <Reveal>
            <div className="text-center mb-14 md:mb-20">
              <div className="inline-block text-[11px] font-black text-[#c5a059] uppercase tracking-[0.25em] mb-3">Our Range</div>
              <h2
                className="text-[32px] md:text-[48px] font-black text-[#0a193b] leading-tight"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}
              >
                Everything Dairy, Curated Daily
              </h2>
              <p className="text-[#0a193b]/55 text-[16px] max-w-xl mx-auto mt-4 leading-relaxed">
                Six premium categories. One trusted source. Delivered fresh every morning.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.label} delay={i * 80} className="h-full">
                <button
                  onClick={() => navigate("/user")}
                  className="group relative h-full flex flex-col text-left rounded-[1.5rem] md:rounded-3xl bg-white border border-[#0a193b]/6 hover:border-[#c5a059]/40 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
                  style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-neutral-100 flex-shrink-0">
                    <img 
                      src={p.image} 
                      alt={p.label} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-4 md:p-8 flex-1 flex flex-col">
                    <h3
                      className="text-[16px] md:text-[20px] font-bold text-[#0a193b] mb-1 md:mb-2 group-hover:text-[#c5a059] transition-colors"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {p.label}
                    </h3>
                    <p className="text-[#0a193b]/50 text-[12px] md:text-[14px] leading-relaxed mb-3 md:mb-4 line-clamp-2 md:line-clamp-none flex-1">
                      {p.desc}
                    </p>
                    <div
                      className="inline-flex items-center gap-1.5 md:gap-2 text-[11px] md:text-[13px] font-black text-[#c5a059] uppercase tracking-wider mt-auto"
                    >
                      <span>Explore</span>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="transition-transform md:w-4 md:h-4 group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Wave Divider to Purity Journey (Cream) */}
        <WaveDivider fill="#f8f6f2" />
      </section>

      {/* ── E+. THE PURITY JOURNEY ────────────────────────────────────────── */}
      <PurityPath />

      {/* Wave Divider to App Experience (Navy) */}
      <div className="relative h-0" style={{ background: "#f8f6f2" }}>
         <WaveDivider fill="#0a193b" />
      </div>

      {/* ── F. APP PROMO ──────────────────────────────────────────────────── */}
      <section
        className="py-20 md:py-28 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a193b 0%, #0d2960 100%)" }}
      >
        {/* Background glow */}
        <div className="absolute pointer-events-none" style={{ right: "5%", top: "10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(197,160,89,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />

        <div className="max-w-5xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20 items-center">
            {/* Left: Text */}
            <Reveal>
              <div>
                <div className="inline-block text-[11px] font-black text-[#c5a059] uppercase tracking-[0.25em] mb-5">The App Experience</div>
                <h2
                  className="text-[30px] md:text-[44px] font-black text-white leading-[1.1] mb-5"
                  style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}
                >
                  Fresh Dairy,<br />
                  <span style={{ color: "#c5a059" }}>Just a Tap Away</span>
                </h2>
                <p className="text-white/60 text-[15px] leading-relaxed mb-8 max-w-md">
                  From farm-fresh milk to daily essentials — seamless doorstep delivery, every single day. Set your schedule, manage your order, and wake up to freshness.
                </p>

                {/* Trust line */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex -space-x-2">
                    {["🧑", "👩", "👨", "🧓"].map((e, i) => (
                      <div key={i} className="w-9 h-9 rounded-full border-2 border-[#0a193b] bg-[#c5a059]/20 flex items-center justify-center text-sm">{e}</div>
                    ))}
                  </div>
                  <p className="text-white/60 text-[13px] font-medium">
                    Trusted by <span className="text-white font-bold">10,000+</span> homes across India
                  </p>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => navigate("/user")}
                    className="group flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl font-bold text-[15px] transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: "#c5a059", color: "#0a193b", boxShadow: "0 12px 36px rgba(197,160,89,0.3)" }}
                  >
                    Open App
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[15px] text-white border border-white/20 hover:border-white/40 transition-all"
                  >
                    Sign In
                  </Link>
                </div>

                {/* Store badges */}
                <div className="flex items-center gap-3 mt-6 opacity-50">
                  <div className="px-4 py-2 rounded-xl border border-white/20 flex items-center gap-2">
                    <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M19.665 16.811a10.316 10.316 0 0 1-1.021 1.837c-.537.767-.978 1.297-1.316 1.592-.525.482-1.089.73-1.692.744-.432 0-.954-.123-1.562-.373-.61-.249-1.17-.371-1.683-.371-.537 0-1.113.122-1.73.371-.617.25-1.114.381-1.495.393-.577.025-1.154-.229-1.729-.764-.367-.32-.826-.87-1.377-1.648-.59-.829-1.075-1.794-1.455-2.891-.407-1.187-.611-2.335-.611-3.447 0-1.273.275-2.372.826-3.292a4.857 4.857 0 0 1 1.73-1.751 4.65 4.65 0 0 1 2.34-.662c.46 0 1.063.142 1.81.422s1.227.422 1.436.422c.158 0 .689-.167 1.593-.498.853-.307 1.573-.434 2.163-.384 1.6.129 2.801.759 3.6 1.895-1.43.867-2.137 2.08-2.123 3.637.012 1.213.453 2.222 1.317 3.023a4.33 4.33 0 0 0 1.315.863c-.106.307-.218.6-.336.882z"/></svg>
                    <span className="text-white text-[12px] font-bold">App Store</span>
                  </div>
                  <div className="px-4 py-2 rounded-xl border border-white/20 flex items-center gap-2">
                    <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M3.18 23.76a2.4 2.4 0 0 0 2.59-.28l.06-.05L14.14 16 10 11.85 3.18 23.76zm18.16-10.3-3.37-1.97-4.34 4.27 4.34 4.37 3.37-1.97a2.43 2.43 0 0 0 0-4.7zM1.93 1.24l.85.85L10 9.15l0 0L6.45 5.4l11.25 6.57L1.93 4.25A2.45 2.45 0 0 0 .44 6.47v11.06a2.45 2.45 0 0 0 1.49 2.22l14.53-8.7-14.53-8.7z"/></svg>
                    <span className="text-white text-[12px] font-bold">Google Play</span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Right: Rotating App Showcase */}
            <Reveal delay={150}>
              <div className="flex justify-center md:justify-end">
                <AppShowcase />
              </div>
            </Reveal>
          </div>
        </div>

        {/* Wave Divider to Trust (Cream) */}
        <WaveDivider fill="#f8f6f2" />
      </section>



      {/* ── G+. TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="relative pt-10 pb-10 md:pt-16 md:pb-16 overflow-hidden" style={{ background: "#f8f6f2" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <Reveal>
            <div className="text-center mb-14 md:mb-20">
              <div className="inline-block text-[11px] font-black text-[#c5a059] uppercase tracking-[0.25em] mb-3">Community Voices</div>
              <h2
                className="text-[32px] md:text-[48px] font-black text-[#0a193b] leading-tight"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}
              >
                Trusted by 10,000+ Families
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 120}>
                <div className="group h-full flex flex-col p-8 rounded-[2rem] bg-[#0a193b] text-white transition-all duration-500 hover:shadow-2xl hover:shadow-[#0a193b]/20 hover:-translate-y-2">
                  {/* Stars */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="16" height="16" fill="#c5a059" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                  </div>

                  <p className="flex-1 text-white/80 text-[15px] italic leading-relaxed mb-8">
                    "{t.quote}"
                  </p>

                  <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#c5a059]/30">
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{t.name}</div>
                      <div className="text-[12px] text-[#c5a059] font-medium tracking-wide">{t.role}</div>
                    </div>
                    {/* Gold quote icon */}
                    <div className="ml-auto opacity-20 transform translate-y-2">
                       <svg width="24" height="24" fill="#c5a059" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 14.69 16.69 12 20 12L20 10C16.69 10 14.017 7.31 14.017 4L11 4L11 9C11 12.31 8.31 15 5 15L5 17C8.31 17 11 19.69 11 23L14.017 23 14.017 21ZM24 21L24 18C24 14.69 22.183 12 18.873 12L18.873 10C22.183 10 24 7.31 24 4L20.983 4L20.983 9C20.983 12.31 22.8 15 26.113 15L26.113 17C22.8 17 20.983 19.69 20.983 23L24 23 24 21Z"/></svg>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Wave Divider to FAQ (Cream) */}
        <WaveDivider fill="#f8f6f2" />
      </section>

      {/* ── G++. FAQ ──────────────────────────────────────────────────────── */}
      <section className="relative pt-10 pb-20 md:pt-16 md:pb-28 overflow-hidden" style={{ background: "#f8f6f2" }}>
        {/* Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.3] pointer-events-none" 
          style={{ backgroundImage: `url(${bg})`, backgroundSize: '400px auto', backgroundRepeat: 'repeat' }} 
        />
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-10">
          <Reveal>
            <div className="text-center mb-14 md:mb-16">
              <div className="inline-block text-[11px] font-black text-[#c5a059] uppercase tracking-[0.25em] mb-3">Got Questions?</div>
              <h2
                className="text-[32px] md:text-[48px] font-black text-[#0a193b] leading-tight"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}
              >
                Everything You Need to Know
              </h2>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <FAQSection />
          </Reveal>
        </div>

        {/* Wave Divider to Final CTA (Navy) */}
        <WaveDivider fill="#0a193b" />
      </section>

      {/* ── H. FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "#0a193b" }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 50%, #c5a059 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #c5a059 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-10 py-24 md:py-32 text-center">
          <Reveal>
            <div className="inline-block text-[11px] font-black text-[#c5a059] uppercase tracking-[0.25em] mb-5">Start Today</div>
            <h2
              className="text-[34px] md:text-[56px] font-black text-white leading-[1.08] mb-6"
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.03em" }}
            >
              Wake Up to
              <span style={{ color: "#c5a059" }}> Freshness</span>,<br />
              Every Single Day
            </h2>
            <p className="text-white/55 text-[16px] max-w-xl mx-auto mb-10 leading-relaxed">
              Join thousands of families who've made the switch to pure, farm-fresh dairy. No commitments — start with a single order.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/user")}
                className="group relative overflow-hidden flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-[17px] transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xl"
                style={{ background: "#c5a059", color: "#0a193b", boxShadow: "0 20px 60px rgba(197,160,89,0.4)" }}
              >
                <div className="relative z-10 flex items-center gap-3">
                  <span>Start Fresh Today</span>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>

                {/* Shine effect */}
                <motion.div 
                  className="absolute inset-0 z-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    width: "50%",
                    transform: "skewX(-25deg)"
                  }}
                  animate={{ x: ["-200%", "400%"] }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    repeatDelay: 1.5 
                  }}
                />
              </button>
              <Link
                to="/login"
                className="px-9 py-4 rounded-2xl font-semibold text-[17px] text-white/75 hover:text-white border border-white/20 hover:border-white/40 transition-all"
              >
                Sign In
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Wave Divider to Footer (Dark Navy) */}
        <WaveDivider fill="#07122b" />
      </section>

      {/* ── I. FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ background: "#07122b" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link to="/" className="inline-block mb-6 transition-transform hover:scale-105 active:scale-95">
                <img src={logo} alt="Healthy Delight" className="h-14 md:h-20 w-auto object-contain brightness-0 invert" />
              </Link>
              <p className="text-white/40 text-[13px] leading-relaxed max-w-[220px]">
                Purity in every drop, freshness in every bite. Farm to doorstep.
              </p>
              <div className="mt-6 flex gap-3">
                {/* Social icons */}
                {[
                  { label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4z" },
                  { label: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                ].map(({ label, path }) => (
                  <button
                    key={label}
                    aria-label={label}
                    className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-all"
                  >
                    <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d={path} /></svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Shop */}
            <div>
              <h4 className="text-white font-bold text-[14px] mb-4 uppercase tracking-wider">Shop</h4>
              <ul className="space-y-2.5">
                {["Fresh Milk", "Curd & Yogurt", "Paneer & Cheese", "Butter & Ghee", "Desserts", "Ice Creams"].map((item) => (
                  <li key={item}>
                    <button onClick={() => navigate("/user")} className="text-white/45 hover:text-white/75 text-[13px] transition-colors">{item}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-bold text-[14px] mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "About Us", to: "/about-us" },
                  { label: "FAQ", to: "/faq" },
                  { label: "Subscribe", to: "/user" },
                  { label: "Sign In", to: "/login" },
                  { label: "Seller Portal", to: "/seller/login" },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-white/45 hover:text-white/75 text-[13px] transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold text-[14px] mb-4 uppercase tracking-wider">Contact</h4>
              <ul className="space-y-4">
                {[
                  { icon: "✉️", text: "support@healthydelight.com" },
                  { icon: "📞", text: "+91 1800-419-5566" },
                  { icon: "📍", text: "Ahmedabad, Gujarat" },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex gap-2.5 items-start">
                    <span className="text-[14px] mt-0.5">{icon}</span>
                    <span className="text-white/45 text-[13px] leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8 my-10" />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-[12px]">
              © {new Date().getFullYear()} Healthy Delight. All rights reserved.
            </p>
            <div className="flex gap-6">
              {["Privacy Policy", "Terms of Service"].map((label) => (
                <button key={label} className="text-white/30 hover:text-white/55 text-[12px] transition-colors">{label}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
