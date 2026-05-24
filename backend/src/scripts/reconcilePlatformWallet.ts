import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import PlatformWallet from "../models/PlatformWallet";
import Order from "../models/Order";
import CashCollection from "../models/CashCollection";
import Commission from "../models/Commission";
import WithdrawRequest from "../models/WithdrawRequest";
import Seller from "../models/Seller";
import Delivery from "../models/Delivery";

dotenv.config({ path: path.join(__dirname, "../../.env") });

interface ReconciledWalletValues {
  totalPlatformEarning: number;
  currentPlatformBalance: number;
  totalAdminEarning: number;
  pendingFromDeliveryBoy: number;
  sellerPendingPayouts: number;
  deliveryBoyPendingPayouts: number;
}

interface ReconcileComponents {
  paidOrdersTotalAllMethods: number;
  deliveredCodUnpaidOrderTotal: number;
  prepaidInflows: number;
  codCollections: number;
  completedWithdrawals: number;
  deliveredCODLiability: number;
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const hasApplyFlag = process.argv.includes("--apply");

const toCODRegex = /^cod$/i;

const sumPaidOrdersAllMethods = async (): Promise<number> => {
  const result = await Order.aggregate([
    {
      $match: {
        paymentStatus: "Paid",
        status: { $nin: ["Cancelled", "Rejected", "Returned"] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumDeliveredCODUnpaidOrderTotals = async (): Promise<number> => {
  const result = await Order.aggregate([
    {
      $match: {
        status: "Delivered",
        paymentMethod: { $regex: toCODRegex },
        paymentStatus: { $ne: "Paid" },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumDeliveredCODLiability = async (): Promise<number> => {
  const result = await Order.aggregate([
    {
      $match: {
        status: "Delivered",
        paymentMethod: { $regex: toCODRegex },
        deliveryBoy: { $exists: true, $ne: null },
      },
    },
    {
      $project: {
        liability: {
          $subtract: [
            "$total",
            {
              $add: [{ $ifNull: ["$shipping", 0] }, { $ifNull: ["$tipAmount", 0] }],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$liability" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumCODCollections = async (): Promise<number> => {
  const result = await CashCollection.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumPrepaidInflows = async (): Promise<number> => {
  const result = await Order.aggregate([
    {
      $match: {
        paymentStatus: "Paid",
        status: { $nin: ["Cancelled", "Rejected", "Returned"] },
        paymentMethod: { $not: toCODRegex },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumCompletedWithdrawals = async (): Promise<number> => {
  const result = await WithdrawRequest.aggregate([
    {
      $match: { status: "Completed" },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumSellerBalances = async (): Promise<number> => {
  const result = await Seller.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$balance" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumDeliveryBalances = async (): Promise<number> => {
  const result = await Delivery.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$balance" },
      },
    },
  ]);

  return round2(result[0]?.total ?? 0);
};

const sumAdminEarnings = async (): Promise<number> => {
  // Admin earnings = seller commissions + platform fees + tax + admin delivery share(no rider)
  // For consistency and idempotence, we recalculate from immutable records:
  // - Seller commission records (non-cancelled)
  // - Delivered orders' platformFee + tax
  // - Delivered orders without deliveryBoy keep shipping as admin delivery share
  const [sellerCommissionAgg, deliveredOrderAgg] = await Promise.all([
    Commission.aggregate([
      {
        $match: {
          type: "SELLER",
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$commissionAmount" },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          status: "Delivered",
          paymentStatus: { $in: ["Paid", "Pending"] },
          paymentMethod: { $in: ["COD", "cod", "CoD", "cOd", "Online", "UPI", "Card", "Razorpay", "Cashfree", "NetBanking", "Wallet"] },
        },
      },
      {
        $project: {
          platformFee: { $ifNull: ["$platformFee", 0] },
          tax: { $ifNull: ["$tax", 0] },
          adminDeliveryShare: {
            $cond: [{ $or: [{ $eq: ["$deliveryBoy", null] }, { $not: ["$deliveryBoy"] }] }, { $ifNull: ["$shipping", 0] }, 0],
          },
        },
      },
      {
        $group: {
          _id: null,
          platformFeeTotal: { $sum: "$platformFee" },
          taxTotal: { $sum: "$tax" },
          adminDeliveryShareTotal: { $sum: "$adminDeliveryShare" },
        },
      },
    ]),
  ]);

  const sellerCommission = sellerCommissionAgg[0]?.total ?? 0;
  const platformFeeTotal = deliveredOrderAgg[0]?.platformFeeTotal ?? 0;
  const taxTotal = deliveredOrderAgg[0]?.taxTotal ?? 0;
  const adminDeliveryShareTotal = deliveredOrderAgg[0]?.adminDeliveryShareTotal ?? 0;

  return round2(sellerCommission + platformFeeTotal + taxTotal + adminDeliveryShareTotal);
};

const computeWalletValues = async (): Promise<{ values: ReconciledWalletValues; components: ReconcileComponents }> => {
  const [
    paidOrdersTotalAllMethods,
    deliveredCodUnpaidOrderTotal,
    prepaidInflows,
    codCollections,
    completedWithdrawals,
    adminEarnings,
    deliveredCODLiability,
    sellerPendingPayouts,
    deliveryPendingPayouts,
  ] = await Promise.all([
    sumPaidOrdersAllMethods(),
    sumDeliveredCODUnpaidOrderTotals(),
    sumPrepaidInflows(),
    sumCODCollections(),
    sumCompletedWithdrawals(),
    sumAdminEarnings(),
    sumDeliveredCODLiability(),
    sumSellerBalances(),
    sumDeliveryBalances(),
  ]);

  // GMV-style total collected:
  // - all paid orders across methods
  // - plus delivered COD orders not marked paid yet (cash collected by rider but not settled)
  const totalPlatformEarning = round2(paidOrdersTotalAllMethods + deliveredCodUnpaidOrderTotal);
  // Available with platform:
  // total collected minus COD amount still with riders and completed withdrawal outflows
  const currentPlatformBalance = round2(totalPlatformEarning - Math.max(0, deliveredCODLiability - codCollections) - completedWithdrawals);
  const pendingFromDeliveryBoy = round2(Math.max(0, deliveredCODLiability - codCollections));

  return {
    values: {
      totalPlatformEarning,
      currentPlatformBalance,
      totalAdminEarning: adminEarnings,
      pendingFromDeliveryBoy,
      sellerPendingPayouts,
      deliveryBoyPendingPayouts: deliveryPendingPayouts,
    },
    components: {
      paidOrdersTotalAllMethods,
      deliveredCodUnpaidOrderTotal,
      prepaidInflows,
      codCollections,
      completedWithdrawals,
      deliveredCODLiability,
    },
  };
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const wallet = await PlatformWallet.getWallet();
  const { values: recomputed, components } = await computeWalletValues();

  const current: ReconciledWalletValues = {
    totalPlatformEarning: round2(wallet.totalPlatformEarning),
    currentPlatformBalance: round2(wallet.currentPlatformBalance),
    totalAdminEarning: round2(wallet.totalAdminEarning),
    pendingFromDeliveryBoy: round2(wallet.pendingFromDeliveryBoy),
    sellerPendingPayouts: round2(wallet.sellerPendingPayouts),
    deliveryBoyPendingPayouts: round2(wallet.deliveryBoyPendingPayouts),
  };

  const diff = {
    totalPlatformEarning: round2(recomputed.totalPlatformEarning - current.totalPlatformEarning),
    currentPlatformBalance: round2(recomputed.currentPlatformBalance - current.currentPlatformBalance),
    totalAdminEarning: round2(recomputed.totalAdminEarning - current.totalAdminEarning),
    pendingFromDeliveryBoy: round2(recomputed.pendingFromDeliveryBoy - current.pendingFromDeliveryBoy),
    sellerPendingPayouts: round2(recomputed.sellerPendingPayouts - current.sellerPendingPayouts),
    deliveryBoyPendingPayouts: round2(recomputed.deliveryBoyPendingPayouts - current.deliveryBoyPendingPayouts),
  };

  console.log(
    JSON.stringify(
      {
        mode: hasApplyFlag ? "apply" : "dry-run",
        codRule: "COD liability counted only when order.status = Delivered",
        totalPlatformEarningMode:
          "GMV-style = paid orders (all methods) + delivered COD unpaid order totals",
        currentPlatformBalanceMode:
          "totalPlatformEarning - pendingFromDeliveryBoy - completedWithdrawals",
        components,
        current,
        recomputed,
        diff,
      },
      null,
      2
    )
  );

  if (hasApplyFlag) {
    wallet.totalPlatformEarning = recomputed.totalPlatformEarning;
    wallet.currentPlatformBalance = recomputed.currentPlatformBalance;
    wallet.totalAdminEarning = recomputed.totalAdminEarning;
    wallet.pendingFromDeliveryBoy = recomputed.pendingFromDeliveryBoy;
    wallet.sellerPendingPayouts = recomputed.sellerPendingPayouts;
    wallet.deliveryBoyPendingPayouts = recomputed.deliveryBoyPendingPayouts;
    await wallet.save();
    console.log("PlatformWallet updated successfully.");
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("Reconciliation failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});
