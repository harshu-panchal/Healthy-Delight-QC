import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format, addDays, subDays, isSameDay } from "date-fns";

interface DeliveryCalendarStripProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  deliveryData?: Record<string, "delivered" | "upcoming" | "vacation" | "onhold">;
}

const STATUS_COLORS = {
  delivered: "#22c55e", // Green
  upcoming: "#3b82f6",  // Blue
  vacation: "#f59e0b",  // Yellow
  onhold: "#ef4444",    // Red
};

export default function DeliveryCalendarStrip({
  onDateSelect,
  selectedDate,
  deliveryData = {},
}: DeliveryCalendarStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Generate 14 days of dates starting from today
  const dates = Array.from({ length: 14 }, (_, i) => {
    return addDays(new Date(), i);
  });

  // Scroll to selected date on mount
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, []);

  return (
    <div className="w-full bg-white/50 backdrop-blur-sm py-3 border-b border-neutral-100 overflow-hidden">
      <div className="flex items-center px-4 gap-3">
        {/* Three Dots Action */}
        <button className="flex-shrink-0 w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 hover:bg-neutral-200 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
          </svg>
        </button>

        {/* Horizontal Dates */}
        <div 
          ref={scrollRef}
          className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide snap-x px-1"
        >
          {dates.map((date) => {
            const isToday = isSameDay(date, new Date());
            const isSelected = isSameDay(date, selectedDate);
            const dateStr = format(date, "yyyy-MM-dd");
            const status = deliveryData[dateStr];

            return (
              <button
                key={dateStr}
                data-selected={isSelected}
                onClick={() => onDateSelect(date)}
                className="flex-shrink-0 w-12 flex flex-col items-center py-1.5 rounded-2xl transition-all snap-center group"
              >
                <span className={`text-[10px] font-bold mb-1 transition-colors ${
                  isSelected ? "text-[#0a193b]" : "text-neutral-400 group-hover:text-neutral-600"
                }`}>
                  {isToday ? "Today" : format(date, "eee")}
                </span>
                
                <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                  isSelected 
                    ? "bg-[#0a193b] text-white shadow-md scale-105" 
                    : "text-neutral-500 group-hover:bg-neutral-100"
                }`}>
                  <span className="text-xs font-bold">
                    {format(date, "d")}
                  </span>
                </div>
                
                {/* Status Dot */}
                {status && (
                  <div 
                    className="w-1.5 h-1.5 rounded-full mt-1 transition-all"
                    style={{ 
                      backgroundColor: STATUS_COLORS[status],
                      opacity: isSelected ? 0.8 : 1,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Month Label */}
        <div className="flex-shrink-0 flex items-center justify-center pr-1">
          <span className="text-[9px] font-black uppercase text-[#0a193b]/40 rotate-90 origin-center whitespace-nowrap">
            {format(selectedDate, "MMM")}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 px-4 overflow-x-auto scrollbar-hide">
        {Object.entries(STATUS_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-bold text-neutral-400 capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
