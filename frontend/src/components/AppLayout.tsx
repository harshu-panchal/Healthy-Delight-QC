import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingCartPill from './FloatingCartPill';
import { useLocation as useLocationContext } from '../hooks/useLocation';
import LocationPermissionRequest from './LocationPermissionRequest';
import { useThemeContext } from '../context/ThemeContext';
import HomeBackground from './ui/HomeBackground';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const { isLocationEnabled, isLocationLoading, location: userLocation } = useLocationContext();
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [showLocationChangeModal, setShowLocationChangeModal] = useState(false);
  const { currentTheme } = useThemeContext();
  const [isListening, setIsListening] = useState(false);
  const [isHeaderOpaque, setIsHeaderOpaque] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Check if location is required for current route
  const requiresLocation = () => {
    const publicRoutes = ['/login', '/signup', '/seller/login', '/seller/signup', '/delivery/login', '/delivery/signup', '/admin/login'];
    // Don't require location on login/signup pages
    if (publicRoutes.includes(location.pathname)) {
      return false;
    }
    // Require location for ALL routes (not just authenticated users)
    // This ensures location is mandatory for everyone visiting the platform
    return true;
  };

  // ALWAYS show location request modal on app load if location is not enabled
  // This ensures modal appears on every app open, regardless of browser permission state
  useEffect(() => {
    // Wait for initial loading to complete
    if (isLocationLoading) {
      return;
    }

    // If location is enabled, hide modal
    if (isLocationEnabled) {
      setShowLocationRequest(false);
      return;
    }

    // If location is NOT enabled and route requires location, ALWAYS show modal
    // This will trigger on every app open until user explicitly confirms location
    if (!isLocationEnabled && requiresLocation()) {
      setShowLocationRequest(true);
    } else {
      setShowLocationRequest(false);
    }
  }, [isLocationLoading, isLocationEnabled, location.pathname]);

  // Update search query when URL params change
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
  }, [searchParams]);

  const startVoiceSearch = () => {
    // @ts-expect-error Window interface lacks speech recognition
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
      setSearchQuery(speechResult);
      if (location.pathname !== '/search') {
        navigate(`/search?q=${encodeURIComponent(speechResult.trim())}`);
      } else {
        setSearchParams({ q: speechResult.trim() });
      }
    };

    recognition.start();
  };

  // Handle search input change (now just updates local state)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only trigger if the query has actually changed from the URL param
      const urlQuery = searchParams.get('q') || '';
      if (searchQuery === urlQuery) return;

      if (location.pathname === '/search') {
        if (searchQuery.trim()) {
          setSearchParams({ q: searchQuery.trim() });
        } else {
          setSearchParams({});
        }
      } else if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, location.pathname, navigate, setSearchParams, searchParams]);

  useEffect(() => {
    const mainElement = mainRef.current;

    const handleScroll = () => {
      const mainScrolled = (mainElement?.scrollTop || 0) > 6;
      const windowScrolled = window.scrollY > 6;
      setIsHeaderOpaque(mainScrolled || windowScrolled);
    };

    handleScroll();

    mainElement?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mainElement?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);




  // Reset scroll position when navigating to any page (smooth, no flash)
  useEffect(() => {
    // Use requestAnimationFrame to prevent visual flash
    requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
      // Also reset window scroll smoothly
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }, [location.pathname]);

  const isProductDetailPage = location.pathname.startsWith('/product/');
  const isSearchPage = location.pathname === '/search';
  const isCheckoutPage = location.pathname === '/checkout' || location.pathname.startsWith('/checkout/');
  const isCartPage = location.pathname === '/cart';
  const showHeader = isSearchPage && !isCheckoutPage && !isCartPage;
  const showSearchBar = isSearchPage && !isCheckoutPage && !isCartPage;
  const showFooter = !isCheckoutPage && !isProductDetailPage;

  return (
    <HomeBackground className="flex flex-col min-h-screen w-full">
      {/* Desktop Container Wrapper */}
      <div className="md:w-full md:min-h-screen overflow-x-hidden">
        <div className="md:w-full md:min-h-screen md:flex md:flex-col overflow-x-hidden">
          {/* Top Navigation Bar - Desktop Only */}
          {showFooter && (
            <nav
              className="hidden md:flex items-center justify-between gap-8 px-6 lg:px-8 py-3 shadow-sm transition-colors duration-300"
              style={{
                background: `linear-gradient(to right, ${currentTheme.primary[0]}, ${currentTheme.primary[1]})`,
                borderBottom: `1px solid ${currentTheme.primary[0]}`
              }}
            >
              {/* Center: Home, Order Again, Categories, Subscription */}
              <div className="flex-1 flex items-center justify-center gap-8">
                {/* Home */}
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/')
                    ? 'bg-white shadow-md font-semibold'
                    : 'hover:bg-white/20'
                    }`}
                  style={{
                    color: isActive('/') ? currentTheme.accentColor : currentTheme.headerTextColor
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {isActive('/') ? (
                      <>
                        <path d="M2 12L12 4L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" />
                        <rect x="4" y="12" width="16" height="8" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12L12 4L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <rect x="4" y="12" width="16" height="8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
                      </>
                    )}
                  </svg>
                  <span className="font-medium text-sm">Home</span>
                </Link>

                {/* Order Again */}
                <Link
                  to="/order-again"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/order-again')
                    ? 'bg-white shadow-md font-semibold'
                    : 'hover:bg-white/20'
                    }`}
                  style={{
                    color: isActive('/order-again') ? currentTheme.accentColor : currentTheme.headerTextColor
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {isActive('/order-again') ? (
                      <path d="M5 8V6C5 4.34315 6.34315 3 8 3H16C17.6569 3 19 4.34315 19 6V8H21C21.5523 8 22 8.44772 22 9V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V9C2 8.44772 2.44772 8 3 8H5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    ) : (
                      <path d="M5 8V6C5 4.34315 6.34315 3 8 3H16C17.6569 3 19 4.34315 19 6V8H21C21.5523 8 22 8.44772 22 9V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V9C2 8.44772 2.44772 8 3 8H5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
                    )}
                  </svg>
                  <span className="font-medium text-sm">Order Again</span>
                </Link>

                {/* Categories */}
                <Link
                  to="/categories"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${(isActive('/categories') || location.pathname.startsWith('/category/'))
                    ? 'bg-white shadow-md font-semibold'
                    : 'hover:bg-white/20'
                    }`}
                  style={{
                    color: (isActive('/categories') || location.pathname.startsWith('/category/')) ? currentTheme.accentColor : currentTheme.headerTextColor
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {(isActive('/categories') || location.pathname.startsWith('/category/')) ? (
                      <>
                        <circle cx="7" cy="7" r="2.5" fill="currentColor" stroke="currentColor" strokeWidth="2" />
                        <circle cx="17" cy="7" r="2.5" fill="currentColor" stroke="currentColor" strokeWidth="2" />
                        <circle cx="7" cy="17" r="2.5" fill="currentColor" stroke="currentColor" strokeWidth="2" />
                        <circle cx="17" cy="17" r="2.5" fill="currentColor" stroke="currentColor" strokeWidth="2" />
                      </>
                    ) : (
                      <>
                        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="7" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="17" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
                      </>
                    )}
                  </svg>
                  <span className="font-medium text-sm">Categories</span>
                </Link>

                {/* Subscription - last (niche) */}
                <Link
                  to="/subscription"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/subscription')
                    ? 'bg-white shadow-md font-semibold'
                    : 'hover:bg-white/20'
                    }`}
                  style={{
                    color: isActive('/subscription') ? currentTheme.accentColor : currentTheme.headerTextColor
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M19 8H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline points="8 2 12 6 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-medium text-sm">Subscription</span>
                </Link>
              </div>

              {/* Right: Profile */}
              <Link
                to="/account"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-shrink-0 ${isActive('/account')
                  ? 'bg-white shadow-md font-semibold'
                  : 'hover:bg-white/20'
                  }`}
                style={{
                  color: isActive('/account') ? currentTheme.accentColor : currentTheme.headerTextColor
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {isActive('/account') ? (
                    <>
                      <circle cx="12" cy="8" r="4" fill="currentColor" stroke="currentColor" strokeWidth="2" />
                      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="currentColor" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </>
                  )}
                </svg>
                <span className="font-medium text-sm">Profile</span>
              </Link>
            </nav>
          )}

          {/* Premium Sticky Header - Secondary Pages */}
          {(showHeader || isSearchPage) && (
            <header
              className="sticky top-0 z-50 md:top-[60px] transition-all duration-300"
              style={{
                background: isHeaderOpaque
                  ? '#0a193b'
                  : 'linear-gradient(180deg, rgba(10, 25, 59, 0.85) 0%, rgba(15, 37, 82, 0.7) 100%)',
                boxShadow: isHeaderOpaque
                  ? "0 4px 12px rgba(0,0,0,0.08)"
                  : "0 2px 8px rgba(0,0,0,0.04)",
                backdropFilter: isHeaderOpaque ? "none" : "blur(12px)"
              }}
            >
              {/* Location line with elevated feel */}
              {userLocation && (userLocation.address || userLocation.city) && (
                <div className="px-5 md:px-10 py-2.5 flex items-center justify-between gap-4 border-b border-white/10 shadow-inner">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/60 flex-shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-white/80 text-[13px] font-bold truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" title={userLocation?.address || ''}>
                      {userLocation?.address || `${userLocation.city}, ${userLocation.state}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowLocationChangeModal(true)}
                    className="text-white/60 text-[11px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors flex-shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Search bar area with depth */}
              {showSearchBar && (
                <div className="px-5 md:px-10 py-3 flex items-center gap-4">
                  <div className="max-w-3xl md:mx-auto flex items-center gap-3 flex-1 min-w-0">
                    {/* Back button */}
                    {isSearchPage && (
                      <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-white/80 hover:text-white transition-all bg-white/10 rounded-xl border border-white/20 shadow-lg hover:bg-white/20"
                        title="Back"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}

                    {/* Search Input Unit with layered shadow */}
                    <div className="relative flex-1 min-w-0 group">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Search for healthy delights..."}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
                        className="w-full h-11 md:h-12 bg-white rounded-2xl px-11 py-2 text-[15px] font-bold text-neutral-high placeholder-slate-400 focus:ring-4 focus:ring-primary-500/20 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus:shadow-[0_12px_40px_rgb(0,0,0,0.16)]"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                      </span>
                      {/* Voice Search */}
                      <button
                        onClick={startVoiceSearch}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${isListening ? 'bg-red-50 text-red-500 shadow-inner' : 'text-slate-400 hover:text-primary-500 hover:bg-slate-50'}`}
                        aria-label="Voice search"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="22"></line>
                          <line x1="8" y1="22" x2="16" y2="22"></line>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Profile Link with elevated style */}
                  <Link
                    to="/account"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:border-white/40 group"
                    aria-label="Profile"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-transform">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </Link>
                </div>
              )}
            </header>
          )}

          {/* Scrollable Main Content */}
          <main id="app-main-scroll" ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 md:pb-8 bg-transparent" style={{ background: 'transparent' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut"
                }}
                className="w-full max-w-full bg-transparent"
                style={{ minHeight: '100%', background: 'transparent' }}
                onAnimationComplete={() => {
                  if (mainRef.current) {
                    mainRef.current.scrollTop = 0;
                  }
                  window.scrollTo(0, 0);
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Floating Cart Pill */}
          <FloatingCartPill />

          {/* Location Permission Request Modal - Mandatory for all users */}
          {showLocationRequest && (
            <LocationPermissionRequest
              onLocationGranted={() => setShowLocationRequest(false)}
              skipable={false}
              title="Location Access Required"
              description="We need your location to show you products available near you and enable delivery services. Location access is required to continue."
            />
          )}

          {/* Location Change Modal */}
          {showLocationChangeModal && (
            <LocationPermissionRequest
              onLocationGranted={() => setShowLocationChangeModal(false)}
              skipable={true}
              title="Change Location"
              description="Update your location to see products available near you."
            />
          )}

          {/* Fixed Bottom Navigation - Mobile Only, Hidden on checkout pages */}
          {showFooter && (
            <nav
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
              style={{
                background: '#ffffff',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="grid grid-cols-4 items-center px-1.5 py-2">
                <motion.div
                  animate={{ scale: isActive('/') ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/"
                    className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-all duration-200 ease-out ${isActive('/') ? 'text-[#0a193b]' : 'text-[#64748b]'}`}
                  >
                    <div className={`rounded-[10px] p-1.5 transition-all duration-200 ease-out ${isActive('/') ? 'bg-[rgba(10,25,59,0.08)]' : 'bg-transparent'}`}>
                      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 10.5L12 3l9 7.5" />
                        <path d="M5 9.8V20h14V9.8" />
                        <path d="M10 20v-5h4v5" />
                      </svg>
                    </div>
                    <span className={`text-[11px] leading-none transition-colors duration-200 ${isActive('/') ? 'font-medium text-[#0a193b]' : 'font-normal text-[#64748b]'}`}>
                      Home
                    </span>
                  </Link>
                </motion.div>

                <motion.div
                  animate={{ scale: isActive('/order-again') ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/order-again"
                    className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-all duration-200 ease-out ${isActive('/order-again') ? 'text-[#0a193b]' : 'text-[#64748b]'}`}
                  >
                    <div className={`rounded-[10px] p-1.5 transition-all duration-200 ease-out ${isActive('/order-again') ? 'bg-[rgba(10,25,59,0.08)]' : 'bg-transparent'}`}>
                      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8h12l-1 11H7L6 8Z" />
                        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                      </svg>
                    </div>
                    <span className={`text-[11px] leading-none transition-colors duration-200 ${isActive('/order-again') ? 'font-medium text-[#0a193b]' : 'font-normal text-[#64748b]'}`}>
                      Order Again
                    </span>
                  </Link>
                </motion.div>

                <motion.div
                  animate={{ scale: (isActive('/categories') || location.pathname.startsWith('/category/')) ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/categories"
                    className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-all duration-200 ease-out ${(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'text-[#0a193b]' : 'text-[#64748b]'}`}
                  >
                    <div className={`rounded-[10px] p-1.5 transition-all duration-200 ease-out ${(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'bg-[rgba(10,25,59,0.08)]' : 'bg-transparent'}`}>
                      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="6" height="6" rx="1.5" />
                        <rect x="14" y="4" width="6" height="6" rx="1.5" />
                        <rect x="4" y="14" width="6" height="6" rx="1.5" />
                        <rect x="14" y="14" width="6" height="6" rx="1.5" />
                      </svg>
                    </div>
                    <span className={`text-[11px] leading-none transition-colors duration-200 ${(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'font-medium text-[#0a193b]' : 'font-normal text-[#64748b]'}`}>
                      Categories
                    </span>
                  </Link>
                </motion.div>

                <motion.div
                  animate={{ scale: isActive('/subscription') ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/subscription"
                    className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-all duration-200 ease-out ${isActive('/subscription') ? 'text-[#0a193b]' : 'text-[#64748b]'}`}
                  >
                    <div className={`rounded-[10px] p-1.5 transition-all duration-200 ease-out ${isActive('/subscription') ? 'bg-[rgba(10,25,59,0.08)]' : 'bg-transparent'}`}>
                      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3.5" y="6.5" width="17" height="13.5" rx="2.5" />
                        <path d="M8.5 4v5" />
                        <path d="M15.5 4v5" />
                        <path d="M3.5 10.5h17" />
                      </svg>
                    </div>
                    <span className={`text-[11px] leading-none transition-colors duration-200 ${isActive('/subscription') ? 'font-medium text-[#0a193b]' : 'font-normal text-[#64748b]'}`}>
                      Subscription
                    </span>
                  </Link>
                </motion.div>
              </div>
            </nav>
          )}
        </div>
      </div>
    </HomeBackground>
  );
}



