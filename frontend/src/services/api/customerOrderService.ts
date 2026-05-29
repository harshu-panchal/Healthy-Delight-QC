import api from './config';

export interface OrderItem {
    product: {
        id: string;
        name: string;
        image: string;
        price: number;
    };
    quantity: number;
    total: number;
}

export interface CreateOrderData {
    items: {
        product: {
            id: string;
            name?: string;
        };
        quantity: number;
        variant?: string;
    }[];
    timeSlot: string;
    address: {
        addressLine?: string;
        city: string;
        state?: string;
        pincode: string;
        latitude: number;
        longitude: number;
        [key: string]: any;
    };
    paymentMethod: string;
    fees?: {
        deliveryFee: number;
        platformFee: number;
    };
}

export interface OrderResponse {
    success: boolean;
    message?: string;
    data: any;
}

export interface MyOrdersParams {
    page?: number;
    limit?: number;
    status?: string;
    orderType?: string;
}

/**
 * Create a new order
 */
export const createOrder = async (data: CreateOrderData): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>('/customer/orders', data);
    return response.data;
};

/**
 * Get my orders
 */
export const getMyOrders = async (params?: MyOrdersParams): Promise<any> => {
    const response = await api.get('/customer/orders', { params });
    return response.data;
};

/**
 * Get order by ID
 */
export const getOrderById = async (id: string): Promise<any> => {
    const response = await api.get(`/customer/orders/${id}`);
    return response.data;
};

/**
 * Get seller locations for an order
 */
export const getSellerLocationsForOrder = async (id: string): Promise<any> => {
    const response = await api.get(`/customer/orders/${id}/seller-locations`);
    return response.data;
};

/**
 * Refresh delivery OTP for an order
 */
export const refreshDeliveryOtp = async (id: string): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>(`/customer/orders/${id}/refresh-otp`);
    return response.data;
};

/**
 * Cancel an order
 */
export const cancelOrder = async (id: string, reason: string): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>(`/customer/orders/${id}/cancel`, { reason });
    return response.data;
};

/**
 * Update order notes (instructions/special requests)
 */
export const updateOrderNotes = async (id: string, data: { deliveryInstructions?: string; specialRequests?: string }): Promise<OrderResponse> => {
    const response = await api.patch<OrderResponse>(`/customer/orders/${id}/notes`, data);
    return response.data;
};

/**
 * Update scheduled order items
 */
export const updateScheduledOrderItems = async (
    id: string,
    data: {
        items: {
            product: string;
            quantity: number;
            variant?: string;
        }[];
    }
): Promise<OrderResponse> => {
    const response = await api.put<OrderResponse>(`/customer/orders/${id}/scheduled-items`, data);
    return response.data;
};

/**
 * Get order tracking details (ETA, live coordinates, status)
 */
export const getOrderTracking = async (id: string): Promise<any> => {
    const response = await api.get(`/customer/orders/${id}/tracking`);
    return response.data;
};
