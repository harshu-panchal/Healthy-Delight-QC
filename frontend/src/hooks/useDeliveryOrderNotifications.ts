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

    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const setStateSafe = useCallback((update: NotificationState | ((prev: NotificationState) => NotificationState)) => {
        if (isMountedRef.current) {
            setState(update);
        }
    }, []);

    // Check for orderId in query parameters (e.g., launched from push notification click)
    useEffect(() => {
        if (!isAuthenticated || user?.userType !== 'Delivery' || !user?.id) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('orderId');

        if (orderId) {
            console.log(`🔍 useDeliveryOrderNotifications: Found orderId in query params: ${orderId}`);

            const loadOrderDetails = async () => {
                try {
                    const { getOrderDetails } = await import('../services/api/delivery/deliveryService');
                    const order = await getOrderDetails(orderId);

                    if (order) {
                        console.log('📦 Loaded order details from query parameter:', order);

                        // Only show popup if it's pending assignment or pending broadcast offer
                        const isPendingRiderAction = 
                            order.deliveryBoyStatus === 'Pending' || 
                            order.status === 'Ready for pickup' || 
                            order.status === 'Rider Assigned' || 
                            order.status === 'Assigned' ||
                            order.status === 'Processed' ||
                            order.status === 'Pending';

                        if (!isPendingRiderAction) {
                            console.log('ℹ️ Order is no longer in a pending state, skipping notification popup.');
                            // Clean up orderId query param
                            const newUrl = window.location.pathname + window.location.search.replace(/(\?|&)orderId=[^&]*(&|$)/, '$1').replace(/\?$/, '');
                            window.history.replaceState({}, '', newUrl);
                            return;
                        }

                        // Map the API order structure to OrderNotificationData
                        const notificationData: OrderNotificationData = {
                            orderId: order.id,
                            orderNumber: order.orderId,
                            customerName: order.customerName,
                            customerPhone: order.customerPhone,
                            deliveryAddress: order.deliveryAddress || {
                                address: order.address || '',
                                city: '',
                                pincode: ''
                            },
                            total: order.totalAmount,
                            subtotal: order.totalAmount,
                            shipping: 0,
                            createdAt: order.createdAt,
                            orderType: order.orderType,
                            scheduledDate: order.scheduledDate,
                            scheduledTimeSlot: order.scheduledTimeSlot,
                            paymentMethod: order.paymentMethod,
                            type: order.orderType === 'Scheduled' ? 'SCHEDULED_ASSIGNMENT' : 'ASSIGNMENT_OFFER'
                        };

                        setStateSafe(prev => {
                            if (prev.currentNotification?.orderId === notificationData.orderId) {
                                return prev;
                            }
                            return {
                                ...prev,
                                currentNotification: notificationData
                            };
                        });

                        // Clear the query parameter from URL so it doesn't pop up again on refresh
                        const newUrl = window.location.pathname + window.location.search.replace(/(\?|&)orderId=[^&]*(&|$)/, '$1').replace(/\?$/, '');
                        window.history.replaceState({}, '', newUrl);
                    }
                } catch (error) {
                    console.error('Failed to load order details from notification link:', error);
                }
            };

            loadOrderDetails();
        }
    }, [isAuthenticated, user?.id, user?.userType, setStateSafe]);

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
            setStateSafe(prev => ({ ...prev, isConnected: true, error: null }));
            socket.emit('join-delivery-notifications', user.id);
        });

        socket.on('disconnect', (reason) => {
            if (reason === 'io client disconnect') {
                console.log('🔌 Delivery notification socket disconnected intentionally');
            } else {
                console.warn('⚠️ Delivery notification socket disconnected:', reason);
            }
            setStateSafe(prev => ({ ...prev, isConnected: false }));
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Notification socket connection error:', error.message);
            setStateSafe(prev => ({
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

            setStateSafe(prev => {
                if (prev.currentNotification) {
                    return { ...prev, notificationQueue: [...prev.notificationQueue, notificationWithMeta] };
                }
                return { ...prev, currentNotification: notificationWithMeta };
            });
        };

        const onOrderAccepted = (data: { orderId: string; acceptedBy: string }) => {
            console.log('✅ Order accepted by another delivery boy:', data);
            setStateSafe(prev => {
                if (prev.currentNotification?.orderId === data.orderId) {
                    const nextNotification = prev.notificationQueue[0] || null;
                    return {
                        ...prev,
                        currentNotification: nextNotification,
                        notificationQueue: prev.notificationQueue.slice(1)
                    };
                }
                return { ...prev, notificationQueue: prev.notificationQueue.filter((notif: OrderNotificationData) => notif.orderId !== data.orderId) };
            });
        };

        const onJoinedRoom = (data: any) => console.log('✅ Successfully joined notifications room:', data);

        const onOrderCancelled = (data: { orderId: string; message?: string }) => {
            console.log('❌ Order cancelled:', data);
            alert(data.message || 'An assigned order has been cancelled by the customer.');
            // Trigger a custom event so dashboard/orders list can refresh immediately
            window.dispatchEvent(new CustomEvent('refresh-orders'));
            
            // Also dismiss if it's currently popping up
            setStateSafe(prev => {
                if (prev.currentNotification?.orderId === data.orderId) {
                    const nextNotification = prev.notificationQueue[0] || null;
                    return {
                        ...prev,
                        currentNotification: nextNotification,
                        notificationQueue: prev.notificationQueue.slice(1)
                    };
                }
                return { ...prev, notificationQueue: prev.notificationQueue.filter((notif: OrderNotificationData) => notif.orderId !== data.orderId) };
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
        setStateSafe(prev => ({
            ...prev,
            currentNotification: prev.notificationQueue[0] || null,
            notificationQueue: prev.notificationQueue.slice(1),
        }));
    }, [setStateSafe]);

    const clearCurrentNotification = useCallback(() => {
        setStateSafe(prev => ({
            ...prev,
            currentNotification: null,
        }));
    }, [setStateSafe]);

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
