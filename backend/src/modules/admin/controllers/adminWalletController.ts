import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Commission from '../../../models/Commission';
import WalletTransaction from '../../../models/WalletTransaction';
import WithdrawRequest from '../../../models/WithdrawRequest';
import PlatformWallet from '../../../models/PlatformWallet';
import Order from '../../../models/Order';
import { asyncHandler } from '../../../utils/asyncHandler';
import { approveWithdrawal, rejectWithdrawal, completeWithdrawal } from './adminWithdrawalController';
import { creditWallet, debitWallet } from '../../../services/walletManagementService';

/**
 * Get Financial Dashboard Stats
 */
export const getFinancialDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const wallet = await PlatformWallet.getWallet();
  const [sellerBalanceAgg, deliveryPendingAgg] = await Promise.all([
    mongoose.model('Seller').aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]),
    mongoose.model('Delivery').aggregate([
      { $group: { _id: null, total: { $sum: '$pendingAdminPayout' } } }
    ])
  ]);

  const sellerPendingPayoutsLive = sellerBalanceAgg[0]?.total || 0;
  const pendingFromDeliveryBoyLive = deliveryPendingAgg[0]?.total || 0;

  // We still calculate some things on the fly or just use wallet
  // It's better to use wallet for consistency with our new sync logic

  return res.status(200).json({
    success: true,
    data: {
      totalGMV: wallet.totalPlatformEarning,
      currentAccountBalance: wallet.currentPlatformBalance,
      totalAdminEarnings: wallet.totalAdminEarning,
      sellerPendingPayouts: sellerPendingPayoutsLive,
      deliveryPendingPayouts: wallet.deliveryBoyPendingPayouts,
      pendingFromDeliveryBoy: pendingFromDeliveryBoyLive,
      pendingWithdrawalsCount: await WithdrawRequest.countDocuments({ status: 'Pending' })
    }
  });
});

/**
 * Get Admin Earnings (Commissions List)
 */
export const getAdminEarnings = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;

  const match: any = {
    type: 'SELLER',
    status: { $ne: 'Cancelled' }
  };
  if (status) {
    match.status = status;
  }
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom as string);
    if (dateTo) match.createdAt.$lte = new Date(dateTo as string);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const aggregated = await Commission.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$order',
        sellerCommission: { $sum: '$commissionAmount' },
        statuses: { $addToSet: '$status' },
        lastCommissionAt: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: Order.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'order'
      }
    },
    { $unwind: '$order' },
    {
      $match: {
        'order.status': { $nin: ['Cancelled', 'Rejected', 'Returned'] }
      }
    },
    {
      $addFields: {
        platformFee: { $ifNull: ['$order.platformFee', 0] },
        tax: { $ifNull: ['$order.tax', 0] },
      }
    },
    {
      $addFields: {
        amount: { $add: ['$sellerCommission', '$platformFee', '$tax'] },
        status: {
          $cond: [{ $in: ['Pending', '$statuses'] }, 'Pending', 'Paid']
        }
      }
    },
    { $sort: { 'order.createdAt': -1 } },
    {
      $facet: {
        rows: [{ $skip: skip }, { $limit: Number(limit) }],
        totalCount: [{ $count: 'count' }]
      }
    }
  ]);

  const rows = aggregated[0]?.rows || [];
  const total = aggregated[0]?.totalCount?.[0]?.count || 0;

  const formattedEarnings = rows.map((r: any) => ({
    id: r._id,
    source: 'Order',
    sourceType: 'ORDER',
    amount: r.amount || 0,
    date: r.order?.createdAt || r.lastCommissionAt,
    status: r.status,
    description: `Order #${r.order?.orderNumber || 'Unknown'} (Fee: ₹${(r.platformFee || 0).toFixed(2)} + Tax: ₹${(r.tax || 0).toFixed(2)} + Seller Comm: ₹${(r.sellerCommission || 0).toFixed(2)})`,
    orderId: r.order?._id
  }));

  return res.status(200).json({
    success: true,
    data: formattedEarnings,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

/**
 * Get All Wallet Transactions (Sellers & Delivery Boys)
 */
/**
 * Get All Wallet Transactions (Sellers & Delivery Boys)
 */
export const getWalletTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, type, userType, userId, dateFrom, dateTo, search: _search } = req.query;

  const query: any = {};
  if (type) query.type = type;
  if (userType) query.userType = userType;
  if (userId) query.userId = userId;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
    if (dateTo) {
      const end = new Date(dateTo as string);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  // Search handling not fully implemented for cross-collection ref

  const skip = (Number(page) - 1) * Number(limit);

  // Fetch transactions without populate first, as refPath 'userType' values (SELLER/DELIVERY_BOY) 
  // do not match Model names (Seller/Delivery)
  const transactions = await WalletTransaction.find(query)
    .populate('relatedOrder', 'orderNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await WalletTransaction.countDocuments(query);

  // Manually populate user details
  const sellerIds: any[] = [];
  const deliveryIds: any[] = [];

  transactions.forEach(t => {
    if (t.userType === 'SELLER') sellerIds.push(t.userId);
    else if (t.userType === 'DELIVERY_BOY') deliveryIds.push(t.userId);
  });

  const [sellers, deliveryBoys] = await Promise.all([
    mongoose.model('Seller').find({ _id: { $in: sellerIds } }).select('storeName sellerName mobile email balance'),
    mongoose.model('Delivery').find({ _id: { $in: deliveryIds } }).select('name firstName lastName mobile email balance')
  ]);

  const sellerMap = new Map(sellers.map(s => [s._id.toString(), s]));
  const deliveryMap = new Map(deliveryBoys.map(d => [d._id.toString(), d]));

  // Format transactions
  const formattedTransactions = transactions.map((t: any) => {
    let userName = 'Unknown';
    let user: any = null;

    if (t.userType === 'SELLER') {
      user = sellerMap.get(t.userId.toString());
      if (user) {
        userName = user.storeName || user.sellerName;
      }
    } else if (t.userType === 'DELIVERY_BOY') {
      user = deliveryMap.get(t.userId.toString());
      if (user) {
        userName = user.name || (user.firstName ? user.firstName + (user.lastName ? ' ' + user.lastName : '') : 'Delivery Partner');
      }
    }

    return {
      _id: t._id,
      type: t.type,
      userType: t.userType,
      userName: userName,
      userId: user, // Return full user object or just ID based on frontend need, ensuring compatibility
      amount: t.amount,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
      reference: t.reference,
      relatedOrder: t.relatedOrder ? { orderNumber: t.relatedOrder.orderNumber } : undefined
    };
  });

  return res.status(200).json({
    success: true,
    data: formattedTransactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

/**
 * Process Withdrawal Wrapper (to match frontend service expectation)
 */
export const processWithdrawalWrapper = asyncHandler(async (req: Request, res: Response) => {
  const { requestId, action, remark, transactionReference } = req.body;

  if (!requestId || !action) {
    return res.status(400).json({
      success: false,
      message: 'Request ID and action are required'
    });
  }

  // Mock the params for the existing controllers
  req.params.id = requestId;

  if (action === 'Approve') {
    return approveWithdrawal(req, res);
  } else if (action === 'Reject') {
    req.body.remarks = remark; // Map 'remark' to 'remarks'
    return rejectWithdrawal(req, res);
  } else if (action === 'Complete') {
    if (!transactionReference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required for completion'
      });
    }
    req.body.transactionReference = transactionReference;
    return completeWithdrawal(req, res);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be "Approve", "Reject", or "Complete"'
    });
  }
});

/**
 * Create Manual Fund Transfer (Credit/Debit) for Sellers or Delivery Boys
 */
export const createManualFundTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { userId, userType, amount, type, description } = req.body;

  if (!userId || !userType || !amount || !type || !description) {
    return res.status(400).json({
      success: false,
      message: 'All fields (userId, userType, amount, type, description) are required'
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be greater than zero'
    });
  }

  if (!['SELLER', 'DELIVERY_BOY'].includes(userType)) {
    return res.status(400).json({
      success: false,
      message: 'userType must be SELLER or DELIVERY_BOY'
    });
  }

  if (!['Credit', 'Debit'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'type must be Credit or Debit'
    });
  }

  let result;
  if (type === 'Credit') {
    result = await creditWallet(userId, userType, amount, description);
  } else {
    result = await debitWallet(userId, userType, amount, description);
  }

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
});
