import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/speedup';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const resultRetailer = await db.collection('customers').updateOne(
    { phone: '9111966732' },
    { $set: { customerType: 'retailer' } }
  );
  console.log('Update Harsh to Retailer:', resultRetailer);

  const resultWholesaler = await db.collection('customers').updateOne(
    { phone: '7999942772' },
    { $set: { customerType: 'wholesaler' } }
  );
  console.log('Update Priyanshi to Wholesaler:', resultWholesaler);

  const updatedHarsh = await db.collection('customers').findOne({ phone: '9111966732' });
  console.log('Harsh details:', updatedHarsh);

  const updatedPriyanshi = await db.collection('customers').findOne({ phone: '7999942772' });
  console.log('Priyanshi details:', updatedPriyanshi);

  await mongoose.connection.close();
}

run().catch(console.error);
