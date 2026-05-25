import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getTodayOrders, getScheduledOrders } from '../../../services/api/delivery/deliveryService';

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
    if (cleanId.startsWith('ORD')) {
      const numericPart = cleanId.replace('ORD', '');
      if (numericPart.length > 6) {
        return `ORD-${numericPart.slice(-6)}`;
      }
      return cleanId;
    }
    return cleanId.length > 8 ? `ORD-${cleanId.slice(-6).toUpperCase()}` : cleanId;
  }
  return 'Unknown';
};

export default function DeliveryOrders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'today' | 'scheduled'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as 'today' | 'scheduled') || 'today';
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [scheduledOrders, setScheduledOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'today') {
        const data = await getTodayOrders();
        setOrders(data);
      } else {
        const data = await getScheduledOrders();
        setScheduledOrders(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleRefresh = () => {
      fetchOrders();
    };

    window.addEventListener('refresh-orders', handleRefresh);
    return () => {
      window.removeEventListener('refresh-orders', handleRefresh);
    };
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-orange-100 text-orange-700';
      case 'Ready for pickup':
        return 'bg-yellow-100 text-yellow-700';
      case 'Picked up':
      case 'Picked Up':
        return 'bg-indigo-100 text-indigo-700';
      case 'Out for delivery':
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-700';
      case 'Delivered':
        return 'bg-green-100 text-green-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'Rider Assigned':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />
      <div className="px-4 py-4">
        {/* Title */}
        <h2 className="text-neutral-900 text-xl font-semibold mb-4">Orders</h2>

        {/* Tab Switcher */}
        <div className="flex bg-neutral-200/50 p-1 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'today'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Today's Deliveries
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'scheduled'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Scheduled Deliveries
          </button>
        </div>

        {error && (
          <div className="p-4 mb-4 text-red-600 bg-red-50 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <p className="text-neutral-500 text-sm">Loading orders...</p>
          </div>
        ) : activeTab === 'today' ? (
          orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/delivery/orders/${order.id}`)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200 cursor-pointer active:scale-[0.99] transition-all hover:shadow-md animate-in fade-in-50 duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-neutral-900 font-semibold text-sm mb-1">{formatOrderFriendly(undefined, order.orderId)}</p>
                      <p className="text-neutral-600 text-xs mb-1">{order.customerName}</p>
                      <p className="text-neutral-500 text-xs">{order.customerPhone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 mt-3">
                    <p className="text-neutral-600 text-xs mb-2 line-clamp-2">{order.address}</p>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-neutral-500 text-xs">
                        {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                      </p>
                      <p className="text-neutral-900 font-bold">₹ {order.totalAmount}</p>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 min-h-[300px] flex items-center justify-center shadow-sm border border-neutral-200">
              <p className="text-neutral-500 text-sm">No active deliveries for today</p>
            </div>
          )
        ) : (
          scheduledOrders.length > 0 ? (
            <div className="space-y-3">
              {scheduledOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/delivery/orders/${order.id}`)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200 cursor-pointer active:scale-[0.99] transition-all hover:shadow-md animate-in fade-in-50 duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-neutral-900 font-semibold text-sm mb-1">{formatOrderFriendly(undefined, order.orderId)}</p>
                      <p className="text-neutral-600 text-xs mb-1">{order.customerName}</p>
                      <p className="text-neutral-500 text-xs">{order.customerPhone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {order.deliveryBoyStatus === 'Pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 tracking-wider">
                          Pending Accept
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 mt-3">
                    <div className="mb-3 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-600">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span className="text-xs font-bold text-blue-700 leading-none">
                        Scheduled for: {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' }) : 'N/A'} ({order.scheduledTimeSlot || order.timeSlot})
                      </span>
                    </div>

                    <p className="text-neutral-600 text-xs mb-2 line-clamp-2">{order.address}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-neutral-500 text-xs">
                        {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                      </p>
                      <p className="text-neutral-900 font-bold">₹ {order.totalAmount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 min-h-[300px] flex items-center justify-center shadow-sm border border-neutral-200">
              <p className="text-neutral-500 text-sm">No scheduled deliveries assigned</p>
            </div>
          )
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}




