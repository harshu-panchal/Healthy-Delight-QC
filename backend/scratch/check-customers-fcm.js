const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CustomerSchema = new mongoose.Schema({}, { strict: false });
const Customer = mongoose.model('Customer', CustomerSchema, 'customers');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected successfully.');

        const customers = await Customer.find({}, {
            firstName: 1,
            lastName: 1,
            email: 1,
            mobile: 1,
            fcmTokens: 1,
            fcmTokenMobile: 1
        });

        console.log('Total Customers:', customers.length);
        customers.forEach(c => {
            console.log(`- ${c.firstName} ${c.lastName} (${c.email || 'no email'}, ${c.mobile || 'no mobile'}):`);
            console.log(`  Web FCM Tokens (${(c.fcmTokens || []).length}):`, c.fcmTokens || []);
            console.log(`  Mobile FCM Tokens (${(c.fcmTokenMobile || []).length}):`, c.fcmTokenMobile || []);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
