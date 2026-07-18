import { Request, Response } from "express";
import Order from "../../../models/Order";
import Product from "../../../models/Product";
// import Category from "../../../models/Category";
// import Category from "../../../models/Category";
import OrderItem from "../../../models/OrderItem";
import { asyncHandler } from "../../../utils/asyncHandler";
import mongoose from "mongoose";

/**
 * Get seller's dashboard statistics
 */
export const getDashboardStats = asyncHandler(
    async (req: Request, res: Response) => {
        const sellerId = new mongoose.Types.ObjectId((req as any).user.userId);

        // Find orders associated with this seller
        // Since Order model doesn't have sellerId, we find orders via OrderItem
        const sellerOrderItems = await OrderItem.find({ seller: sellerId }).select('order');
        const sellerOrderIds = [...new Set(sellerOrderItems.map(item => item.order.toString()))];

        // 1. KPI Metrics
        const [
            totalOrders,
            completedOrders,
            pendingOrders,
            cancelledOrders,
            totalProduct,
            totalCategoryCount,
            totalSubcategoryCount,
            totalCustomerCount,
        ] = await Promise.all([
            Order.countDocuments({ _id: { $in: sellerOrderIds } }),
            Order.countDocuments({ _id: { $in: sellerOrderIds }, status: "Delivered" }),
            Order.countDocuments({ _id: { $in: sellerOrderIds }, status: "Pending" }),
            Order.countDocuments({ _id: { $in: sellerOrderIds }, status: "Cancelled" }),
            Product.countDocuments({ seller: sellerId }), // Note: Product model uses 'seller' (ref) or 'sellerId'? Checking schema... Product.ts usually uses 'seller' as ref. Checking prev file... Product.countDocuments({ sellerId }) was used. Let's verify Product model.
            Product.distinct("category", { seller: sellerId }).then(ids => ids.length),
            Product.distinct("subcategory", { seller: sellerId }).then(ids => ids.length),
            Order.distinct("customer", { _id: { $in: sellerOrderIds } }).then(ids => ids.length),
        ]);

        // 2. Alert Metrics (Low Stock < 5)
        // Check Product model usage
        const products = await Product.find({ seller: sellerId });
        let soldOutProducts = 0;
        let lowStockProducts = 0;

        products.forEach(product => {
            let isSoldOut = true;
            let isLowStock = false;

            if (product.variations && product.variations.length > 0) {
                product.variations.forEach(v => {
                    if ((v.stock || 0) > 0) isSoldOut = false;
                    if ((v.stock || 0) > 0 && (v.stock || 0) < 5) isLowStock = true;
                    if (v.stock && v.stock > 0) isSoldOut = false;
                    if (v.stock && v.stock > 0 && v.stock < 5) isLowStock = true;
                });
            } else {
                // Handle products without variations (fallback)
                if (product.stock > 0) isSoldOut = false;
                if (product.stock > 0 && product.stock < 5) isLowStock = true;
            }

            if (isSoldOut) soldOutProducts++;
            else if (isLowStock) lowStockProducts++;
        });

        // 3. New Orders Table (Latest 10)
        const newOrders = await Order.find({ _id: { $in: sellerOrderIds } })
            .sort({ createdAt: -1 })
            .limit(10);

        // Find all order items from this seller for these new orders
        const dashboardSellerItems = await OrderItem.find({
            order: { $in: newOrders.map(o => o._id) },
            seller: sellerId
        });

        // Create a map of orderId -> sum(item.total)
        const dashboardAmountMap: Record<string, number> = {};
        dashboardSellerItems.forEach(item => {
            const orderIdStr = item.order.toString();
            dashboardAmountMap[orderIdStr] = (dashboardAmountMap[orderIdStr] || 0) + (item.total || 0);
        });

        const formattedNewOrders = newOrders.map(order => ({
            id: order._id.toString(),
            orderId: order.orderNumber || order._id.toString(),
            orderDate: new Date(order.orderDate).toLocaleDateString('en-GB'),
            status: order.status === 'Out for Delivery' ? 'Out For Delivery' : order.status,
            amount: dashboardAmountMap[order._id.toString()] || 0,
        }));

        // 4. Chart Data (Last 12 months)
        const currentYear = new Date().getFullYear();
        const monthlyStats = await Order.aggregate([
            {
                $match: {
                    _id: { $in: sellerOrderIds.map(id => new mongoose.Types.ObjectId(id)) },
                    orderDate: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$orderDate" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const yearlyOrderData = months.map((month, index) => {
            const monthStat = monthlyStats.find(s => s._id === index + 1);
            return { date: month, value: monthStat ? monthStat.count : 0 };
        });

        // 5. Daily Chart Data (Current Month)
        const currentMonth = new Date().getMonth();
        const dailyStats = await Order.aggregate([
            {
                $match: {
                    _id: { $in: sellerOrderIds.map(id => new mongoose.Types.ObjectId(id)) },
                    orderDate: {
                        $gte: new Date(currentYear, currentMonth, 1),
                        $lte: new Date(currentYear, currentMonth + 1, 0)
                    }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$orderDate" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailyOrderData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayStat = dailyStats.find(s => s._id === day);
            return { date: day.toString(), value: dayStat ? dayStat.count : 0 };
        });

        // 6. Wholesale B2B Metrics
        const wholesaleStats = await OrderItem.aggregate([
            { $match: { seller: sellerId } },
            {
                $lookup: {
                    from: "orders",
                    localField: "order",
                    foreignField: "_id",
                    as: "orderInfo"
                }
            },
            { $unwind: "$orderInfo" },
            { $match: { "orderInfo.orderType": "Wholesale" } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    orderCount: { $addToSet: "$order" }
                }
            }
        ]);
        const wholesaleRevenue = wholesaleStats[0]?.totalRevenue || 0;
        const wholesaleOrders = wholesaleStats[0]?.orderCount?.length || 0;

        let wholesaleStock = 0;
        let lowWholesaleStock = 0;
        
        products.forEach(product => {
            if (product.wholesale?.enabled) {
                const stockVal = product.wholesale.stock || 0;
                wholesaleStock += stockVal;
                if (stockVal <= 10) {
                    lowWholesaleStock++;
                }
            }
        });

        const bestSellingWholesale = await OrderItem.aggregate([
            { $match: { seller: sellerId } },
            {
                $lookup: {
                    from: "orders",
                    localField: "order",
                    foreignField: "_id",
                    as: "orderInfo"
                }
            },
            { $unwind: "$orderInfo" },
            { $match: { "orderInfo.orderType": "Wholesale", "orderInfo.status": { $ne: "Cancelled" } } },
            {
                $group: {
                    _id: "$productName",
                    quantity: { $sum: "$quantity" },
                    revenue: { $sum: "$total" }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
            {
                $project: {
                    name: "$_id",
                    quantity: 1,
                    revenue: 1,
                    _id: 0
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            data: {
                stats: {
                    totalUser: totalCustomerCount,
                    totalCategory: totalCategoryCount,
                    totalSubcategory: totalSubcategoryCount,
                    totalProduct,
                    totalOrders,
                    completedOrders,
                    pendingOrders,
                    cancelledOrders,
                    soldOutProducts,
                    lowStockProducts,
                    yearlyOrderData,
                    dailyOrderData,
                    wholesaleOrders,
                    wholesaleRevenue,
                    wholesaleStock,
                    lowWholesaleStock,
                    bestSellingWholesale
                },
                newOrders: formattedNewOrders
            }
        });
    }
);
