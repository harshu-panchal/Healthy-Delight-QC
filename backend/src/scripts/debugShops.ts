import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from '../models/Shop';

dotenv.config();

async function run() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected successfully!");

    const shops = await Shop.find({}).lean();
    console.log(`Found ${shops.length} shops in database:`);
    for (const shop of shops) {
      console.log(`- Shop Name: ${shop.name}`);
      console.log(`  ID: ${shop._id}`);
      console.log(`  storeId: ${shop.storeId}`);
      console.log(`  image: ${shop.image}`);
      console.log(`  isActive: ${shop.isActive}`);
      console.log(`  products count: ${shop.products?.length || 0}`);
      console.log(`  products preview:`, shop.products?.slice(0, 3));
      console.log("-----------------------------------------");
    }

  } catch (error) {
    console.error("Error running script:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from Database.");
  }
}

run();
