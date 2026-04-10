import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { OrderNotificationData, acceptOrder as acceptOrderService, rejectOrder as rejectOrderService } from '../services/api/delivery/deliveryOrderNotificationService';
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

        socket.on('new-order', onNewOrder);
        socket.on('order-accepted', onOrderAccepted);
        socket.on('joined-notifications-room', onJoinedRoom);

        return () => {
            console.log('🧹 useDeliveryOrderNotifications: Cleaning up listeners');
            socket.off('new-order', onNewOrder);
            socket.off('order-accepted', onOrderAccepted);
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

    const acceptOrder = useCallback(async (orderId: string, navigate?: NavigateFunction) => {
        if (!socketRef.current || !user?.id) return;

        try {
            const response = await acceptOrderService(socketRef.current, orderId, user.id);
            if (response.success) {
                clearCurrentNotification();
                if (navigate) {
                    navigate(`/delivery/orders/${orderId}`);
                }
            } else {
                alert(response.message || 'Failed to accept order');
            }
        } catch (error: any) {
            alert(error.message || 'An error occurred while accepting the order');
        }
    }, [user?.id, clearCurrentNotification]);

    const rejectOrder = useCallback(async (orderId: string) => {
        if (!socketRef.current || !user?.id) return;

        try {
            const response = await rejectOrderService(socketRef.current, orderId, user.id);
            if (response.success) {
                clearCurrentNotification();
            } else {
                alert(response.message || 'Failed to reject order');
            }
        } catch (error: any) {
            alert(error.message || 'An error occurred while rejecting the order');
        }
    }, [user?.id, clearCurrentNotification]);

    return {
        ...state,
        showNextNotification,
        clearCurrentNotification,
        acceptOrder,
        rejectOrder,
        isConnected: state.isConnected,
    };
};
