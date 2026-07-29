import { useState, useEffect, useMemo } from 'react';
import {
  getSellerSubscriptionDeliveriesByDate,
  markSubscriptionDelivery,
  SellerSubscriptionDelivery,
} from '../../../services/api/seller/sellerSubscriptionService';

export default function SellerSubscriptionDeliveries() {
  const [deliveries, setDeliveries] = useState<SellerSubscriptionDelivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Date selection (defaults to Today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filters
  const [slotFilter, setSlotFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSellerSubscriptionDeliveriesByDate(selectedDate);
      setDeliveries(data || []);
    } catch (err: any) {
      console.error('Error fetching seller subscription deliveries:', err);
      setError(err.response?.data?.message || 'Failed to load subscription deliveries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [selectedDate]);

  const handleMarkDelivery = async (subscriptionId: string, status: 'delivered' | 'skipped') => {
    try {
      setMarkingId(subscriptionId);
      await markSubscriptionDelivery(subscriptionId, status, selectedDate);
      // Refresh list to update free days count and delivery status
      await fetchDeliveries();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark delivery status');
    } finally {
      setMarkingId(null);
    }
  };

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((item) => {
      // Slot filter
      if (slotFilter !== 'all' && item.deliverySlot !== slotFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const customerName = item.customer?.name?.toLowerCase() || '';
        const customerPhone = item.customer?.phone?.toLowerCase() || '';
        const planName = item.plan?.name?.toLowerCase() || '';
        const address = item.deliveryAddress?.address?.toLowerCase() || '';
        const city = item.deliveryAddress?.city?.toLowerCase() || '';

        return (
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          planName.includes(query) ||
          address.includes(query) ||
          city.includes(query)
        );
      }
      return true;
    });
  }, [deliveries, slotFilter, statusFilter, searchQuery]);

  // Grouped by slot
  const morningDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.deliverySlot === 'morning'),
    [filteredDeliveries]
  );
  const eveningDeliveries = useMemo(
    () => filteredDeliveries.filter((d) => d.deliverySlot === 'evening'),
    [filteredDeliveries]
  );

  // Counts
  const activeCount = useMemo(
    () => deliveries.filter((d) => d.status === 'active').length,
    [deliveries]
  );
  const morningCount = useMemo(
    () => deliveries.filter((d) => d.status === 'active' && d.deliverySlot === 'morning').length,
    [deliveries]
  );
  const eveningCount = useMemo(
    () => deliveries.filter((d) => d.status === 'active' && d.deliverySlot === 'evening').length,
    [deliveries]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'paused':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'expired':
        return 'bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const renderTable = (items: SellerSubscriptionDelivery[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold uppercase text-neutral-500 tracking-wider">
            <th className="py-3.5 px-4">Customer Info</th>
            <th className="py-3.5 px-4">Delivery Address</th>
            <th className="py-3.5 px-4">Plan & Quota</th>
            <th className="py-3.5 px-4">Delivery Slot</th>
            <th className="py-3.5 px-4">Free Days & Promo</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4 text-center">Action ({selectedDate})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200/60">
          {items.map((item) => {
            const isFreeDayEligible =
              item.todayDelivery?.isFreeDay ||
              (item.todayDelivery?.status === 'pending' && item.freeDaysUsed < item.freeDaysTotal);

            return (
              <tr key={item._id} className="hover:bg-neutral-50/80 transition-colors">
                <td className="py-4 px-4 font-semibold text-neutral-800">
                  {item.customer?.name || 'Customer'}
                  {item.customer?.phone && (
                    <div className="mt-1">
                      <a
                        href={`tel:${item.customer.phone}`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {item.customer.phone}
                      </a>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-neutral-700 text-xs max-w-xs">
                  <p className="font-semibold text-neutral-800">
                    {item.deliveryAddress?.address || item.customer?.address || 'No address provided'}
                  </p>
                  <p className="text-neutral-500 mt-0.5">
                    {[item.deliveryAddress?.city || item.customer?.city, item.deliveryAddress?.pincode || item.customer?.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </td>
                <td className="py-4 px-4 font-medium text-neutral-700">
                  <span className="font-bold text-[#0a193b] block">{item.plan?.name || 'Milk Subscription'}</span>
                  <span className="inline-block px-2 py-0.5 mt-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded border border-emerald-200">
                    {item.bottlesPerDay} {item.unit || 'Litre'} / day
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      item.deliverySlot === 'morning'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}
                  >
                    {item.deliverySlot === 'morning' ? '🌅 Morning (6-9 AM)' : '🌙 Evening (6-9 PM)'}
                  </span>
                </td>
                <td className="py-4 px-4 text-xs font-medium text-neutral-600 space-y-1">
                  <div>
                    {item.freeDaysTotal > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        {item.freeDaysUsed} / {item.freeDaysTotal} free days used
                      </span>
                    ) : (
                      '0 free days'
                    )}
                  </div>
                  {/* FREE TODAY BADGE */}
                  {isFreeDayEligible && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] tracking-wider uppercase shadow-sm">
                      🎁 FREE TODAY
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  {item.todayDelivery?.status === 'delivered' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                      ✅ Delivered {item.todayDelivery.isFreeDay && '(Free)'}
                    </span>
                  ) : item.todayDelivery?.status === 'skipped' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-300">
                      ⏸️ Skipped
                    </span>
                  ) : item.status !== 'active' ? (
                    <span className="text-xs font-semibold text-neutral-400">Subscription {item.status}</span>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleMarkDelivery(item._id, 'delivered')}
                        disabled={markingId === item._id}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                      >
                        {markingId === item._id ? 'Saving...' : 'Mark Delivered'}
                      </button>
                      <button
                        onClick={() => handleMarkDelivery(item._id, 'skipped')}
                        disabled={markingId === item._id}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">Milk Subscription Deliveries</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Track daily milk delivery quotas, customer contacts, and slots assigned to your store.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-[#0a193b] outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            onClick={fetchDeliveries}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh List
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1">Active Subscriptions</span>
          <span className="text-3xl font-black text-[#0a193b]">{activeCount}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">🌅 Morning Active Quota</span>
          <span className="text-3xl font-black text-amber-900">{morningCount}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-1">🌙 Evening Active Quota</span>
          <span className="text-3xl font-black text-indigo-900">{eveningCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Slot Tabs */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setSlotFilter('all')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              slotFilter === 'all' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            All Slots ({deliveries.length})
          </button>
          <button
            onClick={() => setSlotFilter('morning')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              slotFilter === 'morning' ? 'bg-amber-500 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            🌅 Morning ({morningCount})
          </button>
          <button
            onClick={() => setSlotFilter('evening')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              slotFilter === 'evening' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            🌙 Evening ({eveningCount})
          </button>
        </div>

        {/* Status Dropdown & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="text"
            placeholder="Search customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 flex-1 md:w-64"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500 font-medium">Loading subscription deliveries...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-medium">{error}</div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 font-medium">
            No subscription deliveries assigned yet matching the selected filters.
          </div>
        ) : slotFilter === 'all' ? (
          /* Render grouped sections when "All Slots" selected */
          <div className="space-y-8 p-4">
            {morningDeliveries.length > 0 && (
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <span>🌅</span> Morning Deliveries (6:00 AM - 9:00 AM)
                  </h3>
                  <span className="text-xs font-bold bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full">
                    {morningDeliveries.length} Subscriptions
                  </span>
                </div>
                {renderTable(morningDeliveries)}
              </div>
            )}

            {eveningDeliveries.length > 0 && (
              <div className="border border-indigo-200 rounded-xl overflow-hidden">
                <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-200 flex items-center justify-between">
                  <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                    <span>🌙</span> Evening Deliveries (6:00 PM - 9:00 PM)
                  </h3>
                  <span className="text-xs font-bold bg-indigo-200/80 text-indigo-900 px-2.5 py-0.5 rounded-full">
                    {eveningDeliveries.length} Subscriptions
                  </span>
                </div>
                {renderTable(eveningDeliveries)}
              </div>
            )}
          </div>
        ) : (
          renderTable(filteredDeliveries)
        )}
      </div>
    </div>
  );
}
