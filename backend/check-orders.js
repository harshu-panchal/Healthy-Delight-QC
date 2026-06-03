const mongoose = require('mongoose');
require('dotenv').config();

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const order = await Order.findOne({ orderNumber: { $regex: /391708$/ } });
    console.log(JSON.stringify(order, null, 2));

    await mongoose.disconnect();
}

check().catch(console.error);
