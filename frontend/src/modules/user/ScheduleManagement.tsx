import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfTomorrow, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function ScheduleManagement() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex flex-col pt-6 pb-20 px-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0a193b] shadow-sm border border-neutral-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-black text-[#0a193b]">Schedule</h1>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-neutral-100 mb-6">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-lg font-bold text-[#0a193b]">{format(currentMonth, "MMMM yyyy")}</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentMonth(subMonths => addMonths(subMonths, -1))}
              className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18L9 12L15 6" /></svg>
            </button>
            <button 
              onClick={() => setCurrentMonth(subMonths => addMonths(subMonths, 1))}
              className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-4 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map(d => (
            <span key={d} className="text-[10px] font-black text-neutral-300 uppercase">{d}</span>
          ))}
          {days.map(day => {
            const isInactive = isBefore(day, startOfTomorrow());
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            return (
              <div key={day.toString()} className="flex items-center justify-center py-2">
                <button 
                  disabled={isInactive}
                  onClick={() => setSelectedDate(day)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                    isInactive 
                      ? "text-neutral-300 opacity-50 cursor-not-allowed" 
                      : isSelected
                        ? "bg-[#3b82f6] text-white shadow-md scale-105"
                        : "text-[#0a193b] hover:bg-neutral-50 hover:shadow-sm"
                  }`}
                >
                  {format(day, "d")}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Products Button */}
      <div className="mb-6">
        <button 
          onClick={() => selectedDate && navigate('/categories')}
          disabled={!selectedDate}
          className={`w-full py-4 rounded-xl font-bold text-[16px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg flex justify-center items-center gap-2 ${
            selectedDate 
              ? "bg-[#0a193b] text-white cursor-pointer" 
              : "bg-neutral-200 text-neutral-400 cursor-not-allowed opacity-60 shadow-none"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Products
        </button>
      </div>

      {/* Options */}
      <div className="space-y-4 mb-8">
        <button className="w-full bg-white p-5 rounded-[24px] flex items-center justify-between border border-neutral-100 shadow-sm group">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-800">Vacation Mode</h3>
              <p className="text-[10px] text-neutral-400 font-medium">Pause all deliveries temporarily</p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-neutral-200 group-hover:text-[#0a193b] transition-colors"><path d="M9 18l6-6-6-6" /></svg>
        </button>

        <button className="w-full bg-white p-5 rounded-[24px] flex items-center justify-between border border-neutral-100 shadow-sm group">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-800">Pause Delivery</h3>
              <p className="text-[10px] text-neutral-400 font-medium">Put your subscription on hold</p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-neutral-200 group-hover:text-[#0a193b] transition-colors"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

    </div>
  );
}
