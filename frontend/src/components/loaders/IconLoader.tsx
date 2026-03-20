import React from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../context/LoadingContext';
import firstLoadAnimation from '@assets/animation/animation.json';
import milkBottleAnimation from '@assets/animation/milk_bottle.json';
import milkAnimation from '@assets/animation/Milk.json';
import './iconLoader.css';

const VARIANT_ANIMATIONS = {
  first: firstLoadAnimation,
  milk_bottle: milkBottleAnimation,
  milk: milkAnimation,
} as const;

interface IconLoaderProps {
  forceShow?: boolean;
}

const IconLoader: React.FC<IconLoaderProps> = ({ forceShow = false }) => {
  const { isRouteLoading, loadingVariant, routeLoadingQuote } = useLoading();
  const show = isRouteLoading || forceShow;
  const path =
    typeof window !== 'undefined' ? window.location.pathname : '';
  const isRestrictedApp =
    path.startsWith('/seller') ||
    path.startsWith('/admin') ||
    path.startsWith('/delivery');

  // Completely disable loader for seller/admin/delivery (no overlay, no animation)
  if (isRestrictedApp) {
    return null;
  }

  const animationData = VARIANT_ANIMATIONS[loadingVariant];

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
            <div className="lottie-wrapper">
              {animationData && (
                <Lottie
                  animationData={animationData}
                  loop={true}
                  className="loader-lottie"
                  style={{ background: 'transparent' }}
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
