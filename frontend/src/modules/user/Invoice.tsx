import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOrders } from "../../hooks/useOrders";

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

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const PrinterIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export default function Invoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrderById, fetchOrderById } = useOrders();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;

      const existingOrder = getOrderById(id);
      if (existingOrder) {
        setOrder(existingOrder);
        setLoading(false);
        return;
      }

      setLoading(true);
      const fetchedOrder = await fetchOrderById(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      }
      setLoading(false);
    };

    loadOrder();
  }, [id, getOrderById, fetchOrderById]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-sm text-neutral-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-xl font-bold mb-4">Invoice Not Found</h1>
          <Link to="/orders">
            <button className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
              Back to Orders
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = order.subtotal || 0;
  const deliveryFee = order.fees?.deliveryFee || 0;
  const platformFee = order.fees?.platformFee || 0;
  const totalAmount = order.totalAmount || subtotal + deliveryFee + platformFee;

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20 print:bg-white print:pb-0">
      {/* Header with actions - hidden when printing */}
      <div className="bg-white border-b border-neutral-100 sticky top-0 z-50 print:hidden shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2.5 md:py-3.5 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-neutral-600 hover:text-[#0a193b] font-bold transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-xs">Back</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 border border-neutral-200 hover:border-[#0a193b] hover:text-[#0a193b] text-neutral-700 bg-white px-2.5 py-1.5 rounded-lg font-bold text-[11px] md:px-4 md:py-2 md:text-xs md:rounded-xl transition-all shadow-sm">
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <Link to={`/orders/${id}`}>
              <button className="flex items-center gap-1.5 bg-[#0a193b] hover:bg-[#0a193b]/90 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] md:px-4 md:py-2 md:text-xs md:rounded-xl shadow-md shadow-[#0a193b]/10 transition-all hover:scale-[1.02]">
                <span>View Order</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:py-0 print:px-0">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-neutral-100 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-8 md:p-10 print:shadow-none print:border-none print:p-0">

          {/* Invoice Header */}
          <div className="border-b border-neutral-100 pb-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div>
                <div className="inline-block bg-[#0a193b]/5 text-[#0a193b] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#0a193b]/10 mb-4">
                  Tax Invoice
                </div>
                <h1 className="text-4xl font-black text-[#0a193b] tracking-tight mb-2">
                  Healthy Delight
                </h1>
                <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                  Premium Delivery E-Commerce
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  support@healthydelight.com
                </p>
              </div>
              <div className="md:text-right flex flex-col md:items-end">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Invoice Number</span>
                <span className="text-lg font-bold text-neutral-900 bg-neutral-50 border border-neutral-100 px-3 py-1 rounded-xl">
                  #{formatOrderFriendly(order.orderNumber, order.id)}
                </span>

                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-4 mb-1">Date Issued</span>
                <span className="text-sm font-bold text-neutral-700">
                  {order.createdAt ? formatDate(order.createdAt) : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Bill To */}
            <div className="bg-[#0a193b]/[0.02] border border-[#0a193b]/5 p-6 rounded-3xl flex flex-col">
              <h2 className="text-xs font-black text-[#0a193b] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[#0a193b] rounded-full" />
                Bill To
              </h2>
              <div className="text-neutral-700 text-xs space-y-1.5 flex-1">
                <p className="font-extrabold text-sm text-neutral-900">
                  {order.customerName || order.address?.name || "Customer"}
                </p>
                {(order.customerPhone || order.address?.phone) && (
                  <p className="font-semibold text-neutral-500">
                    {order.customerPhone || order.address?.phone}
                  </p>
                )}
                <p className="text-neutral-600 leading-relaxed pt-1">
                  {order.address?.flat && `${order.address.flat}, `}
                  {order.address?.address || order.address?.street || ""}
                  {order.address?.landmark && ` (Near ${order.address.landmark})`}
                </p>
                <p className="font-semibold text-neutral-900">
                  {order.address?.city || ""}
                  {order.address?.state && `, ${order.address.state}`}
                  {order.address?.pincode && ` - ${order.address.pincode}`}
                </p>

                {/* GSTIN rendering */}
                {order.gstin && (
                  <div className="mt-4 pt-3 border-t border-dashed border-neutral-200">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">GSTIN (Tax Credit)</span>
                    <span className="inline-block bg-[#0a193b] text-white text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider">
                      {order.gstin}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-neutral-50/50 border border-neutral-200/60 p-6 rounded-3xl flex flex-col">
              <h2 className="text-xs font-black text-neutral-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-neutral-400 rounded-full" />
                Order Information
              </h2>
              <div className="text-neutral-700 text-xs space-y-3 flex-1">
                <div>
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-0.5">Order ID</span>
                  <span className="font-mono text-neutral-900 font-bold break-all select-all">{formatOrderFriendly(order.orderNumber, order.id)}</span>
                </div>

                <div className="flex gap-4">
                  <div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">Status</span>
                    <span className="inline-block px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-black uppercase tracking-wider">
                      {order.status || "Placed"}
                    </span>
                  </div>
                  {order.paymentMethod && (
                    <div>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-1">Payment Method</span>
                      <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-black uppercase tracking-wider">
                        {order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>

                {order.timeSlot && (
                  <div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-0.5">Delivery Shift</span>
                    <span className="font-bold text-neutral-800">{order.timeSlot}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="mb-10 overflow-hidden border border-neutral-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="text-left py-4 px-6 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    Item
                  </th>
                  <th className="text-center py-4 px-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    Quantity
                  </th>
                  <th className="text-right py-4 px-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    Unit Price
                  </th>
                  <th className="text-right py-4 px-6 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {order.items?.map((item: any, index: number) => {
                  const productName =
                    item.product?.name || item.productName || "Product";
                  const unitPrice =
                    item.product?.price || item.unitPrice || item.price || 0;
                  const quantity = item.quantity || 1;
                  const itemTotal = item.total || unitPrice * quantity;

                  return (
                    <tr key={index} className="hover:bg-neutral-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          {item.product?.imageUrl || item.product?.mainImage || item.productImage ? (
                            <div className="w-12 h-12 bg-neutral-50 rounded-xl overflow-hidden p-1.5 flex-shrink-0 flex items-center justify-center border border-neutral-100 print:hidden">
                              <img
                                src={item.product?.imageUrl || item.product?.mainImage || item.productImage}
                                alt={productName}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : null}
                          <div>
                            <p className="font-bold text-neutral-900 text-sm">
                              {productName}
                            </p>
                            {item.variant && (
                              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
                                {item.variant}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4 text-xs font-bold text-neutral-800">
                        {quantity}
                      </td>
                      <td className="text-right py-4 px-4 text-xs font-semibold text-neutral-600">
                        {formatCurrency(unitPrice)}
                      </td>
                      <td className="text-right py-4 px-6 text-sm font-bold text-[#0a193b]">
                        {formatCurrency(itemTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary and Total */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8 pt-4">
            {/* Notes/Polices */}
            <div className="text-xs text-neutral-400 max-w-sm font-medium leading-relaxed">
              <p className="font-bold text-neutral-600 mb-1">Invoice Terms & Conditions</p>
              <p>This is a computer-generated tax invoice and does not require a physical signature. Goods once sold cannot be returned without verified defects under our customer satisfaction terms.</p>
            </div>

            {/* Cost Summary Box */}
            <div className="w-full md:w-80 bg-neutral-50/50 border border-neutral-200/50 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between text-xs text-neutral-600 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-neutral-900">{formatCurrency(subtotal)}</span>
              </div>

              {deliveryFee > 0 ? (
                <div className="flex justify-between text-xs text-neutral-600 font-medium">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(deliveryFee)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-xs text-neutral-600 font-medium">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-green-600 uppercase text-[10px] tracking-wider bg-green-50 px-2 py-0.5 rounded-full">Free</span>
                </div>
              )}

              {platformFee > 0 && (
                <div className="flex justify-between text-xs text-neutral-600 font-medium">
                  <span>Platform Fee</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(platformFee)}</span>
                </div>
              )}

              <div className="border-t border-neutral-200/80 pt-4 flex justify-between items-baseline">
                <span className="text-sm font-black text-neutral-900 uppercase tracking-wider">Grand Total</span>
                <span className="text-2xl font-black text-[#0a193b] tracking-tight">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 pt-8 text-center">
            <h3 className="text-sm font-black text-[#0a193b] mb-1">
              Thank you for ordering with Healthy Delight!
            </h3>
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              For any support, reach out to support@healthydelight.com or call +91 9740234199
            </p>
          </div>
        </motion.div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          /* Reset Framer Motion transforms, filters, and animations to prevent layout duplication and print clipping */
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            filter: none !important;
          }

          /* Remove browser-injected headers, footers, page titles, URLs, and dates */
          @page {
            size: portrait;
            margin: 0.4cm 0.6cm !important;
          }
          
          /* Set printable page body dimensions and backgrounds */
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Prevent dark/textured backgrounds or illustrations on body from printing */
          body::before,
          body::after {
            display: none !important;
            content: none !important;
          }

          /* Hide global outer navigation, menus, and sidebars completely */
          header,
          footer,
          nav,
          aside,
          .print\\:hidden {
            display: none !important;
          }

          /* Hide specific interactive widgets and floating action elements */
          [class*="FloatingCartPill"],
          [id*="floating-cart-pill"],
          .floating-pill,
          button[class*="floating"] {
            display: none !important;
          }

          /* Reset all potential scroll clipping parent elements to print multi-page documents seamlessly */
          html, 
          body, 
          #root, 
          [id="app-main-scroll"], 
          main, 
          .min-h-screen {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
          }

          /* Utility class overrides for printable container */
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }

          /* Spacing compression overrides to perfectly fit on a single A4 page */
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .rounded-3xl, .rounded-2xl {
            border-radius: 0.375rem !important;
          }
          .p-8, .p-10 {
            padding: 0 !important;
          }
          .p-6 {
            padding: 0.5rem !important;
          }
          .mb-10, .my-10 {
            margin-bottom: 0.4rem !important;
            margin-top: 0.4rem !important;
          }
          .mb-8 {
            margin-bottom: 0.4rem !important;
          }
          .pb-8 {
            padding-bottom: 0.3rem !important;
          }
          .pt-8 {
            padding-top: 0.3rem !important;
          }
          .gap-6 {
            gap: 0.4rem !important;
          }
          .gap-8 {
            gap: 0.4rem !important;
          }
          .py-8 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          th, td {
            padding-top: 0.3rem !important;
            padding-bottom: 0.3rem !important;
          }

          /* Force invoice content and footer to never break page boundaries */
          .bg-white.rounded-3xl,
          .border-t.pt-8 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
