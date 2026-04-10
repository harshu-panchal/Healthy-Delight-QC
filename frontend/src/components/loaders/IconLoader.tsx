import React from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading, LoadingVariant } from '../../context/LoadingContext';
import firstLoadAnimation2 from '@assets/animation/load_churn_curd.json';
import milkPotAnimation from '@assets/animation/load_milk_pot.json';
import milkCanOpenAnimation from '@assets/animation/milk_can_open.json';
import './iconLoader.css';

const VARIANT_ANIMATIONS: Record<LoadingVariant, any> = {
  first: firstLoadAnimation2,
  milk_bottle: milkPotAnimation,
  milk_can_open: milkCanOpenAnimation,
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

  // TEMPORARILY DISABLED: Returning null to hide all loader animations for now.
  return null;

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
            <div className={`lottie-wrapper ${loadingVariant === 'first' ? 'first-load-variant' : ''}`}>
              {animationData && (
                <Lottie
                  animationData={animationData}
                  loop={true}
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
