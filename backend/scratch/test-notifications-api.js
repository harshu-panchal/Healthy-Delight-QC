const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CustomerSchema = new mongoose.Schema({}, { strict: false });
const Customer = mongoose.model('Customer', CustomerSchema, 'customers');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const customer = await Customer.findOne({ name: 'Harsh' });
        if (!customer) {
            console.error('Customer Harsh not found in DB');
            return;
        }
        await mongoose.disconnect();

        console.log(`Testing Customer Notifications APIs for phone: ${customer.phone}`);

        // 1. Send OTP to generate a login session
        console.log('\n--- 1. Sending OTP ---');
        const sendOtpRes = await axios.post(`${BASE_URL}/auth/customer/send-sms-otp`, {
            mobile: customer.phone,
            action: 'login'
        });
        const sessionId = sendOtpRes.data.sessionId;
        console.log(`Session ID generated: ${sessionId}`);

        // 2. Verify OTP (using mock OTP 9999 as configured in backend .env)
        console.log('\n--- 2. Verifying OTP ---');
        const verifyOtpRes = await axios.post(`${BASE_URL}/auth/customer/verify-sms-otp`, {
            mobile: customer.phone,
            otp: '9999',
            sessionId: sessionId,
            action: 'login'
        });
        const token = verifyOtpRes.data.data.token;
        console.log(`Login successful! JWT Token acquired.`);

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 3. Fetch notifications for customer Harsh
        console.log('\n--- 3. Fetching Notifications ---');
        const fetchRes = await axios.get(`${BASE_URL}/customer/notifications`, authHeader);
        const notifications = fetchRes.data.data;
        console.log(`Fetched ${notifications.length} notifications:`);
        
        let testTargeted = null;
        let testBroadcast = null;

        notifications.forEach(n => {
            console.log(`- [${n.isRead ? 'READ' : 'UNREAD'}] ${n.title}: ${n.message} (Type: ${n.type})`);
            if (n.title === '[Test] Target Alert') testTargeted = n;
            if (n.title === '[Test] Broadcast Alert') testBroadcast = n;
        });

        if (!testTargeted || !testBroadcast) {
            throw new Error('Could not find both created test notifications in fetched list!');
        }
        console.log('✅ Found both targeted and broadcast test notifications successfully.');

        // 4. Mark targeted notification as read
        console.log(`\n--- 4. Marking targeted notification (${testTargeted._id}) as READ ---`);
        const readRes = await axios.put(`${BASE_URL}/customer/notifications/${testTargeted._id}/read`, {}, authHeader);
        console.log(`Mark as read response: success = ${readRes.data.success}`);

        // 5. Fetch notifications again and verify targeted is read, broadcast is still unread
        console.log('\n--- 5. Verifying Notification Read Status ---');
        const fetchRes2 = await axios.get(`${BASE_URL}/customer/notifications`, authHeader);
        const notifications2 = fetchRes2.data.data;
        
        let verifiedTargeted = notifications2.find(n => n._id === testTargeted._id);
        let verifiedBroadcast = notifications2.find(n => n._id === testBroadcast._id);

        console.log(`Targeted Notification [${verifiedTargeted.title}] isRead: ${verifiedTargeted.isRead}`);
        console.log(`Broadcast Notification [${verifiedBroadcast.title}] isRead: ${verifiedBroadcast.isRead}`);

        if (verifiedTargeted.isRead && !verifiedBroadcast.isRead) {
            console.log('\n✅ End-to-End API verification PASSED! Targeted notification is marked as read, broadcast remains unread.');
        } else {
            throw new Error('Re-verification failed! Check isRead values.');
        }

    } catch (err) {
        console.error('API Verification Failed:', err.response?.data || err.message);
    }
}

run();
