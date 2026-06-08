const mongoose = require('mongoose');
require('dotenv').config();

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const orders = await Order.find({ orderType: "Scheduled" });
    console.log(`Found ${orders.length} scheduled orders:`);
    orders.forEach(o => {
        console.log(`- Order: ${o.orderNumber}, Date: ${o.scheduledDate}, timeSlot: "${o.timeSlot}", scheduledTimeSlot: "${o.scheduledTimeSlot}", status: "${o.status}"`);
    });

    await mongoose.disconnect();
}

check().catch(console.error);
