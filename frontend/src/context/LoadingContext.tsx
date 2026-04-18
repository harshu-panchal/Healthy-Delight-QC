import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type LoadingVariant = 'first' | 'milk_bottle' | 'milk_can_open' | 'cheese' | 'cow_drink' | 'ice_cream' | 'milk' | 'spreading_butter';

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
  'milk_bottle', 
  'milk_can_open', 
  'cheese', 
  'cow_drink', 
  'ice_cream', 
  'milk', 
  'spreading_butter'
];
const VARIANT_SPECIFIC_QUOTES: Record<string, string[]> = {
  milk: ['Collected fresh, delivered right'],
  milk_bottle: ['Collected fresh, delivered right'],
  cow_drink: ['From free-grazing farms to your home'],
  milk_can_open: ['From free-grazing farms to your home'],
  cheese: ['Artisan dairy, made with patience'],
  ice_cream: ['A scoop of pure delight'],
  spreading_butter: ['Pure butter, simply made'],
  first: []
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(true); // Default to true for full page reload
  const [loadingVariant, setLoadingVariant] = useState<LoadingVariant>('first');
  const [routeLoadingQuote, setRouteLoadingQuote] = useState<string | null>(null);
  const hasCompletedFirstLoadRef = useRef(false);
  const routeQuoteIndexRef = useRef(0);
  const loadingStartTime = useRef<number | null>(null);
  const routeLoadingStartTime = useRef<number | null>(Date.now()); // Start timing immediately
  const activeRequests = useRef(0);
  const activeRouteRequests = useRef(1); // Start with 1 to represent initial page load
  const MINIMUM_LOADING_TIME = 3000; // 3 seconds (was 1s; +2s so Lottie can play completely)

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
