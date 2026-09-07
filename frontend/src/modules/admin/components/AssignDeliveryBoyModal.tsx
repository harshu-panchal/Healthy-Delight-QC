import { useState, useEffect } from 'react';
import { getDeliveryBoys, type DeliveryBoy } from '../../../services/api/admin/adminDeliveryService';
import { assignDeliveryBoy, batchAssignDeliveryBoy } from '../../../services/api/admin/adminOrderService';

interface AssignDeliveryBoyModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId?: string;
    orderNumber?: string;
    orders?: { id: string; orderNumber: string; sellers?: string[] }[];
    currentDeliveryBoy?: { name: string; _id: string } | string;
    onAssignSuccess: () => void;
}

export default function AssignDeliveryBoyModal({
    isOpen,
    onClose,
    orderId,
    orderNumber,
    orders,
    currentDeliveryBoy,
    onAssignSuccess,
}: AssignDeliveryBoyModalProps) {
    const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
    const [selectedDeliveryBoyId, setSelectedDeliveryBoyId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isBulk = Boolean(orders && orders.length > 1);
    const effectiveOrders = orders && orders.length > 0
        ? orders
        : orderId && orderNumber
            ? [{ id: orderId, orderNumber }]
            : [];

    // Check for multiple distinct seller pickup locations across selected orders
    const allSellers = Array.from(
        new Set(
            (orders || [])
                .flatMap((o) => o.sellers || [])
                .filter(Boolean)
        )
    );
    const hasMultiplePickupLocations = isBulk && allSellers.length > 1;

    // Get current delivery boy ID (for single mode pre-selection)
    const currentDeliveryBoyId = typeof currentDeliveryBoy === 'object' && currentDeliveryBoy?._id
        ? currentDeliveryBoy._id
        : typeof currentDeliveryBoy === 'string'
            ? currentDeliveryBoy
            : '';

    useEffect(() => {
        if (isOpen) {
            fetchDeliveryBoys();
            // Pre-select current delivery boy if exists and in single mode
            if (!isBulk && currentDeliveryBoyId) {
                setSelectedDeliveryBoyId(currentDeliveryBoyId);
            } else if (isBulk) {
                setSelectedDeliveryBoyId('');
            }
        }
    }, [isOpen, currentDeliveryBoyId, isBulk]);

    const fetchDeliveryBoys = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getDeliveryBoys({
                status: 'Active',
                limit: 100, // Get all active delivery boys
            });
            if (response.success && response.data) {
                setDeliveryBoys(response.data);
            }
        } catch (err: any) {
            console.error('Error fetching delivery boys:', err);
            setError(err?.response?.data?.message || 'Failed to load delivery boys');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedDeliveryBoyId) {
            setError('Please select a delivery boy');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            let response: any;
            if (isBulk) {
                response = await batchAssignDeliveryBoy({
                    orderIds: effectiveOrders.map((o) => o.id),
                    deliveryBoyId: selectedDeliveryBoyId,
                });
            } else {
                const targetId = orderId || effectiveOrders[0]?.id;
                if (!targetId) {
                    setError('No order selected');
                    return;
                }
                response = await assignDeliveryBoy(targetId, {
                    deliveryBoyId: selectedDeliveryBoyId,
                });
            }

            if (response.success) {
                onAssignSuccess();
                onClose();
            } else {
                setError(response.message || 'Failed to assign delivery boy');
            }
        } catch (err: any) {
            console.error('Error assigning delivery boy:', err);
            setError(
                err?.response?.data?.message || 'Failed to assign delivery boy. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto z-10">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <h2 className="text-lg font-semibold text-neutral-900">
                        {isBulk ? `Bulk Assign (${effectiveOrders.length} Orders)` : 'Assign Delivery Boy'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-600 transition-colors"
                        disabled={submitting}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M18 6L6 18M6 6l12 12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    {/* Order Info */}
                    {isBulk ? (
                        <div className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                                    Selected Orders ({effectiveOrders.length})
                                </span>
                                <span className="text-xs text-primary font-medium">
                                    Assigning all to 1 rider
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                                {effectiveOrders.map((o) => (
                                    <span
                                        key={o.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border border-neutral-300 text-neutral-800 shadow-sm"
                                    >
                                        #{o.orderNumber}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
                            <p className="text-sm text-neutral-600">Order Number</p>
                            <p className="text-base font-semibold text-neutral-900">
                                {orderNumber || effectiveOrders[0]?.orderNumber || '-'}
                            </p>
                        </div>
                    )}

                    {/* Multiple Pickup Locations Warning */}
                    {hasMultiplePickupLocations && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                            <span className="text-amber-600 text-base leading-none">⚠️</span>
                            <div>
                                <p className="text-xs font-semibold text-amber-900">
                                    Multiple Pickup Locations
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Note: These orders belong to different pickup locations ({allSellers.join(", ")}). The delivery person will need to collect items from multiple sellers.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Delivery Boy Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Select Delivery Boy <span className="text-red-500">*</span>
                        </label>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-sm text-neutral-500">Loading delivery boys...</div>
                            </div>
                        ) : deliveryBoys.length === 0 ? (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    No active delivery boys available. Please add delivery boys first.
                                </p>
                            </div>
                        ) : (
                            <select
                                value={selectedDeliveryBoyId}
                                onChange={(e) => setSelectedDeliveryBoyId(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                disabled={submitting}
                            >
                                <option value="">-- Select Delivery Boy --</option>
                                {deliveryBoys.map((deliveryBoy) => (
                                    <option key={deliveryBoy._id} value={deliveryBoy._id}>
                                        {deliveryBoy.name} - {deliveryBoy.mobile} ({deliveryBoy.available === 'Available' ? 'Online' : 'Offline'}) — ({deliveryBoy.activeOrdersCount ?? 0} active order{(deliveryBoy.activeOrdersCount ?? 0) === 1 ? '' : 's'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Selected Delivery Boy Details */}
                    {selectedDeliveryBoyId && (
                        <div className="mb-4 p-3 bg-cream border border-primary/30 rounded-lg">
                            {(() => {
                                const selected = deliveryBoys.find((db) => db._id === selectedDeliveryBoyId);
                                if (!selected) return null;
                                return (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-neutral-900">{selected.name}</p>
                                        <p className="text-xs text-neutral-700">Mobile: {selected.mobile}</p>
                                        <p className="text-xs text-neutral-700">City: {selected.city}</p>
                                        <p className="text-xs text-neutral-700">
                                            <span className="font-medium text-neutral-900">Active Deliveries:</span>{' '}
                                            <span className={`font-semibold ${(selected.activeOrdersCount || 0) > 3 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                {selected.activeOrdersCount || 0} active order{(selected.activeOrdersCount || 0) === 1 ? '' : 's'}
                                            </span>
                                        </p>
                                        <p className="text-xs">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${selected.available === 'Available'
                                                        ? 'bg-cream text-neutral-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {selected.available}
                                            </span>
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedDeliveryBoyId || submitting || deliveryBoys.length === 0}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${!selectedDeliveryBoyId || submitting || deliveryBoys.length === 0
                                ? 'bg-neutral-400 cursor-not-allowed'
                                : 'bg-neutral-900 hover:bg-neutral-800'
                            }`}
                    >
                        {submitting
                            ? (isBulk ? `Assigning ${effectiveOrders.length} Orders...` : 'Assigning...')
                            : (isBulk ? `Assign ${effectiveOrders.length} Orders` : 'Assign Delivery Boy')}
                    </button>
                </div>
            </div>
        </div>
    );
}
