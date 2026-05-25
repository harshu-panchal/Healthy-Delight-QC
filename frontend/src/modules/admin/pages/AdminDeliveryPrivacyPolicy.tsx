import { useState, useEffect } from 'react';
import { getAppSettings, updateAppSettings } from '../../../services/api/admin/adminSettingsService';

export default function AdminDeliveryPrivacyPolicy() {
  const [policyContent, setPolicyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await getAppSettings();
        if (response.success && response.data) {
          setPolicyContent(response.data.deliveryPrivacyPolicy || '');
        }
      } catch (err: any) {
        setError('Failed to load delivery privacy policy.');
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await updateAppSettings({ deliveryPrivacyPolicy: policyContent });
      if (response.success) {
        alert('Delivery Privacy Policy updated successfully!');
      } else {
        setError('Failed to update policy.');
      }
    } catch (err: any) {
      setError('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-neutral-500 font-medium">Loading Delivery Privacy Policy...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Delivery Privacy Policy</h1>
          </div>
          <div className="text-sm text-neutral-600">
            <span className="text-primary-dark">Home</span> / <span className="text-neutral-900">Delivery Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Policy Content Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="bg-primary border-primary text-neutral-900 px-4 sm:px-6 py-3">
                <h2 className="text-white text-lg font-semibold">Policy Content</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-800 mb-2">
                    Policy Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="policyContent"
                    value={policyContent}
                    onChange={(e) => setPolicyContent(e.target.value)}
                    placeholder="Enter Delivery Privacy Policy content..."
                    rows={25}
                    required
                    className="w-full px-4 py-3 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y font-mono"
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    You can format the policy content using plain text. Use line breaks and spacing to organize the content.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="bg-primary border-primary text-neutral-900 px-4 sm:px-6 py-3">
                <h2 className="text-white text-lg font-semibold">Preview</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-neutral-700 bg-neutral-50 p-4 rounded border border-neutral-200 min-h-[200px] max-h-[400px] overflow-y-auto">
                    {policyContent || 'Policy content will appear here...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setPolicyContent('')}
                disabled={saving}
                className="px-6 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-primary border-primary text-neutral-900 hover:bg-neutral-900 text-white px-8 py-2.5 rounded-lg text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Updating...' : 'Update Policy'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
