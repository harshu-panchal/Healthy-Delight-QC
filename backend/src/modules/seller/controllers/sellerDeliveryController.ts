import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Delivery from "../../../models/Delivery";
import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import DeliveryAssignment from "../../../models/DeliveryAssignment";
import { notifyRiderOfScheduledAssignment } from "../../../services/orderNotificationService";
import { sendPushNotification } from "../../../services/firebaseAdmin";

/**
 * Get available delivery boys for sellers
 */
export const getAvailableDeliveryBoys = asyncHandler(
  async (req: Request, res: Response) => {
    const { search } = req.query;

    const query: any = { status: "Active" };

    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { mobile: { $regex: search as string, $options: "i" } },
      ];
    }

    const rawDeliveryBoys = await Delivery.find(query)
      .select("name mobile status")
      .sort({ name: 1 });

    // Calculate busy/available status dynamically based on current active orders
    const deliveryBoys = await Promise.all(
      rawDeliveryBoys.map(async (boy) => {
        const activeOrdersCount = await Order.countDocuments({
          deliveryBoy: boy._id,
          status: { $nin: ["Delivered", "Cancelled", "Returned", "Rejected"] },
        });

        return {
          _id: boy._id,
          name: boy.name,
          mobile: boy.mobile,
          status: boy.status,
          available: activeOrdersCount > 0 ? "Busy" : "Available",
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Delivery boys fetched successfully",
      data: deliveryBoys,
    });
  }
);

/**
 * Assign delivery boy to order (Seller version)
 */
export const assignDeliveryBoy = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user.userId;
    const { id } = req.params; // orderId
    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy ID is required",
      });
    }

    // Verify this seller has items in this order
    const sellerItem = await OrderItem.findOne({ order: id, seller: sellerId });
    if (!sellerItem) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to assign a rider to this order",
      });
    }

    // Verify delivery boy exists and is active
    const deliveryBoy = await Delivery.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    if (deliveryBoy.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Delivery boy is not active",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order
    order.deliveryBoy = deliveryBoyId as any;
    order.deliveryBoyStatus = "Pending";
    order.assignedAt = new Date();
    
    const isScheduled = order.orderType === "Scheduled";
    if (isScheduled) {
      order.status = "Rider Assigned";
    }
    await order.save();

    // Create or update delivery assignment
    await DeliveryAssignment.findOneAndUpdate(
      { order: id },
      {
        order: id,
        deliveryBoy: deliveryBoyId,
        assignedAt: new Date(),
        assignedBy: sellerId,
        status: "Pending",
      },
      { upsert: true, new: true }
    );

    const io = (req.app as any).get("io");
    if (isScheduled) {
      // Notify rider of scheduled assignment (socket)
      if (io) {
        await notifyRiderOfScheduledAssignment(io, order, deliveryBoyId);
      }
    } else {
      const orderData = {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: {
          address: order.deliveryAddress?.address || "",
          city: order.deliveryAddress?.city || "",
          state: order.deliveryAddress?.state || "",
          pincode: order.deliveryAddress?.pincode || "",
          landmark: order.deliveryAddress?.landmark || "",
        },
        total: order.total,
        subtotal: order.subtotal,
        shipping: order.shipping || 0,
        createdAt: order.createdAt,
        type: "ASSIGNMENT_OFFER",
        paymentMethod: order.paymentMethod,
      };

      // Emit socket event to delivery boy
      if (io) {
        const roomName = `delivery-${deliveryBoyId.toString()}`;
        io.to(roomName).emit("new-order", orderData);
        console.log(`📤 Emitted new-order (assignment offer) to rider room: ${roomName}`);
      }

      // Send FCM Push Notification to the assigned rider for the delivery offer so they get alerted even if offline
      try {
        const riderPushTokens = new Set<string>();
        for (const t of deliveryBoy.fcmTokens || []) riderPushTokens.add(t);
        for (const t of deliveryBoy.fcmTokenMobile || []) riderPushTokens.add(t);
        const uniqueRiderTokens = Array.from(riderPushTokens);

        if (uniqueRiderTokens.length > 0) {
          await sendPushNotification(uniqueRiderTokens, {
            title: 'New Delivery Offer! 🛵',
            body: `You have been offered a new delivery job for order #${order.orderNumber} (₹${order.total.toFixed(2)}).`,
            data: {
              type: 'assignment_offer',
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              link: `/delivery/dashboard?orderId=${order._id.toString()}`
            }
          });
          console.log(`📲 Dispatched assignment-offer FCM Push Notification to Rider.`);
        }
      } catch (pushErr) {
        console.error('Failed to send assignment-offer FCM Push Notification to Rider:', pushErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Delivery rider assigned successfully",
      data: {
        id: order._id,
        deliveryBoyName: deliveryBoy.name,
        deliveryBoyPhone: deliveryBoy.mobile,
      },
    });
  }
);
