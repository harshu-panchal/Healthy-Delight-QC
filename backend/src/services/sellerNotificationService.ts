import { Server as SocketIOServer } from 'socket.io';
import OrderItem from '../models/OrderItem';
import mongoose from 'mongoose';

import { getOrderItemCommissionRate } from './commissionService';

/**
 * Notify all sellers involved in an order about a new order or status change
 */
export async function notifySellersOfOrderUpdate(
    io: SocketIOServer,
    order: any,
    type: 'NEW_ORDER' | 'NEW_SCHEDULED_ORDER' | 'STATUS_UPDATE' | 'ORDER_CANCELLED'
): Promise<void> {
    try {
        if (!io) {
            console.error('Socket.io server not provided to notifySellersOfOrderUpdate');
            return;
        }

        // Get all unique seller IDs from order items
        // If items are populated, we can get them directly, otherwise we need to query
        let orderItems = order.items;

        // If items are just IDs, fetch the full OrderItem details to get seller IDs
        if (orderItems.length > 0 && (typeof orderItems[0] === 'string' || orderItems[0] instanceof mongoose.Types.ObjectId)) {
            orderItems = await OrderItem.find({ order: order._id });
        }

        const sellerIds = [...new Set(orderItems.map((item: any) => item.seller.toString()))];

        console.log(`🔔 Notifying ${sellerIds.length} sellers about ${type} for order ${order.orderNumber}`);

        for (const sellerId of sellerIds) {
            // Get only items belonging to this seller
            const sellerSpecificItems = orderItems.filter((item: any) => item.seller.toString() === sellerId);

            const mappedItems = await Promise.all(sellerSpecificItems.map(async (item: any) => {
                const commissionRate = item.commissionRate || await getOrderItemCommissionRate(item.product ? (item.product as any).toString() : '', sellerId as any);
                const commissionAmount = (item.total * commissionRate) / 100;
                const netEarning = item.total - commissionAmount;
                return {
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    total: item.total,
                    variation: item.variation,
                    commissionRate,
                    commissionAmount,
                    netEarning
                };
            }));

            const totalAmount = mappedItems.reduce((acc: number, item: any) => acc + item.total, 0);
            const totalCommission = mappedItems.reduce((acc: number, item: any) => acc + item.commissionAmount, 0);
            const netEarnings = mappedItems.reduce((acc: number, item: any) => acc + item.netEarning, 0);

            const notificationData = {
                type,
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                customer: {
                    name: order.customerName,
                    email: order.customerEmail,
                    phone: order.customerPhone,
                    address: order.deliveryAddress
                },
                items: mappedItems,
                totalAmount,
                totalCommission,
                netEarnings,
                timestamp: new Date(),
                orderType: order.orderType,
                scheduledDate: order.scheduledDate,
                scheduledTimeSlot: order.scheduledTimeSlot,
                timeSlot: order.timeSlot
            };

            // Emit to seller-specific room
            io.to(`seller-${sellerId}`).emit('seller-notification', notificationData);
            console.log(`📤 Emitted notification to seller-${sellerId}`);
        }
    } catch (error) {
        console.error('Error in notifySellersOfOrderUpdate:', error);
    }
}
