const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Order.aggregate([
        { $match: { status: "Delivered", paymentStatus: "Paid" } },
        { 
            $group: { 
                _id: null, 
                avg: { $avg: { $ifNull: ["$total", 0] } },
                max: { $max: { $ifNull: ["$total", 0] } },
                count: { $sum: 1 }
            } 
        }
    ]);

    console.log('Completed orders summary:', result);

    await mongoose.disconnect();
}

check().catch(console.error);
