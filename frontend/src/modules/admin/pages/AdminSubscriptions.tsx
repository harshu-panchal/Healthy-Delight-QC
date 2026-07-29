import { useState, useEffect } from 'react';
import {
  getAllSubscriptionsAdmin,
  updateSubscriptionAdmin,
  getAdminSubscriptionPlans,
  UserSubscription,
  SubscriptionPlan,
  UpdateUserSubscriptionData,
} from '../../../services/api/admin/adminSubscriptionService';
import { getAllSellers, Seller } from '../../../services/api/sellerService';

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sellerFilter, setSellerFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');

  // Edit Modal
  const [editingSubscription, setEditingSubscription] = useState<UserSubscription | null>(null);
  const [editFormData, setEditFormData] = useState<{
    status: 'active' | 'paused' | 'expired' | 'cancelled';
    deliverySlot: 'morning' | 'evening';
    endDate: string;
  }>({
    status: 'active',
    deliverySlot: 'morning',
    endDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch filter options (Sellers & Plans) once
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [sellersRes, plansRes] = await Promise.all([
          getAllSellers(),
          getAdminSubscriptionPlans(),
        ]);
        if (sellersRes?.data) setSellers(sellersRes.data);
        if (plansRes) setPlans(plansRes);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch subscriptions whenever filters change
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (sellerFilter) params.seller = sellerFilter;
      if (planFilter) params.plan = planFilter;

      const data = await getAllSubscriptionsAdmin(params);
      setSubscriptions(data || []);
    } catch (err: any) {
      console.error('Error fetching user subscriptions:', err);
      setError(err.response?.data?.message || 'Failed to load user subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, sellerFilter, planFilter]);

  const handleOpenEditModal = (sub: UserSubscription) => {
    setEditingSubscription(sub);
    const dateFormatted = sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '';
    setEditFormData({
      status: sub.status,
      deliverySlot: sub.deliverySlot,
      endDate: dateFormatted,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    try {
      setSubmitting(true);
      setError('');

      const updateData: UpdateUserSubscriptionData = {
        status: editFormData.status,
        deliverySlot: editFormData.deliverySlot,
        endDate: editFormData.endDate,
      };

      await updateSubscriptionAdmin(editingSubscription._id, updateData);
      setSuccessMessage('Subscription updated successfully!');
      setEditingSubscription(null);
      fetchSubscriptions();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      setError(err.response?.data?.message || 'Failed to update subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'paused':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'expired':
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm">
        <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">Customer Milk Subscriptions</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Monitor and manage all active, paused, expired, or cancelled customer milk delivery subscriptions.
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none truncate appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Filter by Seller</label>
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none truncate appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
          >
            <option value="">All Sellers</option>
            {sellers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.storeName || s.sellerName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Filter by Plan</label>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none truncate appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
          >
            <option value="">All Plans</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.durationInDays} days)
              </option>
            ))}
          </select>
        </div>

        {(statusFilter || sellerFilter || planFilter) && (
          <div className="self-end pb-0.5">
            <button
              onClick={() => {
                setStatusFilter('');
                setSellerFilter('');
                setPlanFilter('');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            No subscriptions found matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Assigned Seller</th>
                  <th className="py-3.5 px-4">Slot</th>
                  <th className="py-3.5 px-4">Quota</th>
                  <th className="py-3.5 px-4">Start / End Date</th>
                  <th className="py-3.5 px-4">Free Days</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {subscriptions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-neutral-800">
                      {sub.customer?.name || 'N/A'}
                      <p className="text-xs font-normal text-neutral-500">{sub.customer?.phone || ''}</p>
                    </td>
                    <td className="py-4 px-4 font-medium text-neutral-700">
                      {sub.plan?.name || 'Custom Plan'}
                      <p className="text-xs text-emerald-700 font-semibold">₹{sub.price}</p>
                    </td>
                    <td className="py-4 px-4 text-neutral-600">
                      {sub.seller?.storeName || sub.seller?.sellerName || 'N/A'}
                    </td>
                    <td className="py-4 px-4 capitalize">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          sub.deliverySlot === 'morning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {sub.deliverySlot}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-neutral-700">
                      {sub.bottlesPerDay} {sub.unit || 'Litre'}
                    </td>
                    <td className="py-4 px-4 text-xs text-neutral-600 space-y-0.5">
                      <div><span className="text-neutral-400">Start:</span> {new Date(sub.startDate).toLocaleDateString()}</div>
                      <div><span className="text-neutral-400">End:</span> {new Date(sub.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="py-4 px-4 text-neutral-600 text-xs">
                      {sub.freeDaysUsed || 0} / {sub.freeDaysTotal || 0} used
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          sub.status
                        )}`}
                      >
                        {sub.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(sub)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Subscription Modal */}
      {editingSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-100 my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
              <h2 className="text-lg font-bold text-neutral-800">Edit Customer Subscription</h2>
              <button
                onClick={() => setEditingSubscription(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="bg-neutral-50 p-3 rounded-lg text-xs space-y-1 text-neutral-600">
                <p><span className="font-semibold">Customer:</span> {editingSubscription.customer?.name} ({editingSubscription.customer?.phone})</p>
                <p><span className="font-semibold">Plan:</span> {editingSubscription.plan?.name}</p>
                <p><span className="font-semibold">Seller:</span> {editingSubscription.seller?.storeName}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Subscription Status *</label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Delivery Slot *</label>
                <select
                  value={editFormData.deliverySlot}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, deliverySlot: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                  <option value="morning">Morning Slot</option>
                  <option value="evening">Evening Slot</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingSubscription(null)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
