
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

const findSellerCoords = async () => {
    await connectDB();
    try {
        const Order = mongoose.connection.collection('orders');
        const OrderItem = mongoose.connection.collection('orderitems');
        const Seller = mongoose.connection.collection('sellers');

        const orderId = new mongoose.Types.ObjectId('6a06b28217f050801bbbb203');
        const items = await OrderItem.find({ order: orderId }).toArray();
        
        console.log(`Order has ${items.length} items`);
        
        for (const item of items) {
            const seller = await Seller.findOne({ _id: item.seller });
            if (seller) {
                console.log(`Seller: ${seller.storeName}`);
                console.log(`Address: ${seller.address}`);
                console.log(`Coords: Lat ${seller.latitude}, Lng ${seller.longitude}`);
                console.log('---');
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

findSellerCoords();
