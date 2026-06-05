import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Notification from "../../../models/Notification";
import Customer from "../../../models/Customer";
import Seller from "../../../models/Seller";
import Delivery from "../../../models/Delivery";
import Admin from "../../../models/Admin";
import { sendPushNotification } from "../../../services/firebaseAdmin";

const sendPushForNotification = async (notification: any) => {
  if (!notification) return { attempted: 0, successCount: 0, failureCount: 0 };

  const { recipientType, recipientId } = notification;
  const tokens = new Set<string>();

  // 1. Fetch Customer Tokens
  if (recipientType === "Customer" || recipientType === "All") {
    const query: any = {};
    if (recipientType === "Customer" && recipientId) {
      query._id = recipientId;
    }
    const customers = await Customer.find(query).select("fcmTokens fcmTokenMobile");
    for (const c of customers) {
      for (const t of c.fcmTokens || []) tokens.add(t);
      for (const t of c.fcmTokenMobile || []) tokens.add(t);
    }
  }

  // 2. Fetch Seller Tokens
  if (recipientType === "Seller" || recipientType === "All") {
    const query: any = {};
    if (recipientType === "Seller" && recipientId) {
      query._id = recipientId;
    }
    const sellers = await Seller.find(query).select("fcmTokens fcmTokenMobile");
    for (const s of sellers) {
      for (const t of s.fcmTokens || []) tokens.add(t);
      for (const t of s.fcmTokenMobile || []) tokens.add(t);
    }
  }

  // 3. Fetch Delivery Tokens
  if (recipientType === "Delivery" || recipientType === "All") {
    const query: any = {};
    if (recipientType === "Delivery" && recipientId) {
      query._id = recipientId;
    }
    const deliveries = await Delivery.find(query).select("fcmTokens fcmTokenMobile");
    for (const d of deliveries) {
      for (const t of d.fcmTokens || []) tokens.add(t);
      for (const t of d.fcmTokenMobile || []) tokens.add(t);
    }
  }

  // 4. Fetch Admin Tokens
  if (recipientType === "Admin" || recipientType === "All") {
    const query: any = {};
    if (recipientType === "Admin" && recipientId) {
      query._id = recipientId;
    }
    const admins = await Admin.find(query).select("fcmTokens fcmTokenMobile");
    for (const a of admins) {
      for (const t of a.fcmTokens || []) tokens.add(t);
      for (const t of a.fcmTokenMobile || []) tokens.add(t);
    }
  }

  const allTokens = Array.from(tokens);
  if (allTokens.length === 0) {
    return { attempted: 0, successCount: 0, failureCount: 0 };
  }

  const response: any = await sendPushNotification(allTokens, {
    title: notification.title,
    body: notification.message,
    data: {
      type: "admin_notification",
      notificationId: String(notification._id),
      recipientType: String(notification.recipientType),
      createdAt: notification.createdAt
        ? new Date(notification.createdAt).toISOString()
        : new Date().toISOString(),
    },
  });

  return {
    attempted: allTokens.length,
    successCount: response?.successCount ?? 0,
    failureCount: response?.failureCount ?? 0,
  };
};

/**
 * Create a new notification
 */
export const createNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      recipientType,
      recipientId,
      title,
      message,
      type,
      link,
      actionLabel,
      priority,
      expiresAt,
    } = req.body;

    if (!recipientType || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Recipient type, title, and message are required",
      });
    }

    const notification = await Notification.create({
      recipientType,
      recipientId,
      title,
      message,
      type: type || "Info",
      link,
      actionLabel,
      priority: priority || "Medium",
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: req.user?.userId,
      isRead: false,
    });

    const pushResult = await sendPushForNotification(notification);
    notification.sentAt = new Date();
    await notification.save();

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification,
      push: pushResult,
    });
  }
);

/**
 * Get all notifications
 */
export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      recipientType,
      recipientId,
      isRead,
      type,
      priority,
    } = req.query;

    const query: any = {};

    if (recipientType) query.recipientType = recipientType;
    if (recipientId) query.recipientId = recipientId;
    if (isRead !== undefined) query.isRead = isRead === "true";
    if (type) query.type = type;
    if (priority) query.priority = priority;

    // Filter expired notifications
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: new Date() } },
    ];

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("createdBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
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
 * Get notification by ID
 */
export const getNotificationById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const notification = await Notification.findById(id).populate(
      "createdBy",
      "firstName lastName"
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification fetched successfully",
      data: notification,
    });
  }
);

/**
 * Mark notification as read
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    {
      isRead: true,
      readAt: new Date(),
    },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});

/**
 * Update notification
 */
export const updateNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const notification = await Notification.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: notification,
    });
  }
);

/**
 * Send notification (Push to users)
 * This is a placeholder for actual push notification logic (Firebase/Socket.io)
 * For now, just mark it as sent.
 */
export const sendNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const pushResult = await sendPushForNotification(notification);

    notification.sentAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
      push: pushResult,
    });
  }
);

/**
 * Mark multiple notifications as read
 */
export const markMultipleAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Notification IDs array is required",
      });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: {
        modified: result.modifiedCount,
      },
    });
  }
);

/**
 * Delete notification
 */
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  }
);
