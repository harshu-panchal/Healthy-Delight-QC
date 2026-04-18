import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading, LoadingVariant } from '../../context/LoadingContext';

// .lottie Assets
import milkLottie from '@assets/animation/Milk.lottie';
import cowLottie from '@assets/animation/Cow_Drink_Milk.lottie';
import cheeseLottie from '@assets/animation/Cheese.lottie';
import iceCreamLottie from '@assets/animation/Ice_cream.lottie';
import butterLottie from '@assets/animation/Spreading_butter.lottie';

import './iconLoader.css';

const VARIANT_ANIMATIONS: Record<LoadingVariant, string> = {
  first: milkLottie,
  milk_bottle: milkLottie,
  milk_can_open: cowLottie,
  cheese: cheeseLottie,
  cow_drink: cowLottie,
  ice_cream: iceCreamLottie,
  milk: milkLottie,
  spreading_butter: butterLottie,
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

  // Should not show on restricted portals
  if (isRestrictedApp && !forceShow) return null;

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
                <DotLottieReact
                  src={animationSrc}
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
