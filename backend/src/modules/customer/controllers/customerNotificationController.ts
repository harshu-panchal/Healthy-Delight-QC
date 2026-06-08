import { Request, Response } from "express";
import Notification from "../../../models/Notification";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Get notifications for the logged-in customer
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.userId;

  const notifications = await Notification.find({
    $or: [
      {
        recipientType: "Customer",
        $or: [
          { recipientId: customerId },
          { recipientId: null } // Broadcasts to all customers
        ]
      },
      {
        recipientType: "All" // Global broadcasts
      }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(50); // Limit to last 50 notifications

  return res.status(200).json({
    success: true,
    message: "Notifications fetched successfully",
    data: notifications,
  });
});

/**
 * Mark notification as read
 */
export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const customerId = req.user?.userId;

  const notification = await Notification.findById(id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Ensure this notification is for this customer or is a broadcast
  const isTargetedToCustomer = notification.recipientType === "Customer" &&
    (!notification.recipientId || notification.recipientId.toString() === customerId);
  const isBroadcastToAll = notification.recipientType === "All";

  if (!isTargetedToCustomer && !isBroadcastToAll) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});
