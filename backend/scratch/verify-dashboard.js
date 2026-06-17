const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Order = require('../src/models/Order').default;
const Delivery = require('../src/models/Delivery').default;
const Commission = require('../src/models/Commission').default;

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const deliveryId = '69b2eb664fed0323e7d058a0'; // Target delivery boy ID from earlier inspect
        const objectId = new mongoose.Types.ObjectId(deliveryId);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Run the stats query as done in deliveryDashboardController
        const stats = await Order.aggregate([
            {
                $match: {
                    deliveryBoy: objectId,
                }
            },
            {
                $group: {
                    _id: null,
                    pendingOrders: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        {
                                            $and: [
                                                { $ne: ["$orderType", "Scheduled"] },
                                                {
                                                    $or: [
                                                        { $in: ["$status", ["Ready for pickup", "Out for Delivery", "Picked Up", "Assigned", "In Transit"]] },
                                                        { $eq: ["$deliveryBoyStatus", "Pending"] }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            $and: [
                                                { $eq: ["$orderType", "Scheduled"] },
                                                { $lte: ["$scheduledDate", todayEnd] },
                                                { $in: ["$deliveryBoyStatus", ["Pending", "Accepted", "Assigned", "Picked Up", "In Transit"]] },
                                                { $ne: ["$status", "Delivered"] },
                                                { $ne: ["$status", "Cancelled"] },
                                                { $ne: ["$status", "Returned"] },
                                                { $ne: ["$status", "Rejected"] }
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        console.log('Stats count output:', stats);

        // Fetch list of Pending Orders as done in deliveryDashboardController
        const pendingOrdersList = await Order.find({
            deliveryBoy: deliveryId,
            $or: [
                {
                    orderType: { $ne: "Scheduled" },
                    $or: [
                        { status: { $in: ["Ready for pickup", "Out for Delivery", "Picked Up", "Assigned", "In Transit"] } },
                        { deliveryBoyStatus: "Pending" }
                    ]
                },
                {
                    orderType: "Scheduled",
                    scheduledDate: { $lte: todayEnd },
                    deliveryBoyStatus: { $in: ["Pending", "Accepted", "Assigned", "Picked Up", "In Transit"] },
                    status: { $nin: ["Delivered", "Cancelled", "Returned", "Rejected"] }
                }
            ]
        });

        console.log(`Pending orders list count: ${pendingOrdersList.length}`);
        pendingOrdersList.forEach(order => {
            console.log({
                orderNumber: order.orderNumber,
                orderType: order.orderType,
                status: order.status,
                deliveryBoyStatus: order.deliveryBoyStatus,
                scheduledDate: order.scheduledDate
            });
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
