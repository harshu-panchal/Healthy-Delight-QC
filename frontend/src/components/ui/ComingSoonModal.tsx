import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName?: string;
}

export default function ComingSoonModal({ isOpen, onClose, locationName }: ComingSoonModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0a193b]/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[400px] bg-white rounded-[24px] overflow-hidden shadow-2xl"
          >
            <div className="p-8 pb-10 flex flex-col items-center text-center">
              {/* Illustration */}
              <div className="w-full h-[180px] mb-8 relative">
                <img
                  src="/assets/coming_soon.png"
                  alt="Coming Soon"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Location Badge */}
              {locationName && (
                <div className="mb-4 px-4 py-1 bg-[#faf5f2] rounded-full ring-1 ring-[#0a193b]/5">
                  <span className="text-[12px] font-semibold text-[#0a193b]/60 uppercase tracking-widest">
                    {locationName}
                  </span>
                </div>
              )}

              {/* Typography */}
              <h2 className="text-[24px] font-bold text-[#0a193b] leading-tight mb-3">
                Coming to your<br />area soon
              </h2>
              <p className="text-[15px] leading-relaxed text-[#475569] px-2 mb-8">
                Sorry we don't serve in your area yet. We'll be expanding Healthy Delight to your location shortly. We'll notify you when we arrive.
              </p>

              {/* Action Buttons */}
              <div className="w-full space-y-3">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-[#0a193b] text-white font-semibold rounded-full shadow-lg shadow-[#0a193b]/10 active:scale-[0.98] transition-all"
                >
                  Explore app
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-transparent text-[#0a193b] font-semibold rounded-full border border-[#0a193b]/10 active:scale-[0.98] transition-all hover:bg-slate-50"
                >
                  Check again
                </button>
              </div>
            </div>

            {/* Subtle decorative bottom element */}
            <div className="h-1.5 w-full bg-[#faf5f2]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
