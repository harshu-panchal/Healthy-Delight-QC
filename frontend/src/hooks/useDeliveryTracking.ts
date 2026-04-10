import { useState, useEffect, useCallback, useRef } from 'react'
// @ts-ignore - socket.io-client types may not be available
import { io, Socket } from 'socket.io-client'
import { getSocketBaseURL, getAuthToken } from '../services/api/config'

interface LocationUpdate {
    orderId: string
    location: {
        latitude: number;
        longitude: number;
        timestamp: Date;
    }
    eta: number
    distance: number
    status: string
    timestamp: Date
}

interface TrackingData {
    deliveryLocation: { lat: number; lng: number } | null
    eta: number
    distance: number
    status: string
    orderStatus: string | null
    isConnected: boolean
    lastUpdate: Date | null
    error: string | null
    reconnectAttempts: number
}

const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 2000

export const useDeliveryTracking = (orderId: string | undefined) => {
    const [trackingData, setTrackingData] = useState<TrackingData>({
        deliveryLocation: null,
        eta: 30,
        distance: 0,
        status: 'idle',
        orderStatus: null,
        isConnected: false,
        lastUpdate: null,
        error: null,
        reconnectAttempts: 0,
    })

    const socketRef = useRef<Socket | null>(null)
    const reconnectAttemptsRef = useRef(0)

    // Manual disconnect helper
    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            console.log('🔌 useDeliveryTracking: Disconnecting socket')
            if (orderId) {
                socketRef.current.emit('stop-tracking', orderId)
            }
            socketRef.current.disconnect()
            socketRef.current = null
        }
    }, [orderId])

    const connectSocket = useCallback(() => {
        if (!orderId) return
 
        // If already connected, don't create new socket
        if (socketRef.current?.connected) {
            return socketRef.current
        }

        const token = getAuthToken();
        const socket = io(getSocketBaseURL(), {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: INITIAL_RECONNECT_DELAY,
        })
 
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('🔌 Socket connected')
            reconnectAttemptsRef.current = 0
            setTrackingData(prev => ({
                ...prev,
                isConnected: true,
                error: null,
                reconnectAttempts: 0
            }))
            socket.emit('track-order', orderId)
        })

        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason)
            setTrackingData(prev => ({ ...prev, isConnected: false }))
        })

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error)
            reconnectAttemptsRef.current += 1
            setTrackingData(prev => ({
                ...prev,
                isConnected: false,
                error: 'Connection unstable',
                reconnectAttempts: reconnectAttemptsRef.current
            }))
        })

        return socket
    }, [orderId])

    // Event Registration Effect
    useEffect(() => {
        if (!orderId) return
        const socket = connectSocket()
        if (!socket) return

        const onLocationUpdate = (update: LocationUpdate) => {
            console.log('📍 Location update received:', update)
            setTrackingData(prev => ({
                ...prev,
                deliveryLocation: {
                    lat: update.location.latitude,
                    lng: update.location.longitude,
                },
                eta: update.eta,
                distance: update.distance,
                status: update.status,
                lastUpdate: new Date(),
                error: null,
            }))
        }
        
        const onStatusUpdate = (status: string) => (data: any) => {
            console.log(`📦 Status update: ${status}`, data)
            setTrackingData(prev => ({ ...prev, orderStatus: status, lastUpdate: new Date() }))
        }

        const onTrackingStarted = (data: any) => console.log('📡 Tracking started:', data)
        const onTrackingError = (data: any) => {
            console.error('❌ Tracking error:', data)
            setTrackingData(prev => ({ ...prev, error: data.message || 'Tracking error' }))
        }

        socket.on('tracking-started', onTrackingStarted)
        socket.on('tracking-error', onTrackingError)
        socket.on('location-update', onLocationUpdate)
        socket.on('order-taken', onStatusUpdate('Picked up'))
        socket.on('seller-pickup-confirmed', (data: any) => {
            if (data.allPickedUp) onStatusUpdate(data.newStatus || 'Picked up')(data)
        })
        socket.on('order-delivered', onStatusUpdate('Delivered'))

        return () => {
            console.log('🧹 useDeliveryTracking: Cleaning up listeners')
            socket.off('tracking-started', onTrackingStarted)
            socket.off('tracking-error', onTrackingError)
            socket.off('location-update', onLocationUpdate)
            socket.off('order-taken')
            socket.off('seller-pickup-confirmed')
            socket.off('order-delivered')
        }
    }, [orderId, connectSocket])

    // Unmount cleanup
    useEffect(() => {
        return () => {
            disconnectSocket()
        }
    }, [disconnectSocket])

    return {
        ...trackingData,
        reconnect: () => {
            disconnectSocket()
            connectSocket()
        },
        disconnect: disconnectSocket,
    }
}
