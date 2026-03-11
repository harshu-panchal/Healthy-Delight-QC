import React from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../context/LoadingContext';
import loadingAnimation from '../../../assets/animation/Milk.json';
import './iconLoader.css';

interface IconLoaderProps {
  forceShow?: boolean;
}

const IconLoader: React.FC<IconLoaderProps> = ({ forceShow = false }) => {
  const { isRouteLoading } = useLoading();
  const show = isRouteLoading || forceShow;

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
              <Lottie
                animationData={loadingAnimation}
                loop={true}
                className="loader-lottie"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IconLoader;
