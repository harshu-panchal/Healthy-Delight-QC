import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { OrderNotificationData, acceptOrder as acceptOrderService, rejectOrder as rejectOrderService, rejectAssignmentRest, AcceptOrderResponse, RejectOrderResponse } from '../services/api/delivery/deliveryOrderNotificationService';
import { getSocketBaseURL, getAuthToken } from '../services/api/config';
import { NavigateFunction } from 'react-router-dom';

interface NotificationState {
    currentNotification: OrderNotificationData | null;
    notificationQueue: OrderNotificationData[];
    isConnected: boolean;
    error: string | null;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 2000;

export const useDeliveryOrderNotifications = () => {
    const { isAuthenticated, user } = useAuth();
    const [state, setState] = useState<NotificationState>({
        currentNotification: null,
        notificationQueue: [],
        isConnected: false,
        error: null,
    });

    const socketRef = useRef<Socket | null>(null);
    const reconnectAttemptsRef = useRef(0);

    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            console.log('🔌 useDeliveryOrderNotifications: Disconnecting socket');
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    const connectSocket = useCallback(() => {
        if (!isAuthenticated || user?.userType !== 'Delivery' || !user?.id) {
            return null;
        }

        // Return if already connected/connecting
        if (socketRef.current?.active) {
            return socketRef.current;
        }

        const token = getAuthToken('Delivery');
        if (!token) return null;

        const socket = io(getSocketBaseURL(), {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: INITIAL_RECONNECT_DELAY,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 Delivery notification socket connected');
            reconnectAttemptsRef.current = 0;
            setState(prev => ({ ...prev, isConnected: true, error: null }));
            socket.emit('join-delivery-notifications', user.id);
        });

        socket.on('disconnect', (reason) => {
            console.warn('⚠️ Delivery notification socket disconnected:', reason);
            setState(prev => ({ ...prev, isConnected: false }));
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Notification socket connection error:', error.message);
            setState(prev => ({
                ...prev,
                isConnected: false,
                error: `Connection unstable: ${error.message}`,
            }));
        });

        return socket;
    }, [isAuthenticated, user?.id, user?.userType]);

    // Listener Registration Effect
    useEffect(() => {
        const socket = connectSocket();
        if (!socket) return;

        const onNewOrder = (orderData: OrderNotificationData & { type?: string }) => {
            console.log('📦 New order notification received:', orderData);
            const notificationWithMeta = { ...orderData, type: orderData.type || 'BROADCAST' };

            setState(prev => {
                if (prev.currentNotification) {
                    return { ...prev, notificationQueue: [...prev.notificationQueue, notificationWithMeta] };
                }
                return { ...prev, currentNotification: notificationWithMeta };
            });
        };

        const onOrderAccepted = (data: { orderId: string; acceptedBy: string }) => {
            console.log('✅ Order accepted by another delivery boy:', data);
            setState(prev => {
                if (prev.currentNotification?.orderId === data.orderId) {
                    const nextNotification = prev.notificationQueue[0] || null;
                    return {
                        ...prev,
                        currentNotification: nextNotification,
                        notificationQueue: prev.notificationQueue.slice(1)
                    };
                }
                return { ...prev, notificationQueue: prev.notificationQueue.filter(notif => notif.orderId !== data.orderId) };
            });
        };

        const onJoinedRoom = (data: any) => console.log('✅ Successfully joined notifications room:', data);

        const onOrderCancelled = (data: { orderId: string; message?: string }) => {
            console.log('❌ Order cancelled:', data);
            alert(data.message || 'An assigned order has been cancelled by the customer.');
            // Trigger a custom event so dashboard/orders list can refresh immediately
            window.dispatchEvent(new CustomEvent('refresh-orders'));
            
            // Also dismiss if it's currently popping up
            setState(prev => {
                if (prev.currentNotification?.orderId === data.orderId) {
                    const nextNotification = prev.notificationQueue[0] || null;
                    return {
                        ...prev,
                        currentNotification: nextNotification,
                        notificationQueue: prev.notificationQueue.slice(1)
                    };
                }
                return { ...prev, notificationQueue: prev.notificationQueue.filter(notif => notif.orderId !== data.orderId) };
            });
        };

        socket.on('new-order', onNewOrder);
        socket.on('new-scheduled-order', onNewOrder);
        socket.on('order-accepted', onOrderAccepted);
        socket.on('order-cancelled', onOrderCancelled);
        socket.on('joined-notifications-room', onJoinedRoom);

        return () => {
            console.log('🧹 useDeliveryOrderNotifications: Cleaning up listeners');
            socket.off('new-order', onNewOrder);
            socket.off('new-scheduled-order', onNewOrder);
            socket.off('order-accepted', onOrderAccepted);
            socket.off('order-cancelled', onOrderCancelled);
            socket.off('joined-notifications-room', onJoinedRoom);
        };
    }, [connectSocket]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            disconnectSocket();
        };
    }, [disconnectSocket]);

    const showNextNotification = useCallback(() => {
        setState(prev => ({
            ...prev,
            currentNotification: prev.notificationQueue[0] || null,
            notificationQueue: prev.notificationQueue.slice(1),
        }));
    }, []);

    const clearCurrentNotification = useCallback(() => {
        setState(prev => ({
            ...prev,
            currentNotification: null,
        }));
    }, []);

    const acceptOrder = useCallback(async (orderId: string, navigate?: NavigateFunction): Promise<AcceptOrderResponse> => {
        if (!socketRef.current || !user?.id) {
            return { success: false, message: 'Notification service not connected' };
        }

        try {
            const isScheduled = state.currentNotification?.orderId === orderId && state.currentNotification?.orderType === 'Scheduled';
            const response = await acceptOrderService(socketRef.current, orderId, user.id);
            if (response.success) {
                clearCurrentNotification();
                if (navigate) {
                    if (isScheduled) {
                        navigate('/delivery/orders?tab=scheduled');
                    } else {
                        navigate(`/delivery/orders/${orderId}`);
                    }
                }
            }
            return response;
        } catch (error: any) {
            console.error('Accept order error:', error);
            return { success: false, message: error.message || 'An error occurred while accepting the order' };
        }
    }, [user?.id, clearCurrentNotification, state.currentNotification]);

    const rejectOrder = useCallback(async (orderId: string): Promise<RejectOrderResponse> => {
        if (!socketRef.current || !user?.id) {
            return { success: false, message: 'Notification service not connected', allRejected: false };
        }

        try {
            const isTargeted = state.currentNotification?.type === 'ASSIGNMENT_OFFER' || 
                               state.currentNotification?.type === 'SCHEDULED_ASSIGNMENT' || 
                               state.currentNotification?.type === 'SCHEDULED_ORDER';
            
            let response;
            if (isTargeted) {
                response = await rejectAssignmentRest(orderId);
            } else {
                response = await rejectOrderService(socketRef.current, orderId, user.id);
                if (!response.success && response.message === 'Order notification not found') {
                    console.log('🔄 Socket rejection returned not found. Trying REST fallback...');
                    response = await rejectAssignmentRest(orderId);
                }
            }

            if (response.success) {
                clearCurrentNotification();
            }
            return response;
        } catch (error: any) {
            console.error('Reject order error:', error);
            return {
                success: false,
                message: error.message || 'An error occurred while rejecting the order',
                allRejected: false
            };
        }
    }, [user?.id, clearCurrentNotification, state.currentNotification]);

    return {
        ...state,
        showNextNotification,
        clearCurrentNotification,
        acceptOrder,
        rejectOrder,
        isConnected: state.isConnected,
    };
};
