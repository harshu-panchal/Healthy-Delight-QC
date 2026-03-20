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
  const [categoriesRotation, setCategoriesRotation] = useState(0);
  const [prevCategoriesActive, setPrevCategoriesActive] = useState(false);
  const { isLocationEnabled, isLocationLoading, location: userLocation } = useLocationContext();
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [showLocationChangeModal, setShowLocationChangeModal] = useState(false);
  const { currentTheme } = useThemeContext();
  const [isListening, setIsListening] = useState(false);

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

  // Track categories active state for rotation
  const isCategoriesActive = isActive('/categories') || location.pathname.startsWith('/category/');

  useEffect(() => {
    if (isCategoriesActive && !prevCategoriesActive) {
      // Rotate clockwise when clicked (becoming active)
      setCategoriesRotation(prev => prev + 360);
      setPrevCategoriesActive(true);
    } else if (!isCategoriesActive && prevCategoriesActive) {
      // Rotate counter-clockwise when unclicked (becoming inactive)
      setCategoriesRotation(prev => prev - 360);
      setPrevCategoriesActive(false);
    }
  }, [isCategoriesActive, prevCategoriesActive]);

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

          {/* Sticky Header - Show on search page and other non-home pages, excluding account page */}
          {(showHeader || isSearchPage) && (
            <header className="sticky top-0 z-50 bg-white shadow-sm md:shadow-md md:top-[60px]">
              {/* Location line - only show if user has provided location */}
              {userLocation && (userLocation.address || userLocation.city) && (
                <div className="px-4 md:px-6 lg:px-8 py-2 flex items-center justify-between text-sm">
                  <span className="text-neutral-700 line-clamp-1" title={userLocation?.address || ''}>
                    {userLocation?.address
                      ? userLocation.address.length > 50
                        ? `${userLocation.address.substring(0, 50)}...`
                        : userLocation.address
                      : userLocation?.city && userLocation?.state
                        ? `${userLocation.city}, ${userLocation.state}`
                        : userLocation?.city || ''}
                  </span>
                  <button
                    onClick={() => setShowLocationChangeModal(true)}
                    className="text-blue-600 font-medium hover:text-blue-700 transition-colors flex-shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Search bar - Hidden on Order Again page */}
              {showSearchBar && (
                <div className="px-4 md:px-6 lg:px-8 pb-3 flex items-center gap-2">
                  <div className="max-w-2xl md:mx-auto flex items-center gap-2 flex-1 min-w-0">
                    {isSearchPage && (
                      <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-neutral-600 hover:text-emerald-600 transition-colors flex-shrink-0"
                        title="Back"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Search for products..."}
                        className="w-full px-4 py-2.5 pl-10 pr-10 bg-neutral-50 border border-neutral-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent md:py-3 transition-all"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                      </span>
                      {/* Voice Search Icon */}
                      <button
                        onClick={startVoiceSearch}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-500' : 'text-neutral-500 hover:bg-neutral-200'}`}
                        aria-label="Voice search"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="22"></line>
                          <line x1="8" y1="22" x2="16" y2="22"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Profile - right side of header */}
                  <Link
                    to="/account"
                    className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors flex-shrink-0"
                    aria-label="Profile"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </header>
          )}

          {/* Scrollable Main Content */}
          <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 md:pb-8 bg-transparent" style={{ background: 'transparent' }}>
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
              className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200/10 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] z-50 md:hidden"
            >
              <div className="flex justify-around items-center h-16">
                {/* Home */}
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="flex-1 h-full"
                >
                  <Link
                    to="/"
                    className="flex flex-col items-center justify-center h-full relative"
                  >
                    <div className="flex flex-col items-center justify-center relative z-10">
                      <motion.svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        animate={isActive('/') ? {
                          scale: [1, 1.1, 1],
                          y: [0, -2, 0]
                        } : {}}
                        transition={{
                          duration: 0.4,
                          ease: "easeInOut",
                          repeat: isActive('/') ? Infinity : 0,
                          repeatDelay: 2
                        }}
                      >
                        {isActive('/') ? (
                          <>
                            {/* Roof */}
                            <path d="M2 12L12 4L22 12" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#22c55e" />
                            {/* House body */}
                            <rect x="4" y="12" width="16" height="8" fill="#22c55e" stroke="#1f2937" strokeWidth="2" strokeLinejoin="round" />
                            {/* Chimney */}
                            <rect x="15" y="5" width="4" height="5" fill="#1f2937" stroke="#1f2937" strokeWidth="2" />
                            {/* Door */}
                            <rect x="8" y="15" width="4" height="5" fill="#1f2937" />
                          </>
                        ) : (
                          <>
                            {/* Roof */}
                            <path d="M2 12L12 4L22 12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            {/* House body */}
                            <rect x="4" y="12" width="16" height="8" stroke="#6b7280" strokeWidth="2" strokeLinejoin="round" fill="none" />
                            {/* Chimney */}
                            <rect x="15" y="5" width="4" height="5" stroke="#6b7280" strokeWidth="2" fill="none" />
                            {/* Door */}
                            <rect x="8" y="15" width="4" height="5" stroke="#6b7280" strokeWidth="2" fill="none" />
                          </>
                        )}
                      </motion.svg>
                    </div>
                    <span className={`text-xs mt-0.5 relative z-10 ${isActive('/') ? 'font-medium text-neutral-700' : 'font-medium text-neutral-500'}`}>
                      Home
                    </span>
                  </Link>
                </motion.div>

                {/* Order Again */}
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="flex-1 h-full"
                >
                  <Link
                    to="/order-again"
                    className="flex flex-col items-center justify-center h-full relative"
                  >
                    <div className="flex flex-col items-center justify-center relative z-10">
                      <motion.svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        animate={isActive('/order-again') ? {
                          scale: [1, 1.1, 1],
                          y: [0, -2, 0]
                        } : {}}
                        transition={{
                          duration: 0.4,
                          ease: "easeInOut",
                          repeat: isActive('/order-again') ? Infinity : 0,
                          repeatDelay: 2
                        }}
                      >
                        {isActive('/order-again') ? (
                          <>
                            {/* Shopping bag body */}
                            <path d="M5 8V6C5 4.34315 6.34315 3 8 3H16C17.6569 3 19 4.34315 19 6V8H21C21.5523 8 22 8.44772 22 9V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V9C2 8.44772 2.44772 8 3 8H5Z" fill="#22c55e" stroke="#1f2937" strokeWidth="2" strokeLinejoin="round" />
                            {/* Handles */}
                            <path d="M7 8V6C7 5.44772 7.44772 5 8 5H16C16.5523 5 17 5.44772 17 6V8" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none" />
                          </>
                        ) : (
                          <>
                            {/* Shopping bag body */}
                            <path d="M5 8V6C5 4.34315 6.34315 3 8 3H16C17.6569 3 19 4.34315 19 6V8H21C21.5523 8 22 8.44772 22 9V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V9C2 8.44772 2.44772 8 3 8H5Z" stroke="#6b7280" strokeWidth="2" strokeLinejoin="round" fill="none" />
                            {/* Handles */}
                            <path d="M7 8V6C7 5.44772 7.44772 5 8 5H16C16.5523 5 17 5.44772 17 6V8" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" fill="none" />
                          </>
                        )}
                        {/* Heart inside basket - grows when active, shrinks when inactive */}
                        <AnimatePresence>
                          {isActive('/order-again') && (
                            <motion.path
                              key="heart"
                              d="M12 17C11.5 16.5 8 13.5 8 11.5C8 10 9 9 10.5 9C11.2 9 11.8 9.3 12 9.7C12.2 9.3 12.8 9 13.5 9C15 9 16 10 16 11.5C16 13.5 12.5 16.5 12 17Z"
                              fill="#1f2937"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.svg>
                    </div>
                    <span className={`text-xs mt-0.5 relative z-10 ${isActive('/order-again') ? 'font-medium text-neutral-700' : 'font-medium text-neutral-500'}`}>
                      Order Again
                    </span>
                  </Link>
                </motion.div>

                {/* Categories */}
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="flex-1 h-full"
                >
                  <Link
                    to="/categories"
                    className="flex flex-col items-center justify-center h-full relative"
                  >
                    <div className="flex flex-col items-center justify-center relative z-10">
                      <motion.svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        animate={{
                          rotate: categoriesRotation
                        }}
                        transition={{
                          duration: 0.5,
                          ease: "easeInOut"
                        }}
                        style={{ transformOrigin: 'center' }}
                      >
                        {(isActive('/categories') || location.pathname.startsWith('/category/')) ? (
                          <>
                            {/* Top-left and bottom-right are black when active */}
                            <circle cx="7" cy="7" r="2.5" fill="#1f2937" stroke="#1f2937" strokeWidth="2" />
                            <circle cx="17" cy="7" r="2.5" fill="#22c55e" stroke="#1f2937" strokeWidth="2" />
                            <circle cx="7" cy="17" r="2.5" fill="#22c55e" stroke="#1f2937" strokeWidth="2" />
                            <circle cx="17" cy="17" r="2.5" fill="#1f2937" stroke="#1f2937" strokeWidth="2" />
                          </>
                        ) : (
                          <>
                            <circle cx="7" cy="7" r="2.5" stroke="#6b7280" strokeWidth="2" fill="none" />
                            <circle cx="17" cy="7" r="2.5" stroke="#6b7280" strokeWidth="2" fill="none" />
                            <circle cx="7" cy="17" r="2.5" stroke="#6b7280" strokeWidth="2" fill="none" />
                            <circle cx="17" cy="17" r="2.5" stroke="#6b7280" strokeWidth="2" fill="none" />
                          </>
                        )}
                      </motion.svg>
                    </div>
                    <span className={`text-xs mt-0.5 relative z-10 ${(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'font-medium text-neutral-700' : 'font-medium text-neutral-500'}`}>
                      Categories
                    </span>
                  </Link>
                </motion.div>

                {/* Subscription - last (niche) */}
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="flex-1 h-full"
                >
                  <Link
                    to="/subscription"
                    className="flex flex-col items-center justify-center h-full relative"
                  >
                    <div className="flex flex-col items-center justify-center relative z-10">
                      <motion.svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        animate={isActive('/subscription') ? {
                          scale: [1, 1.05, 1]
                        } : {}}
                        transition={{
                          duration: 0.5,
                          ease: "easeInOut",
                          repeat: isActive('/subscription') ? Infinity : 0,
                          repeatDelay: 1.5
                        }}
                      >
                        {isActive('/subscription') ? (
                          <>
                            <path
                              d="M19 8H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z"
                              fill="#22c55e"
                              stroke="#1f2937"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <polyline points="8 2 12 6 8 10" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <line x1="12" y1="6" x2="16" y2="6" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        ) : (
                          <>
                            <path
                              d="M19 8H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z"
                              stroke="#6b7280"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <polyline points="8 2 12 6 8 10" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="6" x2="16" y2="6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}
                      </motion.svg>
                    </div>
                    <span className={`text-xs mt-0.5 relative z-10 ${isActive('/subscription') ? 'font-medium text-neutral-700' : 'font-medium text-neutral-500'}`}>
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

