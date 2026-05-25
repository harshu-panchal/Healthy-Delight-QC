import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Customer from "../../../models/Customer";
import Order from "../../../models/Order";
import CustomerWalletTransaction from "../../../models/CustomerWalletTransaction";
import mongoose from "mongoose";

/**
 * Get all customers with filters
 */
export const getAllCustomers = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = "registrationDate",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { email: { $regex: search as string, $options: "i" } },
        { phone: { $regex: search as string, $options: "i" } },
        { refCode: { $regex: search as string, $options: "i" } },
      ];
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Customer.countDocuments(query),
    ]);

    const customerIds = customers.map((c) => c._id);
    const orderAggregates = await Order.aggregate([
      { $match: { customer: { $in: customerIds }, status: { $ne: "Cancelled" } } },
      {
        $group: {
          _id: "$customer",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
    ]);

    const aggregateMap = new Map<string, { totalOrders: number; totalSpent: number }>();
    orderAggregates.forEach((agg) => {
      aggregateMap.set(agg._id.toString(), {
        totalOrders: agg.totalOrders,
        totalSpent: agg.totalSpent,
      });
    });

    const enrichedCustomers = customers.map((customer) => {
      const agg = aggregateMap.get(customer._id.toString()) || { totalOrders: 0, totalSpent: 0 };
      const customerObj = customer.toObject();
      customerObj.totalOrders = agg.totalOrders;
      customerObj.totalSpent = agg.totalSpent;
      return customerObj;
    });

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: enrichedCustomers,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Get customer by ID
 */
export const getCustomerById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const orderAggregates = await Order.aggregate([
      { $match: { customer: customer._id, status: { $ne: "Cancelled" } } },
      {
        $group: {
          _id: "$customer",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
    ]);

    const agg = orderAggregates[0] || { totalOrders: 0, totalSpent: 0 };
    const customerObj = customer.toObject();
    customerObj.totalOrders = agg.totalOrders;
    customerObj.totalSpent = agg.totalSpent;

    return res.status(200).json({
      success: true,
      message: "Customer fetched successfully",
      data: customerObj,
    });
  }
);

/**
 * Update customer status
 */
export const updateCustomerStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive",
      });
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer status updated successfully",
      data: customer,
    });
  }
);

/**
 * Get customer orders
 */
export const getCustomerOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query: any = { customer: id };
    if (status) query.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("items")
        .populate("deliveryBoy", "name mobile")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Customer orders fetched successfully",
      data: orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Credit Customer Wallet manually by Admin
 */
export const creditCustomerWallet = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, remark } = req.body;

    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount. Must be a positive number.",
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const balanceBefore = customer.walletAmount;

    // Atomically increment customer's wallet balance
    const updatedCust = await Customer.findOneAndUpdate(
      { _id: id },
      { $inc: { walletAmount: creditAmount } },
      { new: true }
    );

    if (!updatedCust) {
      return res.status(500).json({
        success: false,
        message: "Failed to credit customer wallet.",
      });
    }

    // Create CustomerWalletTransaction credit record
    const creditTransaction = new CustomerWalletTransaction({
      customerId: customer._id,
      type: 'Credit',
      source: 'Manual',
      amount: creditAmount,
      balanceBefore: Number(balanceBefore.toFixed(2)),
      balanceAfter: Number(updatedCust.walletAmount.toFixed(2)),
      remark: remark || "Manual credit by Admin",
    });

    await creditTransaction.save();

    return res.status(200).json({
      success: true,
      message: `Successfully credited ₹${creditAmount} to customer's wallet.`,
      data: {
        customer: updatedCust,
        transaction: creditTransaction,
      },
    });
  }
);


