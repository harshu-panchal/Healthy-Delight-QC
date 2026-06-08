import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";
import Order from "../../../models/Order";
import DeliveryTracking from "../../../models/DeliveryTracking";
import DeliveryAssignment from "../../../models/DeliveryAssignment";
import CashCollection from "../../../models/CashCollection";
import WalletTransaction from "../../../models/WalletTransaction";
import WithdrawRequest from "../../../models/WithdrawRequest";
import Commission from "../../../models/Commission";
import Notification from "../../../models/Notification";

/**
 * Update Delivery Profile
 * Updates personal and vehicle information
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const {
        name,
        email,
        address,
        city,
        vehicleNumber,
        vehicleType,
        bankName,
        accountNumber,
        ifscCode
    } = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Update fields if provided
    if (name) delivery.name = name;
    if (email) delivery.email = email;
    if (address) delivery.address = address;
    if (city) delivery.city = city;
    if (vehicleNumber) delivery.vehicleNumber = vehicleNumber;
    if (vehicleType) delivery.vehicleType = vehicleType;

    // Bank details updates
    if (bankName) delivery.bankName = bankName;
    if (accountNumber) delivery.accountNumber = accountNumber;
    if (ifscCode) delivery.ifscCode = ifscCode;

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: delivery
    });
});

/**
 * Update Availability Status
 * Toggles isOnline status
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: "isOnline status must be a boolean"
        });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    if (delivery.status !== 'Active' && isOnline) {
        return res.status(403).json({
            success: false,
            message: "Your application is under review. You cannot go online until approved."
        });
    }

    delivery.isOnline = isOnline;
    await delivery.save();

    return res.status(200).json({
        success: true,
        message: `Status updated to ${isOnline ? 'Online' : 'Offline'}`,
        data: {
            isOnline: delivery.isOnline
        }
    });
});

/**
 * Update Delivery Settings
 * Updates notification, location, sound preferences
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;
    const { notifications, location, sound } = req.body;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Initialize settings if not present
    if (!delivery.settings) {
        delivery.settings = {
            notifications: true,
            location: true,
            sound: true
        };
    }

    if (typeof notifications === 'boolean') delivery.settings.notifications = notifications;
    if (typeof location === 'boolean') delivery.settings.location = location;
    if (typeof sound === 'boolean') delivery.settings.sound = sound;

    await delivery.save();

    return res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: delivery.settings
    });
});

/**
 * Delete Delivery Rider Account
 * Permanently removes personal data, deletes location and notifications logs,
 * anonymizes withdrawal account details, and deletes the delivery profile document.
 * Retains transactional and commission history for compliance and auditing.
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.user?.userId;

    if (!deliveryId || (req as any).user?.userType !== "Delivery") {
        return res.status(401).json({
            success: false,
            message: "Unauthorized or not a delivery partner"
        });
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            success: false,
            message: "Delivery partner not found"
        });
    }

    // Check for active assignments
    // Active assignment: Order assigned to this rider with a status that is not completed
    const activeOrder = await Order.findOne({
        deliveryBoy: deliveryId,
        status: { $nin: ["Delivered", "Cancelled", "Rejected", "Returned"] }
    });

    if (activeOrder) {
        return res.status(400).json({
            success: false,
            message: "You cannot delete your account while you have active delivery assignments."
        });
    }

    // 1. Delete personal tracking logs
    await DeliveryTracking.deleteMany({ deliveryBoy: deliveryId });

    // 2. Delete operational assignment logs
    await DeliveryAssignment.deleteMany({ deliveryBoy: deliveryId });

    // 3. Delete personal notifications
    await Notification.deleteMany({ recipientType: "Delivery", recipientId: deliveryId });

    // 4. Anonymize withdraw requests (removing bank accounts / UPI addresses but preserving auditing amounts/statuses)
    await WithdrawRequest.updateMany(
        { userId: deliveryId, userType: "DELIVERY_BOY" },
        { $set: { accountDetails: "Anonymized (Account Deleted)" } }
    );

    // 5. Delete the Delivery Rider profile completely (removes name, email, phone, documents, vehicle info, bank account, etc.)
    await Delivery.findByIdAndDelete(deliveryId);

    return res.status(200).json({
        success: true,
        message: "Your account and personal data have been deleted successfully."
    });
});

