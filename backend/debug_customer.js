
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

const findCustomerCoords = async () => {
    await connectDB();
    try {
        const Order = mongoose.connection.collection('orders');
        const orderId = new mongoose.Types.ObjectId('6a06b28217f050801bbbb203');
        const order = await Order.findOne({ _id: orderId });
        
        if (order && order.deliveryAddress) {
            console.log(`Customer: ${order.customerName}`);
            console.log(`Address: ${order.deliveryAddress.address}`);
            console.log(`Coords: Lat ${order.deliveryAddress.latitude}, Lng ${order.deliveryAddress.longitude}`);
        } else {
            console.log('Order or delivery address not found');
        }
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

findCustomerCoords();
