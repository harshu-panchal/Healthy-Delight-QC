import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingCartPill from './FloatingCartPill';
import { useLocation as useLocationContext } from '../hooks/useLocation';
import LocationPermissionRequest from './LocationPermissionRequest';
import { useThemeContext } from '../context/ThemeContext';
import HomeBackground from './ui/HomeBackground';
import Footer from './ui/Footer';
import logo from '../../assets/logo.png';
import ComingSoonModal from './ui/ComingSoonModal';
import { useAuth } from '../context/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isLocationEnabled, isLocationLoading, location: userLocation } = useLocationContext();
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [showLocationChangeModal, setShowLocationChangeModal] = useState(false);
  const { currentTheme, setActiveCategory } = useThemeContext();
  const [isListening, setIsListening] = useState(false);
  const [isHeaderOpaque, setIsHeaderOpaque] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const lastScrollY = useRef(0);

  const isActive = (path: string) => location.pathname === path;
  const isAppHome = isActive('/user') || isActive('/') && isAuthenticated; // Helper for app home state
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Close sidebar on navigation
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

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

  // Demo Trigger for Coming Soon Modal
  useEffect(() => {
    const isDemo = searchParams.get('demo') === 'comingsoon';
    if (isDemo || userLocation?.address?.toLowerCase()?.includes('coming soon')) {
      setShowComingSoon(true);
    }
  }, [userLocation, searchParams]);

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
      const mainScrolledY = mainElement?.scrollTop || 0;
      const windowScrolledY = window.scrollY || 0;
      const currentScrollY = mainScrolledY || windowScrolledY;
      
      setIsHeaderOpaque(currentScrollY > 6);
      lastScrollY.current = currentScrollY;
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
  const isCategoriesPage = location.pathname === '/categories';
  const isCollectionPage = location.pathname.startsWith('/collection/');
  const isAllStoresPage = location.pathname === '/stores';
  const isOrderAgainPage = location.pathname === '/order-again';
  const isCheckoutPage = location.pathname === '/checkout' || location.pathname.startsWith('/checkout/');
  const isCartPage = location.pathname === '/cart';
  const isSubscriptionPage = location.pathname === '/subscription';
  const isWishlistPage = location.pathname === '/wishlist';
  
  // Header visibility logic
  const showHeader = isSearchPage && !isCheckoutPage && !isCartPage;
  const showSearchBar = isSearchPage && !isCheckoutPage && !isCartPage;
  const showFooter = !isCheckoutPage && !isProductDetailPage;
  
  // Determine dynamic search placeholder
  const getSearchPlaceholder = () => {
    if (isListening) return "Listening...";
    if (isCategoriesPage) return "Search for categories...";
    if (isCollectionPage) return "Search in this collection...";
    if (isAllStoresPage) return "Search for marketplace stores...";
    if (isOrderAgainPage) return "Search your order history...";
    if (isSubscriptionPage) return "Search for plans and benefits...";
    if (isWishlistPage) return "Search for saved items...";
    return "Search for healthy delights...";
  };

  return (
    <HomeBackground className="flex min-h-screen w-full bg-transparent overflow-x-hidden">
      {/* Dimmed Overlay for Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer - Desktop & Mobile (Hidden initially, slides from left) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] z-[100] bg-white shadow-[8px_0_40px_rgba(0,0,0,0.1)] flex flex-col"
          >
            {/* Sidebar Header with Close Button */}
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <Link to="/user" onClick={() => { closeSidebar(); setActiveCategory('all'); }}>
                <img src={logo} alt="Healthy Delight" className="h-10 w-auto object-contain" />
              </Link>
              <button 
                onClick={closeSidebar}
                className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
                aria-label="Close menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
              <Link
                to="/user"
                onClick={() => setActiveCategory('all')}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 group ${isActive('/user') ? 'bg-[#0a193b] text-white shadow-lg shadow-primary-500/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive('/user') ? 'text-white' : 'text-neutral-400 group-hover:text-primary-500'}>
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="font-bold text-[16px]">Home</span>
              </Link>

              <Link
                to="/order-again"
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 group ${isActive('/order-again') ? 'bg-[#0a193b] text-white shadow-lg shadow-primary-500/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive('/order-again') ? 'text-white' : 'text-neutral-400 group-hover:text-primary-500'}>
                  <path d="M6 8h12l-1 11H7L6 8Z" />
                  <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                </svg>
                <span className="font-bold text-[16px]">Order Again</span>
              </Link>

              <Link
                to="/categories"
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 group ${(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'bg-[#0a193b] text-white shadow-lg shadow-primary-500/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'text-white' : 'text-neutral-400 group-hover:text-primary-500'}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span className="font-bold text-[16px]">Categories</span>
              </Link>

              <Link
                to="/subscription"
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 group ${isActive('/subscription') ? 'bg-[#0a193b] text-white shadow-lg shadow-primary-500/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive('/subscription') ? 'text-white' : 'text-neutral-400 group-hover:text-primary-500'}>
                  <rect x="3" y="4" width="18" height="15" rx="2" />
                  <path d="M12 2v2M7 10h10M12 4v4" />
                </svg>
                <span className="font-bold text-[16px]">Subscription</span>
              </Link>
            </div>

            {/* Footer of Sidebar */}
            <div className="p-6 border-t border-neutral-100 bg-neutral-50/50">
              <Link 
                to="/account"
                onClick={closeSidebar}
                className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-neutral-100 shadow-sm hover:border-primary-500/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#0a193b] text-white flex items-center justify-center shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-neutral-900 truncate">Account</p>
                  <p className="text-[13px] text-neutral-500 truncate font-medium">Settings & Profile</p>
                </div>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className={`flex-1 flex flex-col min-w-0 bg-transparent`}>
        {/* Desktop Top Header (Fixed at top) */}
        {showFooter && (
          <header 
            className="hidden md:flex fixed top-0 right-0 z-[80] h-24 items-center justify-between px-10 transition-all duration-300"
            style={{
              width: isSidebarOpen ? 'calc(100% - 280px)' : '100%',
              left: isSidebarOpen ? '280px' : '0',
              background: isHeaderOpaque
                ? '#0a193b'
                : 'linear-gradient(180deg, rgba(10, 25, 59, 0.95) 0%, rgba(10, 25, 59, 0.7) 100%)',
              boxShadow: isHeaderOpaque ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
              backdropFilter: isHeaderOpaque ? "none" : "blur(12px)",
              borderBottom: isHeaderOpaque ? "1px solid rgba(255,255,255,0.05)" : "none"
            }}
          >
            {/* Hamburger + Logo Section */}
            <div className="flex items-center gap-6">
              <button 
                onClick={toggleSidebar}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 group"
                aria-label="Open menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              
              <Link to="/user" onClick={() => setActiveCategory('all')} className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
                <img src={logo} alt="Healthy Delight" className="h-[42px] w-auto object-contain brightness-0 invert" />
              </Link>

              {/* Delivery Location integrated into Header */}
              {userLocation && (userLocation.address || userLocation.city) && (
                <div className="hidden lg:flex items-center gap-3 pl-6 ml-2 border-l border-white/10 h-10">
                  <div className="flex flex-col items-start leading-tight">
                    <div className="flex items-center gap-1.5 text-white opacity-60">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deliver to</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <span className="text-[13px] text-white font-black truncate">
                        {userLocation?.address || `${userLocation.city}, ${userLocation.state}`}
                      </span>
                      <button
                        onClick={() => setShowLocationChangeModal(true)}
                        className="text-[10px] font-black text-white px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 transition-all uppercase tracking-wider"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar Center (Fixed Width, Responsive centering) */}
            <div className="flex-1 max-w-2xl mx-12">
              <div className="relative group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={getSearchPlaceholder()}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
                  className="w-full h-14 bg-white/10 rounded-2xl px-12 py-2 text-[15px] font-bold text-white placeholder-white/50 focus:ring-2 focus:ring-white/20 focus:bg-white/20 border border-transparent transition-all shadow-[0_2px_10px_rgba(0,0,0,0.1)] focus:shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <button
                  onClick={startVoiceSearch}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 shadow-inner animate-pulse' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Profile Right */}
            <div className="flex items-center gap-4">
               <Link
                to="/account"
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg hover:scale-105 hover:bg-white/20 active:scale-95 transition-all"
                aria-label="Profile"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            </div>
          </header>
        )}

        {/* Existing Premium Sticky Header logic - Handled for mobile/search page */}
        {(showHeader || (isSearchPage && !showFooter)) && (
          <header
            className="sticky top-0 z-50 md:hidden transition-all duration-300"
            style={{
              background: isHeaderOpaque
                ? '#0a193b'
                : 'linear-gradient(180deg, rgba(10, 25, 59, 0.85) 0%, rgba(15, 37, 82, 0.7) 100%)',
              boxShadow: isHeaderOpaque ? "0 4px 12px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.04)",
              backdropFilter: isHeaderOpaque ? "none" : "blur(12px)"
            }}
          >
            {/* Same location line for mobile */}
            {userLocation && (userLocation.address || userLocation.city) && (
               <div className="px-5 py-2.5 flex items-center justify-between gap-4 border-b border-white/10 shadow-inner">
                 <div className="flex items-center gap-2 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/60 flex-shrink-0">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-white/80 text-[13px] font-bold truncate" title={userLocation?.address || ''}>
                      {userLocation?.address || `${userLocation.city}, ${userLocation.state}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowLocationChangeModal(true)}
                    className="text-white/60 text-[11px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors flex-shrink-0"
                  >
                    Change
                  </button>
               </div>
            )}

            {/* Mobile Search bar */}
            {showSearchBar && (
              <div className="px-5 py-3 flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isSearchPage && (
                    <button
                      onClick={() => navigate(-1)}
                      className="p-2 -ml-2 text-white/80 transition-all bg-white/10 rounded-xl border border-white/20"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder={isListening ? "Listening..." : "Search..."}
                      className="w-full h-11 bg-white rounded-2xl px-11 py-2 text-[15px] font-bold text-neutral-high placeholder-slate-400 focus:ring-4 focus:ring-primary-500/20 transition-all shadow-lg"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </header>
        )}

        {/* Scrollable Main Content */}
        <main 
          id="app-main-scroll" 
          ref={mainRef} 
          className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 md:pb-0 bg-transparent ${showFooter || showHeader ? 'md:pt-24' : 'md:pt-0'}`}
        >
          <div className={`w-full max-w-[1240px] mx-auto px-0 md:px-10 pt-0 pb-6 ${showFooter || showHeader ? 'md:py-10' : 'md:py-0'}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="w-full min-h-full"
                onAnimationComplete={() => {
                  if (mainRef.current) mainRef.current.scrollTop = 0;
                  window.scrollTo(0, 0);
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Global Desktop Footer - Full Width Background */}
          {showFooter && <Footer />}
        </main>

        {/* Floating elements & Modals */}
        <FloatingCartPill />

        {showLocationRequest && (
          <LocationPermissionRequest
            onLocationGranted={() => setShowLocationRequest(false)}
            skipable={false}
          />
        )}

        {showLocationChangeModal && (
          <LocationPermissionRequest
            onLocationGranted={() => setShowLocationChangeModal(false)}
            skipable={true}
          />
        )}

        {/* Fixed Bottom Navigation - Mobile Only */}
        {showFooter && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-[60] md:hidden transition-all duration-300 ease-in-out"
            style={{
              background: '#ffffff',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <div className="grid grid-cols-4 items-center px-1.5 py-2">
              <Link to="/user" className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 ${isActive('/user') ? 'text-[#0a193b]' : 'text-[#64748b]'}`}>
                <div className={`rounded-[10px] p-1.5 ${isActive('/user') ? 'bg-[rgba(10,25,59,0.08)]' : ''}`}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.8V20h14V9.8" /><path d="M10 20v-5h4v5" />
                  </svg>
                </div>
                <span className="text-[11px] font-black tracking-tight">Home</span>
              </Link>
              <Link to="/order-again" className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 ${isActive('/order-again') ? 'text-[#0a193b]' : 'text-[#64748b]'}`}>
                <div className={`rounded-[10px] p-1.5 ${isActive('/order-again') ? 'bg-[rgba(10,25,59,0.08)]' : ''}`}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8h12l-1 11H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
                  </svg>
                </div>
                <span className="text-[11px] font-black tracking-tight">Order Again</span>
              </Link>
              <Link to="/categories" className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 ${(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'text-[#0a193b]' : 'text-[#64748b]'}`}>
                <div className={`rounded-[10px] p-1.5 ${(isActive('/categories') || location.pathname.startsWith('/category/')) ? 'bg-[rgba(10,25,59,0.08)]' : ''}`}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" />
                  </svg>
                </div>
                <span className="text-[11px] font-black tracking-tight">Categories</span>
              </Link>
              <Link to="/subscription" className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 ${isActive('/subscription') ? 'text-[#0a193b]' : 'text-[#64748b]'}`}>
                <div className={`rounded-[10px] p-1.5 ${isActive('/subscription') ? 'bg-[rgba(10,25,59,0.08)]' : ''}`}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="6.5" width="17" height="13.5" rx="2.5" /><path d="M8.5 4v5" /><path d="M15.5 4v5" /><path d="M3.5 10.5h17" />
                  </svg>
                </div>
                <span className="text-[11px] font-black tracking-tight">Subscription</span>
              </Link>
            </div>
          </nav>
        )}
      </div>

      <ComingSoonModal 
        isOpen={showComingSoon} 
        onClose={() => setShowComingSoon(false)} 
        locationName={userLocation?.city || userLocation?.address}
      />
    </HomeBackground>
  );
}



