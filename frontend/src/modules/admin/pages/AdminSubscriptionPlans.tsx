import { useState, useEffect } from 'react';
import {
  getAdminSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  SubscriptionPlan,
  SubscriptionPlanFormData,
} from '../../../services/api/admin/adminSubscriptionService';

const initialFormData: SubscriptionPlanFormData = {
  name: '',
  durationInDays: 30,
  price: 499,
  freeDays: 0,
  bottlesPerDay: 1,
  unit: 'Litre',
  description: '',
  isActive: true,
};

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<SubscriptionPlanFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminSubscriptionPlans();
      setPlans(data || []);
    } catch (err: any) {
      console.error('Error fetching subscription plans:', err);
      setError(err.response?.data?.message || 'Failed to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenAddModal = () => {
    setEditingPlan(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      durationInDays: plan.durationInDays,
      price: plan.price,
      freeDays: plan.freeDays || 0,
      bottlesPerDay: plan.bottlesPerDay || 1,
      unit: plan.unit || 'Litre',
      description: plan.description || '',
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      if (plan.isActive) {
        await deleteSubscriptionPlan(plan._id);
        setSuccessMessage(`Plan "${plan.name}" deactivated`);
      } else {
        await updateSubscriptionPlan(plan._id, { isActive: true });
        setSuccessMessage(`Plan "${plan.name}" activated`);
      }
      fetchPlans();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error toggling plan status:', err);
      setError('Failed to update plan status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan._id, formData);
        setSuccessMessage('Subscription plan updated successfully!');
      } else {
        await createSubscriptionPlan(formData);
        setSuccessMessage('Subscription plan created successfully!');
      }

      setIsModalOpen(false);
      fetchPlans();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error saving subscription plan:', err);
      setError(err.response?.data?.message || 'Failed to save subscription plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">Milk Subscription Plans</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage subscription plans, durations, prices, and daily milk quota settings.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all duration-200 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Plan
        </button>
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

      {/* Plans Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading subscription plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            No subscription plans found. Click "Add New Plan" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Free Days</th>
                  <th className="py-3.5 px-4">Quota / Day</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {plans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-neutral-800">
                      {plan.name}
                      {plan.description && (
                        <p className="text-xs font-normal text-neutral-500 line-clamp-1 mt-0.5">{plan.description}</p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-neutral-600">{plan.durationInDays} Days</td>
                    <td className="py-4 px-4 font-semibold text-emerald-700">₹{plan.price}</td>
                    <td className="py-4 px-4 text-neutral-600">
                      {plan.freeDays > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                          +{plan.freeDays} Days Free
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-4 px-4 text-neutral-600 font-medium">
                      {plan.bottlesPerDay} {plan.unit}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          plan.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(plan)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          plan.isActive
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-100 my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
              <h2 className="text-lg font-bold text-neutral-800">
                {editingPlan ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Trial"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Duration (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.durationInDays}
                    onChange={(e) => setFormData({ ...formData, durationInDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Free Days</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.freeDays}
                    onChange={(e) => setFormData({ ...formData, freeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Bottles/Day *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.bottlesPerDay}
                    onChange={(e) => setFormData({ ...formData, bottlesPerDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or perks of this plan"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 select-none">
                  Active (Visible to customers)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
