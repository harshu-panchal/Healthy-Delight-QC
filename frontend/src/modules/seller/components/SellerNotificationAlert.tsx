import React, { useState, useEffect, useRef } from 'react';
import { SellerNotification } from '../hooks/useSellerSocket';
import { updateOrderStatus } from '../../../services/api/orderService';
import { useNavigate } from 'react-router-dom';

interface SellerNotificationAlertProps {
  notification: SellerNotification | null;
  onClose: () => void;
}

const SellerNotificationAlert: React.FC<SellerNotificationAlertProps> = ({ notification, onClose }) => {
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (status: string) => {
    if (!notification) return;
    setLoading(true);
    try {
      await updateOrderStatus(notification.orderId, { status: status as any });
      onClose();
      // Optionally navigate to order detail or just close
      if (status === 'Accepted') {
         navigate(`/seller/orders/${notification.orderId}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (notification) {
      // Play sound when notification arrives
      if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.play().catch(err => console.error('Error playing sound:', err));
      }
    }
  }, [notification]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <audio
        ref={audioRef}
        src="/assets/sound/seller_alert.mp3"
        loop
      />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between bg-primary relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/10 shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {notification.type === 'NEW_ORDER' ? 'New Order Received!' : 'Order Status Updated'}
              </h2>
              <p className="text-xs font-semibold text-white/70 tracking-widest uppercase">#{notification.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all relative z-10"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
          {/* Volume Control */}
          <div className="mb-6 bg-neutral-50 border border-neutral-100 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="bg-white p-2 rounded-lg text-neutral-400 shadow-sm border border-neutral-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 accent-primary h-1.5 rounded-lg appearance-none bg-neutral-200"
            />
          </div>

          {/* Customer Info */}
          <section className="mb-6 animate-in slide-in-from-bottom-2 duration-500 delay-150">
            <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-3">Customer Information</h3>
            <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <p className="font-black text-neutral-900 text-xl tracking-tight">{notification.customer.name}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-neutral-600">
                  <div className="bg-neutral-50 p-2 rounded-lg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                  <span className="font-semibold">{notification.customer.phone}</span>
                </div>
                
                <div className="flex items-start gap-3 text-neutral-600">
                  <div className="bg-neutral-50 p-2 rounded-lg mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div className="text-sm leading-relaxed">
                    <span className="font-medium">{notification.customer.address.address}, {notification.customer.address.city}, {notification.customer.address.pincode}</span>
                    {notification.customer.address.landmark && (
                      <span className="block mt-1.5 text-xs">
                        <span className="text-neutral-400 uppercase font-black tracking-widest text-[9px] mr-2">Landmark:</span>
                        <span className="text-primary font-bold">{notification.customer.address.landmark}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Order Details */}
          <section className="animate-in slide-in-from-bottom-2 duration-500 delay-300">
            <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-3">Order Details</h3>
            <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-100">
              <div className="space-y-4">
                {notification.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 truncate pr-4">{item.productName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-neutral-500">
                          {item.quantity} × ₹{item.price.toFixed(2)}
                        </span>
                        {item.variation && (
                          <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[9px] font-black uppercase text-neutral-500">
                            {item.variation}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-neutral-900">₹{item.total.toFixed(2)}</p>
                  </div>
                ))}

                <div className="pt-5 mt-4 border-t border-neutral-200">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-black text-neutral-500 uppercase tracking-widest">Total (Your Items)</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">₹{notification.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-neutral-100">
          {notification.type === 'NEW_ORDER' ? (
            <div className="flex gap-4">
              <button
                onClick={() => handleStatusUpdate('Accepted')}
                disabled={loading}
                className="flex-1 py-4.5 bg-primary hover:bg-neutral-900 border-2 border-primary hover:border-neutral-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_8px_20px_-6px_rgba(10,25,59,0.3)] hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Accept Order'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reject this order?')) {
                    handleStatusUpdate('Rejected');
                  }
                }}
                disabled={loading}
                className="flex-1 py-4.5 bg-white hover:bg-red-50 border-2 border-red-500 text-red-500 rounded-2xl font-black text-sm uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Reject Order'}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-4.5 bg-primary hover:bg-neutral-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95"
            >
              Acknowledge & Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerNotificationAlert;
