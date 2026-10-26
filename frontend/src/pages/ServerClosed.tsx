import React, { useState } from 'react';
import { motion } from 'framer-motion';
import logo from '../../assets/logo.png';

export default function ServerClosed() {
  const [isChecking, setIsChecking] = useState(false);

  const handleRefresh = () => {
    setIsChecking(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f6f2] flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 font-sans relative overflow-hidden select-none">
      {/* Decorative Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0a193b]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with Brand */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 z-10">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Healthy Delight"
            className="h-10 sm:h-12 w-auto object-contain"
            onError={(e) => {
              // Fallback if asset path varies
              (e.target as HTMLImageElement).src = '/assets/logo.png';
            }}
          />
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>Maintenance Mode</span>
        </div>
      </header>

      {/* Center Hero Card */}
      <main className="w-full max-w-xl my-auto py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(10,25,59,0.08)] border border-neutral-100 flex flex-col items-center text-center relative"
        >
          {/* Server Icon with Animated Ring */}
          <div className="relative mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#0a193b] flex items-center justify-center text-white shadow-xl shadow-[#0a193b]/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-amber-400"
              >
                {/* Server rack with offline indicator */}
                <rect width="20" height="8" x="2" y="2" rx="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" />
                <line x1="6" x2="6.01" y1="6" y2="6" strokeWidth="2.5" />
                <line x1="6" x2="6.01" y1="18" y2="18" strokeWidth="2.5" />
                <path d="M14 6h4" />
                <path d="M14 18h4" />
              </svg>
            </div>
            {/* Offline Badge */}
            <span className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1.5 shadow-md border-2 border-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-3">
            Server is Currently Closed
          </h1>

          {/* Detailed Message */}
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed mb-6 max-w-md">
            Our servers are temporarily offline for scheduled system upgrades and maintenance. All website services, orders, and portal features are currently paused.
          </p>

          {/* Feature Status Cards */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-8 text-left">
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Status</span>
              <span className="text-xs sm:text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Under Work
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">All Portals</span>
              <span className="text-xs sm:text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Offline
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Data & Orders</span>
              <span className="text-xs sm:text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Safe & Secure
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRefresh}
              disabled={isChecking}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-[#0a193b] text-white font-semibold text-sm hover:bg-[#07122b] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#0a193b]/15 flex items-center justify-center gap-2 disabled:opacity-75"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isChecking ? 'animate-spin' : ''}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>{isChecking ? 'Checking Server...' : 'Check Again / Refresh'}</span>
            </button>
          </div>

          {/* Reassurance note */}
          <p className="text-[11px] sm:text-xs text-neutral-400 mt-5">
            We will be back shortly. Thank you for your patience and understanding.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center py-2 z-10">
        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Healthy Delight. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
