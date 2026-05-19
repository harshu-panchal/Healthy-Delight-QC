import cron from 'node-cron';
import Order from '../models/Order';
import { Server as SocketIOServer } from 'socket.io';
import { notifyRiderOfScheduledAssignment } from '../services/orderNotificationService';

export const startScheduledOrderPromotionJob = (io: SocketIOServer) => {
    // Run every day at 5:30 AM
    cron.schedule('30 5 * * *', async () => {
        console.log('[Cron Job] Running scheduled order promotion at 5:30 AM...');
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // Find all scheduled orders for today
            const orders = await Order.find({
                orderType: 'Scheduled',
                scheduledDate: { $gte: todayStart, $lte: todayEnd },
                status: { $in: ['Scheduled', 'Accepted', 'Rider Assigned'] }
            });

            console.log(`[Cron Job] Found ${orders.length} scheduled orders for today.`);

            for (const order of orders) {
                if (order.deliveryBoy && order.deliveryBoyStatus === 'Pending') {
                    await notifyRiderOfScheduledAssignment(io, order, order.deliveryBoy.toString());
                    console.log(`[Cron Job] Resent notification to rider ${order.deliveryBoy} for order ${order.orderNumber}`);
                }
                
                io.to(`order-${order._id}`).emit('delivery-date-arrived', {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    message: "Today is the scheduled delivery date for this order."
                });
            }
        } catch (error) {
            console.error('[Cron Job] Error promoting scheduled orders:', error);
        }
    });
    console.log('[Cron Job] Scheduled Order Promotion Job initialized (5:30 AM daily)');
};
