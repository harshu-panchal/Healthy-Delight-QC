import React from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading, LoadingVariant } from '../../context/LoadingContext';

// JSON Animation Assets
import milkDelivery from '@assets/animation/milk_delivery.json';
import milkPouring from '@assets/animation/milk_pouring.json';
import cowGrazing from '@assets/animation/cow_grazing.json';

import './iconLoader.css';

const VARIANT_ANIMATIONS: Record<LoadingVariant, any> = {
  first: milkPouring,
  milk_delivery: milkDelivery,
  milk_pouring: milkPouring,
  cow_grazing: cowGrazing,
};

interface IconLoaderProps {
  forceShow?: boolean;
}

const IconLoader: React.FC<IconLoaderProps> = ({ forceShow = false }) => {
  const { isRouteLoading, loadingVariant, routeLoadingQuote } = useLoading();
  const show = isRouteLoading || forceShow;
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isRestrictedApp =
    path.startsWith('/seller') ||
    path.startsWith('/admin') ||
    path.startsWith('/delivery');

  // Should not show on restricted portals, login, or signup pages
  const isAuthEntryPage = path === '/login' || path === '/signup';
  if ((isRestrictedApp || isAuthEntryPage) && !forceShow) return null;

  const animationSrc = VARIANT_ANIMATIONS[loadingVariant];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="global-loader-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="loader-container">
            <div className={`lottie-wrapper ${loadingVariant === 'first' ? 'first-load-variant' : ''}`}>
              {animationSrc && (
                <Lottie
                  animationData={animationSrc}
                  loop={true}
                  autoplay={true}
                  className="loader-lottie"
                  style={{ backgroundColor: 'transparent' }}
                />
              )}
            </div>
            {loadingVariant !== 'first' && routeLoadingQuote && (
              <p className="loader-quote">"{routeLoadingQuote}"</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IconLoader;
