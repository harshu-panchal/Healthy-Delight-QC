import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { useCart } from '../../context/CartContext';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'bg-green-100 text-green-700';
    case 'On the way':
      return 'bg-blue-100 text-blue-700';
    case 'Accepted':
      return 'bg-yellow-100 text-yellow-700';
    case 'Placed':
      return 'bg-neutral-100 text-neutral-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
};

export default function OrderAgain() {
  const { orders } = useOrders();
  const { cart, addToCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [addedOrders, setAddedOrders] = useState<Set<string>>(new Set());

  // Handle "Order Again" - Add all items from an order to cart
  const handleOrderAgain = (order: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Mark this order as added
    setAddedOrders(prev => new Set(prev).add(order.id));

    // Add each item from the order to the cart
    order.items
      .filter((item: any) => item?.product) // Filter out items with null/undefined products
      .forEach((item: any) => {
        // Check if product is already in cart
        const existingCartItem = cart.items.find(cartItem => cartItem?.product && cartItem.product.id === item.product.id);

        if (existingCartItem) {
          // If already in cart, add the order quantity to existing quantity
          updateQuantity(item.product.id, existingCartItem.quantity + item.quantity);
        } else {
          // If not in cart, add it first (adds 1)
          addToCart(item.product);
          // Then update to the correct quantity if needed
          if (item.quantity > 1) {
            // Use setTimeout to ensure the item is added first
            setTimeout(() => {
              updateQuantity(item.product.id, item.quantity);
            }, 10);
          }
        }
      });
  };

  const hasOrders = orders && orders.length > 0;

  return (
    <div className="pb-4">
      {/* Orders Section - Show when orders exist */}
      {hasOrders && (
        <div className="px-4 mt-2 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Go back"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-neutral-900">Your Previous Orders</h2>
          </div>
          <div className="space-y-1.5">
            {orders.map((order) => {
              const shortId = order.id.split('-').slice(-1)[0];
              const previewItems = order.items.slice(0, 3);

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-white rounded-lg border border-neutral-200 p-2 hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-xs font-semibold text-neutral-900">
                          Order #{shortId}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mb-1">{formatDate(order.createdAt)}</div>

                      {/* Product Images Preview - Compact */}
                      <div className="flex items-center gap-1">
                        {previewItems
                          .filter(item => item?.product) // Filter out items with null/undefined products
                          .map((item, idx) => (
                            <div
                              key={item.product.id}
                              className="w-6 h-6 bg-neutral-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                              style={{ marginLeft: idx > 0 ? '-4px' : '0' }}
                            >
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <span className="text-[8px] text-neutral-400">
                                  {(item.product.name || item.product.productName || '?').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))}
                        {order.items.length > 3 && (
                          <div className="w-6 h-6 bg-neutral-200 rounded flex items-center justify-center text-[8px] font-medium text-neutral-600">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="text-xs font-bold text-neutral-900">
                        ₹{order.totalAmount.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
                      </div>
                      {/* Order Again Button */}
                      <button
                        onClick={(e) => handleOrderAgain(order, e)}
                        disabled={addedOrders.has(order.id)}
                        className={`mt-1 text-[10px] font-semibold px-3 py-1 rounded-md transition-colors shadow-sm ${addedOrders.has(order.id)
                          ? 'bg-orange-200 text-neutral-600 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                          }`}
                      >
                        {addedOrders.has(order.id) ? 'Added to Cart!' : 'Order Again'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State Illustration - Show when no orders */}
      {!hasOrders && (
        <div className="bg-transparent py-6 px-4">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto">
            {/* Grocery Illustration */}
            <div className="relative w-full max-w-xs mb-4">
              <div className="relative flex items-center justify-center">
                {/* Yellow Shopping Bag */}
                <div className="relative w-40 h-48 bg-gradient-to-b from-yellow-400 via-yellow-300 to-yellow-500 rounded-b-2xl rounded-t-lg shadow-xl border-2 border-yellow-500/30 flex items-center justify-center">
                  {/* Enhanced bag opening/top with depth */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-8 bg-gradient-to-b from-yellow-500 to-yellow-400 rounded-t-lg shadow-inner"></div>

                  {/* Enhanced bag handle with 3D effect */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-7 border-[4px] border-yellow-600 rounded-full border-b-transparent shadow-lg">
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-4 border-[2px] border-yellow-500/50 rounded-full border-b-transparent"></div>
                  </div>

                  {/* Decorative pattern/stitching on bag */}
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-yellow-600/30"></div>
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 w-28 h-0.5 bg-yellow-600/20"></div>

                  {/* Healthy Delight text inside basket */}
                  <div className="relative z-10 text-center px-4">
                    <span className="text-2xl font-extrabold text-neutral-900 tracking-tight drop-shadow-sm">Healthy Delight</span>
                    <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full ml-1.5 shadow-sm"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reordering Message */}
            <h2 className="text-xl font-bold text-neutral-900 mb-1.5 text-center">
              Reordering will be easy
            </h2>
            <p className="text-xs text-neutral-600 text-center max-w-xs leading-snug">
              Items you order will show up here so you can buy them again easily
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
