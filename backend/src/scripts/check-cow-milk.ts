import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/speedup';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const customers = await db.collection('customers').find({}).toArray();
  console.log('Customers in Database:', JSON.stringify(customers, null, 2));
  const product = await db.collection('products').findOne({ productName: /Cow Milk n/i });
  console.log('Product in Database:', JSON.stringify(product, null, 2));
  
  const carts = await db.collection('carts').find({}).toArray();
  console.log('Carts in Database:', JSON.stringify(carts, null, 2));
  
  const cartitems = await db.collection('cartitems').find({}).toArray();
  console.log('Cart Items in Database:', JSON.stringify(cartitems, null, 2));
  
  await mongoose.connection.close();
}

run().catch(console.error);
