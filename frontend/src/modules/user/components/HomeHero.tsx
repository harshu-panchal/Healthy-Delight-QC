import { useNavigate } from "react-router-dom";
import { useLayoutEffect, useRef, useState, useEffect, useMemo } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getTheme } from "../../../utils/themes";
import { useLocation } from "../../../hooks/useLocation";
import { appConfig } from "../../../services/configService";
import { getCategories, getProducts } from "../../../services/api/customerProductService";
import { motion, AnimatePresence } from "framer-motion";
import { Category } from "../../../types/domain";
import { getHeaderCategoriesPublic } from "../../../services/api/headerCategoryService";
import { getIconByName } from "../../../utils/iconLibrary";
import logo from "../../../../assets/logo.png";
import headerBg from "../../../../assets/Header2.jpg";

gsap.registerPlugin(ScrollTrigger);

interface HomeHeroProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  themeKey?: string;
}

const ALL_TAB: Tab = {
  id: "all",
  label: "All",
  icon: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 22V12H15V22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  themeKey: "all",
};

export default function HomeHero({
  activeTab = "all",
  onTabChange,
}: HomeHeroProps) {
  const [tabs, setTabs] = useState<Tab[]>([ALL_TAB]);
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const topSectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [, setIsSticky] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [isListening, setIsListening] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch matching products as suggestions
  useEffect(() => {
    if (mobileSearchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const params: any = { 
          search: mobileSearchQuery.trim(),
          limit: 5 
        };
        if (userLocation?.latitude && userLocation?.longitude) {
          params.latitude = userLocation.latitude;
          params.longitude = userLocation.longitude;
        }
        const res = await getProducts(params);
        
        // Filter categories locally
        const matchedCategories = categories
          .filter(cat => cat.name.toLowerCase().includes(mobileSearchQuery.toLowerCase()))
          .slice(0, 3)
          .map(cat => ({
            id: cat.id || (cat as any)._id,
            name: cat.name,
            type: 'category',
            image: (cat as any).image
          }));

        const matchedProducts = (res.data || []).map((prod: any) => ({
          id: prod.id || prod._id,
          name: prod.productName,
          type: 'product',
          image: prod.mainImage,
          price: prod.price
        }));

        // Standard keyword suggestions
        const keywords = ['milk', 'curd', 'paneer', 'cheese', 'butter', 'ghee', 'lassi', 'ice cream', 'full cream milk', 'yogurt']
          .filter(kw => kw.toLowerCase().includes(mobileSearchQuery.toLowerCase()) && kw.toLowerCase() !== mobileSearchQuery.toLowerCase())
          .slice(0, 2)
          .map(kw => ({
            id: kw,
            name: kw,
            type: 'keyword'
          }));

        setSuggestions([...keywords, ...matchedCategories, ...matchedProducts]);
      } catch (err) {
        console.error("Error fetching suggestions", err);
      }
    };

    const timer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timer);
  }, [mobileSearchQuery, categories, userLocation]);

  // Format location display text - only show if user has provided location
  const locationDisplayText = useMemo(() => {
    if (userLocation?.address) {
      // Use the full address if available
      return userLocation.address;
    }
    // Fallback to city, state format if available
    if (userLocation?.city && userLocation?.state) {
      return `${userLocation.city}, ${userLocation.state}`;
    }
    // Fallback to city only
    if (userLocation?.city) {
      return userLocation.city;
    }
    // No default - return empty string if no location provided
    return "";
  }, [userLocation]);

  // Load dynamic header categories for tabs
  useEffect(() => {
    const fetchHeaderCategories = async () => {
      try {
        const cats = await getHeaderCategoriesPublic(true);
        if (cats && cats.length > 0) {
          const mapped: Tab[] = cats
            .filter((c) => c.status === "Published" && c.slug !== "all")
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((c) => ({
              id: c.slug,
              label: c.name,
              icon: getIconByName(c.iconName),
              themeKey: (c as any).themeKey || c.slug || "all",
            }));
          setTabs([ALL_TAB, ...mapped]);
        }
      } catch (error) {
        console.error("Failed to fetch header categories", error);
      }
    };
    fetchHeaderCategories();
  }, []);

  // Fetch categories for search suggestions
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        if (response.success && response.data) {
          setCategories(
            response.data.map((c: any) => ({
              ...c,
              id: c._id || c.id,
            })),
          );
        }
      } catch (error) {
        console.error("Error fetching categories for suggestions:", error);
      }
    };
    fetchCategories();
  }, []);

  // Search suggestions based on active tab or fetched categories
  const searchSuggestions = useMemo(() => {
    if (activeTab === "all" && categories.length > 0) {
      // Use real category names for 'all' tab suggestions
      return categories.slice(0, 8).map((c) => c.name.toLowerCase());
    }

    // Generic dairy / grocery oriented suggestions for any header category
    return [
      "milk",
      "curd",
      "paneer",
      "cheese",
      "butter",
      "ghee",
      "lassi",
      "ice cream",
    ];
  }, [activeTab, categories.length]);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        hero,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
        },
      );
    }, hero);

    return () => ctx.revert();
  }, []);

  // Animate search suggestions
  useEffect(() => {
    setCurrentSearchIndex(0);
    const interval = setInterval(() => {
      setCurrentSearchIndex((prev) => (prev + 1) % searchSuggestions.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [searchSuggestions.length, activeTab]);

  const handleVoiceSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // @ts-expect-error
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
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
      setMobileSearchQuery(speechResult);
      navigate(`/search?q=${encodeURIComponent(speechResult.trim())}`);
    };

    recognition.start();
  };

  // Handle scroll to detect when "LOWEST PRICES EVER" section is out of view
  useEffect(() => {
    const handleScroll = () => {
      const appScrollContainer = document.getElementById("app-main-scroll");
      const scrollY = Math.max(
        appScrollContainer?.scrollTop || 0,
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0,
      );
      const fallbackProgress = Math.min(scrollY / 160, 1);
      let progress = fallbackProgress;
      let sticky = scrollY > 8;

      // Find the "LOWEST PRICES EVER" section when available
      const lowestPricesSection = document.querySelector(
        '[data-section="lowest-prices"]',
      );

      if (lowestPricesSection) {
        const sectionBottom = lowestPricesSection.getBoundingClientRect().bottom;
        const sectionProgress = Math.min(Math.max(1 - sectionBottom / 200, 0), 1);
        progress = Math.max(fallbackProgress, sectionProgress);
        sticky = sticky || sectionBottom <= 100;
      } else if (topSectionRef.current) {
        const topSectionBottom = topSectionRef.current.getBoundingClientRect().bottom;
        const topSectionHeight = topSectionRef.current.offsetHeight || 1;
        const sectionProgress = Math.min(
          Math.max(1 - topSectionBottom / topSectionHeight, 0),
          1,
        );
        progress = Math.max(fallbackProgress, sectionProgress);
        sticky = sticky || topSectionBottom <= 0;
      }

      setScrollProgress(progress);
      setIsSticky(sticky);
      setHasScrolled(scrollY > 2);
    };

    // Capture scroll from nested containers too (main app scroll root can change on navigation/HMR).
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    const pollId = window.setInterval(handleScroll, 120);
    handleScroll(); // Check initial state

    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("scroll", handleScroll);
      window.clearInterval(pollId);
    };
  }, []);

  // Update sliding indicator position when activeTab changes and scroll to active tab
  useEffect(() => {
    const updateIndicator = (shouldScroll = true) => {
      const activeTabButton = tabRefs.current.get(activeTab);
      const container = tabsContainerRef.current;

      if (activeTabButton && container) {
        try {
          // Use offsetLeft for position relative to container (not affected by scroll)
          // This ensures the indicator stays aligned even when container scrolls
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeTabButton.getBoundingClientRect();
          const left = buttonRect.left - containerRect.left + container.scrollLeft;
          const width = buttonRect.width;

          // Ensure valid values
          if (width > 0) {
            const refinedWidth = width * 0.7;
            const offset = (width - refinedWidth) / 2;
            setIndicatorStyle({ left: left + offset, width: refinedWidth });
          }

          // Scroll the container to bring the active tab into view (only when tab changes)
          if (shouldScroll) {
            const containerScrollLeft = container.scrollLeft;
            const containerWidth = container.offsetWidth;
            const buttonLeft = left;
            const buttonWidth = width;
            const buttonRight = buttonLeft + buttonWidth;

            // Calculate scroll position to center the button or keep it visible
            const scrollPadding = 20; // Padding from edges
            let targetScrollLeft = containerScrollLeft;

            // If button is on the left side and partially or fully hidden
            if (buttonLeft < containerScrollLeft + scrollPadding) {
              targetScrollLeft = buttonLeft - scrollPadding;
            }
            // If button is on the right side and partially or fully hidden
            else if (
              buttonRight >
              containerScrollLeft + containerWidth - scrollPadding
            ) {
              targetScrollLeft = buttonRight - containerWidth + scrollPadding;
            }

            // Smooth scroll to the target position
            if (targetScrollLeft !== containerScrollLeft) {
              container.scrollTo({
                left: Math.max(0, targetScrollLeft),
                behavior: "smooth",
              });
            }
          }
        } catch (error) {
          console.warn("Error updating indicator:", error);
        }
      }
    };

    // Update immediately with scroll
    updateIndicator(true);

    // Also update after delays to handle any layout shifts and ensure smooth animation
    const timeout1 = setTimeout(() => updateIndicator(true), 50);
    const timeout2 = setTimeout(() => updateIndicator(true), 150);
    const timeout3 = setTimeout(() => updateIndicator(false), 300); // Last update without scroll to avoid conflicts

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [activeTab]);

  const handleTabClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onTabChange?.(tabId);
  };

  const currentTab = tabs.find((t) => t.id === activeTab) || ALL_TAB;
  const themeId = currentTab.themeKey || currentTab.id || "all";
  const theme = getTheme(themeId);
  const heroGradient = `linear-gradient(to bottom right, ${theme.primary[0]}, ${theme.primary[1]}, ${theme.primary[2]})`;
  const isHeaderSolid = hasScrolled;
  const categoryHideRaw = Math.min(scrollProgress * 1.15, 1);
  const categoryHideProgress = 1 - Math.pow(1 - categoryHideRaw, 2);
  const bottomRadiusPx = Math.round(Math.max(0, Math.min(1, (categoryHideProgress - 0.9) / 0.1)) * 18);

  // Helper to convert RGB to RGBA
  const rgbToRgba = (rgb: string, alpha: number) => {
    return rgb.replace("rgb", "rgba").replace(")", `, ${alpha})`);
  };

  return (
    <div
      ref={heroRef}
      className={`fixed md:hidden top-0 left-0 w-full z-50 transition-all duration-300 pt-3 ${showSuggestions && suggestions.length > 0 ? '' : 'overflow-hidden'}`}
      style={{
        background: isHeaderSolid
          ? '#0a193b'
          : 'linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.9) 20%, rgba(10, 25, 59, 0.7) 45%, rgba(10, 25, 59, 0.4) 70%, rgba(252, 250, 247, 0) 100%)',
        boxShadow: scrollProgress > 0 ? "0 12px 40px rgba(0,0,0,0.12)" : "0 4px 16px rgba(0,0,0,0.04)",
        borderBottomLeftRadius: `${bottomRadiusPx}px`,
        borderBottomRightRadius: `${bottomRadiusPx}px`,
        paddingBottom: 0,
        marginBottom: 0,
      }}>
      {/* Top section: Compact Single-Row Layout (Refined & Premium) */}
      <div className="relative md:hidden px-4 h-[60px] flex items-center justify-between transition-all duration-300">
        {/* Row Layer: Delivery (Left) and Profile (Right) */}
        <div className="flex items-center justify-between w-full h-full relative z-20">
          
          {/* Logo (Perfect Center via Absolute Positioning) */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer pointer-events-auto"
            onClick={() => navigate('/')}
          >
            <img 
              src={logo} 
              alt="Healthy Delight" 
              className="h-[48px] w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform hover:scale-105" 
            />
          </div>

          {/* Delivery on Left */}
          {locationDisplayText ? (
            <div
              onClick={() => navigate('/address-book')}
              className="flex items-center gap-2 cursor-pointer max-w-[35%] group"
            >
              <div className="text-white/80 group-hover:text-white transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[12px] font-bold text-white/90 truncate group-hover:text-white transition-colors">
                {locationDisplayText}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/address-book')}>
              <div className="text-white/60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[12px] font-bold text-white/60 italic">Set location</span>
            </div>
          )}

          {/* Profile & Menu on Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/account')}
              className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/manage-schedule')}
              className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all shadow-sm"
              title="Manage Schedule"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky section: Fully Unified Search & Categories */}
      <div
        ref={stickyRef}
        className="sticky top-0 md:top-24 z-50 transition-all duration-300"
        style={{
          background: isHeaderSolid ? '#0a193b' : 'transparent',
          backdropFilter: 'none',
          boxShadow: scrollProgress > 0.1 ? "0 10px 30px rgba(0,0,0,0.08)" : "none",
        }}>

        {/* Search Bar Container */}
        <div ref={searchContainerRef} className="px-5 md:px-10 py-2 md:hidden relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mobileSearchQuery.trim()) {
                setShowSuggestions(false);
                navigate(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
              }
            }}
            className="w-full md:max-w-2xl md:mx-auto h-12 md:h-14 bg-white rounded-2xl flex items-center gap-4 px-5 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:shadow-[0_12px_40px_rgb(0,0,0,0.16)] relative z-20">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0a193b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              name="q"
              value={mobileSearchQuery}
              onChange={(e) => {
                setMobileSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={`Search for "${searchSuggestions[currentSearchIndex]}"`}
              className="flex-1 bg-transparent border-none outline-none text-[16px] font-semibold text-neutral-high placeholder-slate-400"
              autoComplete="off"
            />
          </form>

          {/* Mobile Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-5 right-5 top-full mt-2 bg-[#0a193b] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden z-50 backdrop-blur-xl"
              >
                <div className="py-2 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                  {suggestions.map((item, idx) => (
                    <div
                      key={`${item.type}-${item.id}-${idx}`}
                      onClick={() => {
                        setShowSuggestions(false);
                        if (item.type === 'product') {
                          navigate(`/product/${item.id}`);
                        } else if (item.type === 'category') {
                          navigate(`/category/${item.id}`);
                        } else {
                          setMobileSearchQuery(item.name);
                          navigate(`/search?q=${encodeURIComponent(item.name)}`);
                        }
                      }}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/10 transition-colors cursor-pointer text-white/90 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Left icon or image */}
                        {item.type === 'keyword' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/40 group-hover:text-white/70 transition-colors">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                          </svg>
                        )}
                        {item.type === 'category' && (
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs">📁</span>
                            )}
                          </div>
                        )}
                        {item.type === 'product' && (
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-xs">📦</span>
                            )}
                          </div>
                        )}
                        <span className="text-[13px] font-semibold truncate group-hover:text-white transition-colors">
                          {item.name}
                        </span>
                      </div>
                      
                      {/* Right metadata badge/type */}
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0">
                        {item.type === 'product' ? `₹${item.price}` : item.type}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category Navigation (slides up behind search bar on scroll) */}
        <div
          className="w-full relative z-10 overflow-hidden transition-all duration-900 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            maxHeight: `${128 - (120 * categoryHideProgress)}px`,
            opacity: 1 - categoryHideProgress,
            transform: `translateY(${-26 * categoryHideProgress}px)`,
            pointerEvents: categoryHideProgress > 0.85 ? "none" : "auto",
          }}
        >
          <div
            ref={tabsContainerRef}
            className="relative flex gap-1 md:gap-3 overflow-x-auto scrollbar-hide px-5 md:px-10 md:justify-center scroll-smooth">

            {/* Sliding Indicator (Navy/Primary) */}
            {indicatorStyle.width > 0 && (
              <div
                className="absolute bottom-0 h-1 bg-primary-500 rounded-t-full transition-all duration-300 ease-out pointer-events-none shadow-[0_-2px_6px_rgba(10,25,59,0.2)]"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 0,
                }}
              />
            )}

            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (el ? tabRefs.current.set(tab.id, el) : tabRefs.current.delete(tab.id))}
                  onClick={(e) => handleTabClick(e, tab.id)}
                  className={`flex-shrink-0 flex flex-col md:flex-row items-center justify-center min-w-[60px] md:min-w-fit px-3 py-3 md:py-4 relative z-10 cursor-pointer select-none transition-all duration-300 ${isActive ? "text-primary-500 scale-105" : "text-neutral-medium hover:text-primary-400 hover:scale-[1.02]"
                    }`}
                  type="button">
                  <div
                    className={`mb-1 md:mb-0 md:mr-2 w-5 h-5 flex items-center justify-center transition-all duration-300 ${isActive ? "scale-110 drop-shadow-[0_2px_4px_rgba(10,25,59,0.15)]" : "scale-100 opacity-60"
                      }`}>
                    {tab.icon}
                  </div>
                  <span className={`text-[11px] md:text-sm whitespace-nowrap transition-all duration-300 ${isActive ? "font-bold tracking-tight" : "font-semibold"
                    }`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
