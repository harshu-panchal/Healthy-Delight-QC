const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Let's get order schema fields dynamically or just find some orders
        const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
        console.log(`Total orders found: ${orders.length}`);
        
        for (const order of orders) {
            console.log({
                orderNumber: order.orderNumber,
                orderType: order.orderType,
                status: order.status,
                deliveryBoyStatus: order.deliveryBoyStatus,
                scheduledDate: order.scheduledDate,
                deliveryBoy: order.deliveryBoy,
                createdAt: order.createdAt
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
