import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderNotificationData } from '../../../services/api/delivery/deliveryOrderNotificationService';
import deliveryAlertMp3 from '../../../../assets/sound/delivery-alert.mp3';

interface OrderNotificationCardProps {
    notification: OrderNotificationData;
    onAccept: (orderId: string) => Promise<{ success: boolean; message: string }>;
    onReject: (orderId: string) => Promise<{ success: boolean; message: string; allRejected: boolean }>;
}

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

export default function OrderNotificationCard({
    notification,
    onAccept,
    onReject,
}: OrderNotificationCardProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playPromiseRef = useRef<Promise<void> | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const vibrationPatternRef = useRef<number[]>([200, 100, 200, 100, 200]);
    const isStoppedRef = useRef(false);

    // Vibrate on notification (if supported)
    const vibrate = useCallback((pattern?: number | number[]) => {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern || vibrationPatternRef.current);
            } catch (error) {
                console.log('Vibration not supported or blocked:', error);
            }
        }
    }, []);

    // Robust centralized stop audio function
    const stopAudio = useCallback(() => {
        isStoppedRef.current = true;
        const audio = audioRef.current;
        if (!audio) return;

        const performPause = () => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (err) {
                console.error('Error pausing audio:', err);
            }
        };

        if (playPromiseRef.current) {
            playPromiseRef.current.then(performPause).catch(performPause);
            playPromiseRef.current = null;
        } else {
            performPause();
        }
    }, []);

    // Initialize audio with better error handling
    useEffect(() => {
        isStoppedRef.current = false;
        const audio = new Audio(deliveryAlertMp3);
        audio.loop = true;
        audio.volume = 0.8;

        audioRef.current = audio;

        // Vibrate when notification appears
        vibrate();

        // Try to play audio with better permission handling
        const playAudio = async () => {
            if (isStoppedRef.current) return;
            try {
                const promise = audio.play();
                playPromiseRef.current = promise;
                await promise;
                if (isStoppedRef.current) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                setHasUserInteracted(true);
                setAudioError(null);
            } catch (error: any) {
                console.log('Audio autoplay blocked:', error);
                if (error.name === 'NotAllowedError') {
                    setAudioError('Tap to enable sound');
                } else {
                    setAudioError('Sound blocked');
                }
            }
        };

        playAudio();

        return () => {
            stopAudio();
            audioRef.current = null;

            // Stop vibration
            if ('vibrate' in navigator) {
                try {
                    navigator.vibrate(0);
                } catch (err) {
                    console.error('Error stopping vibration:', err);
                }
            }
        };
    }, [vibrate, stopAudio]);

    // Play audio on user interaction with better error handling
    const handleUserInteraction = async (e?: React.SyntheticEvent) => {
        if (isProcessing) return;
        if (e?.target && (e.target as HTMLElement).closest('button')) {
            return;
        }

        if (!hasUserInteracted && audioRef.current) {
            try {
                // Ensure audio is loaded
                if (audioRef.current.readyState < 2) {
                    audioRef.current.load();
                }
                const promise = audioRef.current.play();
                playPromiseRef.current = promise;
                await promise;
                setHasUserInteracted(true);
                setAudioError(null);
            } catch (error: any) {
                console.error('Failed to play audio:', error);
                if (error.name === 'NotAllowedError') {
                    setAudioError('Audio permission denied');
                } else if (error.name === 'NotSupportedError') {
                    setAudioError('Audio not supported on this device');
                } else {
                    setAudioError('Failed to play audio');
                }
            }
        }
    };

    const handleAccept = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isProcessing) return;

        setIsProcessing(true);
        
        // Stop audio and vibration immediately
        stopAudio();
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }

        try {
            const result = await onAccept(notification.orderId);
            if (!result.success) {
                // Suppress alert for "Order notification not found" as it's handled by the hook clearing the notification
                if (result.message !== 'Order notification not found') {
                    alert(result.message || 'Failed to accept order');
                }
                setIsProcessing(false);
                isStoppedRef.current = false;
                // Resume audio if accept failed
                if (audioRef.current && hasUserInteracted) {
                    const promise = audioRef.current.play();
                    playPromiseRef.current = promise;
                    promise.catch(console.error);
                    vibrate(); // Resume vibration
                }
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            alert('Failed to accept order');
            setIsProcessing(false);
            isStoppedRef.current = false;
            // Resume audio if accept failed
            if (audioRef.current && hasUserInteracted) {
                const promise = audioRef.current.play();
                playPromiseRef.current = promise;
                promise.catch(console.error);
                vibrate(); // Resume vibration
            }
        }
    };

    const handleReject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isProcessing) return;

        setIsProcessing(true);

        // Stop audio and vibration immediately
        stopAudio();
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }

        try {
            const result = await onReject(notification.orderId);
            if (!result.success) {
                // Suppress alert for "Order notification not found"
                if (result.message !== 'Order notification not found') {
                    alert(result.message || 'Failed to reject order');
                }
                isStoppedRef.current = false;
                // Resume audio if reject failed
                if (audioRef.current && hasUserInteracted) {
                    const promise = audioRef.current.play();
                    playPromiseRef.current = promise;
                    promise.catch(console.error);
                    vibrate(); // Resume vibration
                }
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            alert('Failed to reject order');
            isStoppedRef.current = false;
            // Resume audio if reject failed
            if (audioRef.current && hasUserInteracted) {
                const promise = audioRef.current.play();
                playPromiseRef.current = promise;
                promise.catch(console.error);
                vibrate(); // Resume vibration
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const formatAddress = () => {
        const { address, city, state, pincode, landmark } = notification.deliveryAddress;
        return `${address}${landmark ? `, Near ${landmark}` : ''}, ${city}${state ? `, ${state}` : ''} - ${pincode}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-4 right-4 sm:top-4 sm:left-auto sm:right-4 sm:w-auto sm:max-w-md z-50"
            onClick={handleUserInteraction}
            onMouseEnter={handleUserInteraction}
            onTouchStart={handleUserInteraction}
            style={{
                // Support for safe area insets (iOS notches, etc.)
                paddingTop: 'env(safe-area-inset-top, 0)',
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl border-2 border-primary p-4 sm:p-6">
                {/* Header with pulsing indicator */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                            {notification.type === 'ASSIGNMENT_OFFER' ? 'Assignment Offer!' : 
                             notification.orderType === 'Scheduled' ? 'Scheduled Order Offer!' : 'New Order!'}
                        </h3>
                    </div>
                    {(audioError || !hasUserInteracted) && (
                        <div className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded whitespace-nowrap">
                            {audioError || 'Tap to enable sound'}
                        </div>
                    )}
                </div>

                {/* Order Information */}
                <div className="space-y-3 mb-4">
                    {notification.orderType === 'Scheduled' && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Scheduled Delivery</p>
                            <p className="text-sm font-semibold text-neutral-800">
                                {notification.scheduledDate ? new Date(notification.scheduledDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                            <p className="text-xs font-medium text-neutral-600 mt-0.5">
                                Slot: {notification.scheduledTimeSlot || 'N/A'}
                            </p>
                        </div>
                    )}

                    <div>
                        <p className="text-xs sm:text-sm text-neutral-600">Order Number</p>
                        <p className="text-base sm:text-lg font-semibold text-neutral-900 break-all">{formatOrderFriendly(notification.orderNumber, notification.orderId)}</p>
                    </div>

                    <div>
                        <p className="text-xs sm:text-sm text-neutral-600">Customer</p>
                        <p className="text-sm sm:text-base font-medium text-neutral-900 break-words">{notification.customerName}</p>
                        <p className="text-xs sm:text-sm text-neutral-500 break-all">{notification.customerPhone}</p>
                    </div>

                    <div>
                        <p className="text-xs sm:text-sm text-neutral-600">Delivery Address</p>
                        <p className="text-xs sm:text-sm text-neutral-900 break-words leading-relaxed">{formatAddress()}</p>
                    </div>

                    <div>
                        <p className="text-xs sm:text-sm text-neutral-600">Order Amount</p>
                        <div className="flex items-center gap-2">
                            <p className="text-lg sm:text-xl font-bold text-primary">₹{notification.total.toFixed(2)}</p>
                            {(notification.paymentMethod === 'Online' || notification.paymentMethod === 'Wallet') && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-md text-xs font-bold uppercase tracking-wider">
                                    Paid
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleReject}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-3 sm:py-3 bg-neutral-100 active:bg-neutral-200 text-neutral-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isProcessing ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-3 sm:py-3 bg-primary active:bg-primary-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isProcessing ? 'Processing...' : 'Accept'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

