import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfTomorrow, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getMyOrders } from "../../services/api/customerOrderService";
import { getActiveShifts, type CustomerShift } from "../../services/api/customerShiftService";

const formatOrderFriendly = (orderNumber?: string, orderId?: string) => {
  if (orderNumber && orderNumber !== 'N/A') {
    if (orderNumber.startsWith('ORD')) {
      const numericPart = orderNumber.replace('ORD', '');
      if (numericPart.length > 6) {
        return `ORD-${numericPart.slice(-6)}`;
      }
      return orderNumber;
    }
    return orderNumber.length > 10 ? orderNumber.slice(0, 8) : orderNumber;
  }
  if (orderId) {
    const cleanId = orderId.includes('-') ? orderId.split('-').slice(-1)[0] : orderId;
    if (cleanId.length > 6) {
      return `ORD-${cleanId.slice(-6).toUpperCase()}`;
    }
    return `ORD-${cleanId.toUpperCase()}`;
  }
  return 'Unknown';
};

export default function ScheduleManagement() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const saved = sessionStorage.getItem("scheduledDeliveryDate");
    return saved ? new Date(saved) : null;
  });
  
  const [timeSlot, setTimeSlot] = useState<string | null>(() => {
    return sessionStorage.getItem("scheduledTimeSlot");
  });

  const [activeShifts, setActiveShifts] = useState<CustomerShift[]>([]);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const response = await getActiveShifts("Scheduled");
        if (response.success && response.data.length > 0) {
          setActiveShifts(response.data);
          // If no timeSlot is selected yet, or if current timeSlot is not in the new active shifts, set to first active
          const savedSlot = sessionStorage.getItem("scheduledTimeSlot");
          const isValidSaved = response.data.some(s => s.name === savedSlot);
          if (!savedSlot || !isValidSaved) {
            const defaultSlot = response.data[0].name;
            setTimeSlot(defaultSlot);
            if (selectedDate) {
              sessionStorage.setItem("scheduledTimeSlot", defaultSlot);
            }
          }
        } else {
          useFallbackShifts();
        }
      } catch (err) {
        console.error("Failed to fetch active scheduled shifts:", err);
        useFallbackShifts();
      }
    };

    const useFallbackShifts = () => {
      const fallback: CustomerShift[] = [
        { _id: "morning", name: "Morning", startTime: "06:00 AM", endTime: "09:00 AM", type: "Both", isActive: true },
        { _id: "evening", name: "Evening", startTime: "06:00 PM", endTime: "09:00 PM", type: "Both", isActive: true },
      ];
      setActiveShifts(fallback);
      const savedSlot = sessionStorage.getItem("scheduledTimeSlot");
      if (!savedSlot) {
        setTimeSlot("Morning");
      }
    };

    fetchShifts();
  }, [selectedDate]);

  const formatScheduledSlot = (slotName: string | undefined) => {
    if (!slotName) return "N/A";
    const matched = activeShifts.find(s => s.name.toLowerCase() === slotName.toLowerCase());
    if (matched) {
      return `${matched.name} (${matched.startTime} - ${matched.endTime})`;
    }
    return slotName === "Morning" ? "Morning (6 AM - 9 AM)" : slotName === "Evening" ? "Evening (6 PM - 9 PM)" : slotName;
  };
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const [scheduledOrders, setScheduledOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchScheduledOrders = async () => {
      try {
        setLoadingOrders(true);
        const res = await getMyOrders({ orderType: "Scheduled", limit: 50 });
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setScheduledOrders(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch scheduled orders:", err);
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    };
    fetchScheduledOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Rider Assigned':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case 'Accepted':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'Ready for pickup':
        return 'bg-yellow-50 text-yellow-600 border border-yellow-100';
      case 'Picked up':
      case 'Picked Up':
        return 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'Out for Delivery':
      case 'Out for delivery':
        return 'bg-teal-50 text-teal-600 border border-teal-100';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Cancelled':
        return 'bg-red-50 text-red-600 border border-red-100';
      default:
        return 'bg-neutral-50 text-neutral-600 border border-neutral-100';
    }
  };

  const formatScheduledDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

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
                  onClick={() => {
                    setSelectedDate(day);
                    sessionStorage.setItem("scheduledDeliveryDate", day.toISOString());
                     if (!timeSlot && activeShifts.length > 0) {
                       const defaultSlot = activeShifts[0].name;
                       setTimeSlot(defaultSlot);
                       sessionStorage.setItem("scheduledTimeSlot", defaultSlot);
                     }
                  }}
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

      {/* Time Slot Selection */}
      {selectedDate && activeShifts.length > 0 && (
        <div className="bg-white rounded-[24px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.02)] border border-neutral-100 mb-6 animate-fadeIn">
          <h3 className="text-sm font-black text-[#0a193b] mb-4">Choose Delivery Time Slot</h3>
          <div className="grid grid-cols-2 gap-4">
            {activeShifts.map((shift) => (
              <button
                key={shift._id}
                onClick={() => {
                  setTimeSlot(shift.name);
                  sessionStorage.setItem("scheduledTimeSlot", shift.name);
                }}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                  timeSlot === shift.name
                    ? "border-[#3b82f6] bg-[#3b82f6]/5 text-[#3b82f6]"
                    : "border-neutral-100 hover:border-neutral-200 text-neutral-600"
                }`}
              >
                <span className="text-sm font-bold">{shift.name}</span>
                <span className="text-[10px] text-neutral-400 font-medium mt-1">
                  {shift.startTime} - {shift.endTime}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Products Button */}
      <div className="mb-6">
        <button 
          onClick={() => selectedDate && timeSlot && navigate('/categories')}
          disabled={!selectedDate || !timeSlot}
          className={`w-full py-4 rounded-xl font-bold text-[16px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg flex justify-center items-center gap-2 ${
            selectedDate && timeSlot
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

      {/* Scheduled Deliveries Section */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-black text-[#0a193b] mb-2">Scheduled Deliveries</h2>
        
        {loadingOrders ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#0a193b]/20 border-t-[#0a193b] rounded-full animate-spin"></div>
          </div>
        ) : scheduledOrders.length === 0 ? (
          <div className="bg-white rounded-[24px] p-8 text-center border border-neutral-100 shadow-sm">
            <div className="w-16 h-16 bg-[#0a193b]/5 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0a193b]/60">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-neutral-800 mb-1">No Scheduled Deliveries Yet</h3>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Select a date and time slot above to plan and schedule your next delivery!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledOrders.map((order) => {
              const previewItems = order.items.slice(0, 4);
              
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-white rounded-[24px] border border-neutral-100 shadow-sm p-5 hover:shadow-md transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex flex-col gap-4">
                    {/* Top Row: Order ID & Status */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-bold text-neutral-800 group-hover:text-[#0a193b] transition-colors">
                        Order #{formatOrderFriendly(order.orderNumber, order.id)}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Middle Row: Schedule Info & Product Images */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-b border-neutral-50 py-3.5">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Scheduled For</span>
                          <span className="text-xs font-bold text-neutral-700">
                            {formatScheduledDate(order.scheduledDate)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Time Slot</span>
                          <span className="text-xs font-medium text-neutral-600">
                            {formatScheduledSlot(order.scheduledTimeSlot)}
                          </span>
                        </div>
                      </div>

                      {/* Product previews */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        {previewItems
                          .filter((item: any) => item?.product)
                          .map((item: any, idx: number) => {
                            const imgUrl = item.product.imageUrl || item.product.mainImage || item.product.image;
                            return (
                              <div
                                key={idx}
                                className="w-9 h-9 bg-neutral-50 rounded-lg flex items-center justify-center p-1 border border-neutral-100 shadow-sm"
                              >
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={item.product.productName}
                                    className="w-full h-full object-contain mix-blend-multiply"
                                  />
                                ) : (
                                  <span className="text-[9px] font-bold text-neutral-400">?</span>
                                )}
                              </div>
                            );
                          })}
                        {order.items.length > 4 && (
                          <div className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#0a193b] border border-neutral-100 shadow-sm">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Total & Track CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#0a193b]">₹{order.totalAmount.toFixed(2)}</span>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          ({order.totalItems} {order.totalItems === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#3b82f6] group-hover:translate-x-0.5 transition-transform duration-200">
                        <span>Track Order</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
