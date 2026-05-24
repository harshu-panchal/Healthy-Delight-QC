import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Commission from '../models/Commission';
import Order from '../models/Order';
import Seller from '../models/Seller';
import { creditWallet } from '../services/walletManagementService';

dotenv.config();

async function migrate() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("MONGODB_URI is not defined in environment variables");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected successfully!");

        // Find all seller commissions that are pending
        const pendingCommissions = await Commission.find({
            type: 'SELLER',
            status: 'Pending'
        });

        console.log(`Found ${pendingCommissions.length} pending seller commissions.`);

        let migratedCount = 0;

        for (const comm of pendingCommissions) {
            const order = await Order.findById(comm.order);
            if (!order) {
                console.log(`Order ${comm.order} not found for commission ${comm._id}. Skipping.`);
                continue;
            }

            // Only migrate if the order is delivered!
            if (order.status === 'Delivered') {
                console.log(`Migrating Commission ${comm._id} for Delivered Order #${order.orderNumber}...`);

                const seller = await Seller.findById(comm.seller);
                if (!seller) {
                    console.log(`Seller ${comm.seller} not found. Skipping.`);
                    continue;
                }

                // Earning is Order Amount - Commission Amount
                const netEarning = comm.orderAmount - comm.commissionAmount;

                // Update commission status to Paid
                comm.status = 'Paid';
                comm.paidAt = new Date();
                await comm.save();

                // Credit the seller's wallet
                await creditWallet(
                    comm.seller!.toString(),
                    'SELLER',
                    netEarning,
                    `Sale proceeds for COD order ${order.orderNumber} (Migration Settle)`,
                    order._id.toString(),
                    comm._id.toString()
                );

                console.log(`Successfully settled ₹${netEarning.toFixed(2)} to Seller ${seller.storeName || seller.ownerName}`);
                migratedCount++;
            } else {
                console.log(`Order #${order.orderNumber} is not Delivered (Status: ${order.status}). Leaving commission as Pending.`);
            }
        }

        console.log(`Migration complete! Successfully migrated ${migratedCount} commissions.`);
    } catch (error) {
        console.error("Error running migration:", error);
    } finally {
        await mongoose.connection.close();
        console.log("DB connection closed.");
    }
}

migrate();
