import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading, LoadingVariant } from '../../context/LoadingContext';

import './iconLoader.css';

interface IconLoaderProps {
  forceShow?: boolean;
}

const IconLoader: React.FC<IconLoaderProps> = ({ forceShow = false }) => {
  const { isRouteLoading, loadingVariant, routeLoadingQuote } = useLoading();
  const [animationData, setAnimationData] = useState<any>(null);
  const [loadingAnim, setLoadingAnim] = useState(false);

  const show = isRouteLoading || forceShow;
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isRestrictedApp =
    path.startsWith('/seller') ||
    path.startsWith('/admin') ||
    path.startsWith('/delivery');

  // Load Lottie JSON dynamic chunks on demand
  useEffect(() => {
    if (isRestrictedApp) return;

    let active = true;
    const loadAnim = async () => {
      setLoadingAnim(true);
      try {
        let data: any = null;
        if (loadingVariant === 'milk_delivery') {
          const res = await fetch('/assets/animation/milk_delivery.json');
          data = await res.json();
        } else if (loadingVariant === 'milk_pouring' || loadingVariant === 'first') {
          const res = await fetch('/assets/animation/milk_pouring.json');
          data = await res.json();
        } else if (loadingVariant === 'cow_grazing') {
          const res = await fetch('/assets/animation/cow_grazing.json');
          data = await res.json();
        }
        if (active) {
          setAnimationData(data);
        }
      } catch (err) {
        console.error('Failed to load dynamic Lottie animation', err);
      } finally {
        if (active) {
          setLoadingAnim(false);
        }
      }
    };

    loadAnim();
    return () => {
      active = false;
    };
  }, [loadingVariant, isRestrictedApp]);

  // Never show on restricted portals, regardless of forceShow
  if (isRestrictedApp) return null;

  const isAuthEntryPage =
    path === '/login' ||
    path === '/user/login' ||
    path === '/signup' ||
    path === '/user/signup';

  // Should not show on login, or signup pages unless forced
  if (isAuthEntryPage && !forceShow) return null;

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
              {!loadingAnim && animationData && (
                <Lottie
                  animationData={animationData}
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
