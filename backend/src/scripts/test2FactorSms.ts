import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Override mock setting for direct testing of the live 2Factor integration
process.env.USE_MOCK_OTP = 'false';

import { sendSmsOtp } from '../services/otpService';

async function test() {
  console.log('--- Testing 2Factor SMS OTP Integration ---');
  console.log('Env Path:', envPath);
  console.log('OTP_PROVIDER:', process.env.OTP_PROVIDER);
  console.log('TWOFACTOR_API_KEY:', process.env.TWOFACTOR_API_KEY ? '*****' + process.env.TWOFACTOR_API_KEY.slice(-4) : 'NOT SET');
  console.log('TWOFACTOR_SMS_TEMPLATE:', process.env.TWOFACTOR_SMS_TEMPLATE || 'NOT SET');

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB successfully.');
    } catch (err) {
      console.error('MongoDB Connection Error:', err);
      process.exit(1);
    }
  } else {
    console.error('MONGODB_URI is not set in your .env file!');
    process.exit(1);
  }

  try {
    // Standard test phone number (e.g. 10 digits)
    const testMobile = '9876543210';
    console.log(`\nTriggering live OTP send to ${testMobile}...`);

    const result = await sendSmsOtp(testMobile, 'Customer');
    console.log('\nSuccess! Result:', result);
  } catch (error: any) {
    console.error('\nTest Failed with Error:');
    console.error(error.message);
    if (error.response) {
      console.error('API Response Data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

test();
