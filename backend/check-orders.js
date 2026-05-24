const mongoose = require('mongoose');
require('dotenv').config();

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${orders.length} recent orders:`);
    for (const order of orders) {
        console.log({
            id: order._id,
            orderNumber: order.orderNumber,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.status,
            createdAt: order.createdAt
        });
    }

    await mongoose.disconnect();
}

check().catch(console.error);
