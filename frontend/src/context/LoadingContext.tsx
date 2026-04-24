import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type LoadingVariant = 'first' | 'milk_delivery' | 'milk_pouring' | 'cow_grazing';

interface LoadingContextType {
  isLoading: boolean;
  isRouteLoading: boolean;
  loadingVariant: LoadingVariant;
  routeLoadingQuote: string | null;
  startLoading: () => void;
  stopLoading: () => void;
  startRouteLoading: () => void;
  stopRouteLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

const ROUTE_LOADER_VARIANTS: LoadingVariant[] = [
  'milk_delivery', 
  'milk_pouring', 
  'cow_grazing'
];
const VARIANT_SPECIFIC_QUOTES: Record<string, string[]> = {
  milk_delivery: ['Charting the path to your doorstep...', 'Daily freshness is on its way'],
  milk_pouring: ['Pouring nature\'s best for you...', 'Curating pure goodness in every drop'],
  cow_grazing: ['Grazing in green pastures...', 'From our happy farms to your home'],
  first: []
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isExcludedInitially = 
    window.location.pathname.startsWith('/seller') ||
    window.location.pathname.startsWith('/admin') ||
    window.location.pathname.startsWith('/delivery') ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/signup';

  const [isLoading, setIsLoading] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(!isExcludedInitially); // Prevent flash on login/admin/etc
  const [loadingVariant, setLoadingVariant] = useState<LoadingVariant>('first');
  const [routeLoadingQuote, setRouteLoadingQuote] = useState<string | null>(null);
  const hasCompletedFirstLoadRef = useRef(false);
  const routeQuoteIndexRef = useRef(0);
  const loadingStartTime = useRef<number | null>(null);
  const routeLoadingStartTime = useRef<number | null>(Date.now()); // Start timing immediately
  const activeRequests = useRef(0);
  const activeRouteRequests = useRef(isExcludedInitially ? 0 : 1); // Match initial state
  const MINIMUM_LOADING_TIME = 800; // Snappier loading (800ms) for better UX

  const safetyTimer = useRef<NodeJS.Timeout | null>(null);
  const routeSafetyTimer = useRef<NodeJS.Timeout | null>(null);

  // --- API / General Loading ---
  const startLoading = useCallback(() => {
    activeRequests.current += 1;
    if (activeRequests.current === 1) {
      loadingStartTime.current = Date.now();
      setIsLoading(true);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      safetyTimer.current = setTimeout(() => {
        if (activeRequests.current > 0) {
          activeRequests.current = 0;
          setIsLoading(false);
        }
      }, 15000);
    }
  }, []);

  const stopLoading = useCallback(() => {
    activeRequests.current = Math.max(0, activeRequests.current - 1);
    if (activeRequests.current === 0) {
      if (safetyTimer.current) {
        clearTimeout(safetyTimer.current);
        safetyTimer.current = null;
      }
      const now = Date.now();
      const startTime = loadingStartTime.current || now;
      const elapsed = now - startTime;
      const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsed);
      setTimeout(() => {
        if (activeRequests.current === 0) {
          setIsLoading(false);
          loadingStartTime.current = null;
        }
      }, remainingTime);
    }
  }, []);

  // --- Route / Reload Loading ---
  const startRouteLoading = useCallback(() => {
    activeRouteRequests.current += 1;
    if (activeRouteRequests.current === 1) {
      if (hasCompletedFirstLoadRef.current) {
        const variant = ROUTE_LOADER_VARIANTS[Math.floor(Math.random() * ROUTE_LOADER_VARIANTS.length)];
        setLoadingVariant(variant);
        
        const quotes = VARIANT_SPECIFIC_QUOTES[variant] || [];
        if (quotes.length > 0) {
          // Select a random quote from the specific variant's list
          const quoteIdx = Math.floor(Math.random() * quotes.length);
          setRouteLoadingQuote(quotes[quoteIdx]);
        } else {
          setRouteLoadingQuote(null);
        }
      } else {
        // First load: keep main loader clean (no quote)
        setRouteLoadingQuote(null);
      }
      routeLoadingStartTime.current = Date.now();
      setIsRouteLoading(true);
      if (routeSafetyTimer.current) clearTimeout(routeSafetyTimer.current);
      routeSafetyTimer.current = setTimeout(() => {
        if (activeRouteRequests.current > 0) {
          activeRouteRequests.current = 0;
          setIsRouteLoading(false);
        }
      }, 10000); // 10s safety for routes
    }
  }, []);

  const stopRouteLoading = useCallback(() => {
    activeRouteRequests.current = Math.max(0, activeRouteRequests.current - 1);
    if (activeRouteRequests.current === 0) {
      if (routeSafetyTimer.current) {
        clearTimeout(routeSafetyTimer.current);
        routeSafetyTimer.current = null;
      }
      const now = Date.now();
      const startTime = routeLoadingStartTime.current || now;
      const elapsed = now - startTime;
      const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsed);
      setTimeout(() => {
        if (activeRouteRequests.current === 0) {
          hasCompletedFirstLoadRef.current = true;
          setIsRouteLoading(false);
          routeLoadingStartTime.current = null;
        }
      }, remainingTime);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{
      isLoading,
      isRouteLoading,
      loadingVariant,
      routeLoadingQuote,
      startLoading,
      stopLoading,
      startRouteLoading,
      stopRouteLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
