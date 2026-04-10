import { Socket } from 'socket.io-client';
import api from '../config';

export interface OrderNotificationData {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: {
        address: string;
        city: string;
        state?: string;
        pincode: string;
        landmark?: string;
    };
    total: number;
    subtotal: number;
    shipping: number;
    createdAt: string;
    type?: string;
}

export interface AcceptOrderResponse {
    success: boolean;
    message: string;
}

export interface RejectOrderResponse {
    success: boolean;
    message: string;
    allRejected: boolean;
}

/**
 * Accept an order via WebSocket
 */
export const acceptOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<AcceptOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
            });
        }, 10000); // 10 second timeout

        socket.emit('accept-order', { orderId, deliveryBoyId });

        socket.once('accept-order-response', (response: AcceptOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Reject an order via WebSocket
 */
export const rejectOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<RejectOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
                allRejected: false,
            });
        }, 10000); // 10 second timeout

        socket.emit('reject-order', { orderId, deliveryBoyId });

        socket.once('reject-order-response', (response: RejectOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Accept a targeted assignment via REST API
 */
export const acceptAssignmentRest = async (orderId: string): Promise<AcceptOrderResponse> => {
    try {
        const response = await api.post(`/delivery/orders/${orderId}/accept-assignment`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to accept assignment');
    }
};

/**
 * Reject a targeted assignment via REST API
 */
export const rejectAssignmentRest = async (orderId: string): Promise<RejectOrderResponse> => {
    try {
        const response = await api.post(`/delivery/orders/${orderId}/reject-assignment`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to reject assignment');
    }
};

