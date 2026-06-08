const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CustomerSchema = new mongoose.Schema({}, { strict: false });
const Customer = mongoose.model('Customer', CustomerSchema, 'customers');

const NotificationSchema = new mongoose.Schema({
    recipientType: String,
    recipientId: mongoose.Schema.Types.ObjectId,
    title: String,
    message: String,
    type: String,
    isRead: Boolean,
    priority: String,
    createdAt: Date,
    updatedAt: Date
}, { strict: false });
const Notification = mongoose.model('Notification', NotificationSchema, 'notifications');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Find customer Harsh
        const customer = await Customer.findOne({ name: 'Harsh' });
        if (!customer) {
            console.error('Customer Harsh not found');
            return;
        }
        console.log(`Found customer Harsh with ID: ${customer._id}`);

        // Clean up previous test notifications to keep it clean
        const deleteRes = await Notification.deleteMany({
            title: { $in: ['[Test] Target Alert', '[Test] Broadcast Alert'] }
        });
        console.log(`Deleted ${deleteRes.deletedCount} old test notifications`);

        // Create a targeted notification for Harsh
        const targeted = await Notification.create({
            recipientType: 'Customer',
            recipientId: customer._id,
            title: '[Test] Target Alert',
            message: 'This is a premium organic alert specifically for Harsh!',
            type: 'Order',
            isRead: false,
            priority: 'High',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('Created targeted notification:', targeted._id);

        // Create a broadcast notification for All
        const broadcast = await Notification.create({
            recipientType: 'All',
            title: '[Test] Broadcast Alert',
            message: 'Healthy Delight brings fresh farm milk to your doorstep today!',
            type: 'Success',
            isRead: false,
            priority: 'Medium',
            createdAt: new Date(Date.now() - 3600000), // 1 hour ago
            updatedAt: new Date(Date.now() - 3600000)
        });
        console.log('Created broadcast notification:', broadcast._id);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
