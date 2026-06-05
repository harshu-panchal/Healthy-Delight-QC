const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

// 1. Initialize Firebase Admin in the script just like firebaseAdmin.ts does
let isFirebaseInitialized = false;
try {
    let serviceAccount;

    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountPath = envPath
        ? path.resolve(process.cwd(), envPath)
        : path.resolve(__dirname, '../config/firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
        console.log('Firebase initialized with file:', serviceAccountPath);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('Firebase initialized with env var');
    }

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        isFirebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
        console.warn('⚠️ No credentials found for Firebase');
    }
} catch (err) {
    console.error('Firebase init error:', err);
}

const CustomerSchema = new mongoose.Schema({}, { strict: false });
const Customer = mongoose.model('Customer', CustomerSchema, 'customers');

async function run() {
    if (!isFirebaseInitialized) {
        console.error('Cannot proceed without Firebase initialization');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const customer = await Customer.findOne({ email: 'harsh@appzeto.com' });
        if (!customer) {
            console.error('Customer harsh@appzeto.com not found');
            return;
        }

        const webTokens = customer.fcmTokens || [];
        const mobileTokens = customer.fcmTokenMobile || [];
        const allTokens = [...new Set([...webTokens, ...mobileTokens])];

        console.log(`\nFound ${allTokens.length} unique tokens for harsh@appzeto.com:`);
        console.log(`- Web Tokens: ${webTokens.length}`);
        console.log(`- Mobile Tokens: ${mobileTokens.length}`);

        for (let i = 0; i < allTokens.length; i++) {
            const token = allTokens[i];
            const isWeb = webTokens.includes(token);
            const isMobile = mobileTokens.includes(token);
            const typeStr = isWeb && isMobile ? 'Web & Mobile' : isWeb ? 'Web' : 'Mobile';

            console.log(`\n[Token ${i + 1}/${allTokens.length}] Type: ${typeStr}`);
            console.log(`Token value: ${token}`);

            const message = {
                notification: {
                    title: 'FCM Direct Test',
                    body: `Testing token ${i + 1} (${typeStr}) at ${new Date().toLocaleTimeString()}`,
                },
                data: {
                    type: 'test_direct',
                    timestamp: new Date().toISOString()
                },
                token: token
            };

            try {
                const response = await admin.messaging().send(message);
                console.log(`✅ Success! Message ID: ${response}`);
            } catch (error) {
                console.error(`❌ Failed: Code = ${error.code}, Message = ${error.message}`);
                if (error.errorInfo) {
                    console.error('   Details:', JSON.stringify(error.errorInfo));
                }
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
