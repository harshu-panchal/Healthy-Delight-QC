import { Request, Response } from 'express';
import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan';
import UserSubscription from '../models/UserSubscription';
import SubscriptionDelivery from '../models/SubscriptionDelivery';
import Customer from '../models/Customer';
import Seller from '../models/Seller';
import Payment from '../models/Payment';
import Commission from '../models/Commission';
import { findNearestServiceableSeller } from '../utils/locationHelper';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/paymentService';
import { sendNotification } from '../services/notificationService';
import { sendPushNotification } from '../services/firebaseAdmin';

/**
 * Public: Get active subscription plans
 */
export const getActiveSubscriptionPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ durationInDays: 1 });
    res.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message,
    });
  }
};

/**
 * Customer: Initiate subscription purchase (creates Razorpay order)
 */
export const purchaseSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId, deliverySlot } = req.body;

    if (!planId || !deliverySlot) {
      res.status(400).json({
        success: false,
        message: 'planId and deliverySlot are required',
      });
      return;
    }

    if (!['morning', 'evening'].includes(deliverySlot.toLowerCase())) {
      res.status(400).json({
        success: false,
        message: "deliverySlot must be either 'morning' or 'evening'",
      });
      return;
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found or inactive',
      });
      return;
    }

    const customerId = req.user?.userId;
    const customer = await Customer.findById(customerId);
    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer profile not found',
      });
      return;
    }

    const sellerId = await findNearestServiceableSeller(customer.latitude, customer.longitude);
    if (!sellerId) {
      res.status(400).json({
        success: false,
        message: 'No serviceable seller found for your location',
      });
      return;
    }

    const receipt = `sub_${Date.now()}_${customerId?.toString().substring(18)}`;
    const razorpayResult = await createRazorpayOrder(receipt, plan.price, 'INR');

    if (!razorpayResult.success || !razorpayResult.data) {
      res.status(500).json({
        success: false,
        message: razorpayResult.message || 'Failed to create Razorpay order',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayResult.data.razorpayOrderId,
        razorpayKey: razorpayResult.data.razorpayKey,
        amount: razorpayResult.data.amount,
        currency: razorpayResult.data.currency,
        planId: plan._id,
        deliverySlot: deliverySlot.toLowerCase(),
        sellerId,
      },
    });
  } catch (error: any) {
    console.error('Error purchasing subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate subscription purchase',
    });
  }
};

/**
 * Customer: Verify payment and activate subscription
 */
export const verifySubscriptionPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, deliverySlot } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId || !deliverySlot) {
      res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters',
      });
      return;
    }

    const isValidSignature = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValidSignature) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature verification failed',
      });
      return;
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Subscription plan not found' });
      return;
    }

    const customerId = req.user?.userId;
    const customer = await Customer.findById(customerId);
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const sellerId = await findNearestServiceableSeller(customer.latitude, customer.longitude);
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      res.status(404).json({ success: false, message: 'Seller not found for assignment' });
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    const payment = await Payment.create({
      customer: customer._id,
      order: new mongoose.Types.ObjectId(),
      amount: plan.price,
      currency: 'INR',
      paymentMethod: 'Online',
      paymentGateway: 'Razorpay',
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'Completed',
      paidAt: new Date(),
    });

    const subscription = await UserSubscription.create({
      customer: customer._id,
      plan: plan._id,
      seller: seller._id,
      deliverySlot: deliverySlot.toLowerCase(),
      bottlesPerDay: plan.bottlesPerDay,
      unit: plan.unit || 'Litre',
      startDate,
      endDate,
      freeDaysTotal: plan.freeDays || 0,
      freeDaysUsed: 0,
      status: 'active',
      maxPauseDaysAllowed: Math.floor(plan.durationInDays * 0.25),
      totalPauseDaysUsed: 0,
      currentPauseStartDate: null,
      deliveryAddress: {
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        latitude: customer.latitude,
        longitude: customer.longitude,
      },
      price: plan.price,
      commissionRateSnapshot: seller.subscriptionCommissionRate || 0,
      payment: payment._id,
    });

    const commissionRate = seller.subscriptionCommissionRate || 0;
    const commissionAmount = (plan.price * commissionRate) / 100;
    await Commission.create({
      subscription: subscription._id,
      seller: seller._id,
      type: 'SUBSCRIPTION_SELLER',
      orderAmount: plan.price,
      commissionRate,
      commissionAmount,
      status: 'Pending',
    });

    // Send notifications to Customer and Seller
    try {
      await sendNotification(
        'Customer',
        customer._id.toString(),
        'Subscription Active!',
        `Your ${plan.name} milk subscription is now active!`,
        { type: 'Success' }
      );
      // Persistent DB notification record for Seller history
      await sendNotification(
        'Seller',
        seller._id.toString(),
        'New Subscription Assigned',
        `New subscription assigned: ${customer.name}, ${plan.bottlesPerDay} ${plan.unit || 'Litre'}/day (${deliverySlot})`,
        { type: 'Info' }
      );

      // Real-time Socket.io + FCM Push notification for Seller UI popup alert
      const io = req.app.get('io');
      const sellerIdStr = seller._id.toString();
      const timeSlotText = deliverySlot.toLowerCase() === 'morning' ? 'Morning (6:00 AM - 9:00 AM)' : 'Evening (6:00 PM - 9:00 PM)';

      if (io) {
        io.to(`seller-${sellerIdStr}`).emit('seller-notification', {
          type: 'NEW_SCHEDULED_ORDER',
          orderId: subscription._id.toString(),
          orderNumber: `SUB-${subscription._id.toString().slice(-6).toUpperCase()}`,
          status: 'active',
          paymentStatus: 'Paid',
          paymentMethod: 'Online',
          customer: {
            name: customer.name || 'Customer',
            email: customer.email || '',
            phone: customer.phone || '',
            address: {
              address: customer.address || '',
              city: customer.city || '',
              state: customer.state || '',
              pincode: customer.pincode || '',
            },
          },
          items: [
            {
              productName: `${plan.name} (${plan.bottlesPerDay} ${plan.unit || 'Litre'}/day)`,
              quantity: plan.bottlesPerDay,
              price: plan.price,
              total: plan.price,
              variation: `Slot: ${deliverySlot}`,
            },
          ],
          totalAmount: plan.price,
          timestamp: new Date(),
          orderType: 'Scheduled',
          timeSlot: timeSlotText,
          scheduledTimeSlot: deliverySlot,
        });
        console.log(`📤 Emitted real-time subscription notification to seller-${sellerIdStr}`);
      }

      // FCM Push Notification for Seller
      try {
        const sellerObj = await Seller.findById(seller._id).select('fcmTokens fcmTokenMobile');
        if (sellerObj) {
          const pushTokens = new Set<string>();
          for (const t of sellerObj.fcmTokens || []) pushTokens.add(t);
          for (const t of sellerObj.fcmTokenMobile || []) pushTokens.add(t);
          const uniquePushTokens = Array.from(pushTokens);

          if (uniquePushTokens.length > 0) {
            await sendPushNotification(uniquePushTokens, {
              title: 'New Subscription Assigned! 🥛',
              body: `New milk subscription assigned: ${customer.name}, ${plan.bottlesPerDay} ${plan.unit || 'Litre'}/day (${deliverySlot}).`,
              data: {
                type: 'new_scheduled_order',
                subscriptionId: subscription._id.toString(),
                link: `/seller/subscription-deliveries`,
              },
            });
            console.log(`📲 Dispatched seller FCM push for subscription to ${uniquePushTokens.length} device(s)`);
          }
        }
      } catch (pushErr) {
        console.error('Error sending seller push notification:', pushErr);
      }
    } catch (notifErr) {
      console.error('Error sending subscription purchase notifications:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Subscription purchased and activated successfully',
      data: subscription,
    });
  } catch (error: any) {
    console.error('Error verifying subscription payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Subscription payment verification failed',
    });
  }
};

/**
 * Customer: Get current active subscription
 */
export const getMySubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.userId;
    const subscription = await UserSubscription.findOne({
      customer: customerId,
      status: 'active',
    })
      .populate('plan')
      .populate('seller', 'storeName phone address logo latitude longitude sellerName');

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    console.error('Error fetching customer subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active subscription',
      error: error.message,
    });
  }
};

/**
 * Seller: Get assigned subscriptions for logged-in seller
 */
export const getSellerSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;
    const subscriptions = await UserSubscription.find({ seller: sellerId })
      .populate('customer', 'name phone address city pincode deliveryOtp')
      .populate('plan', 'name bottlesPerDay unit durationInDays')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    console.error('Error fetching seller subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller subscriptions',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all subscription plans (active + inactive)
 */
export const getAllSubscriptionPlansAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error('Error fetching admin subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message,
    });
  }
};

/**
 * Admin: Create a new subscription plan
 */
export const createSubscriptionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, durationInDays, price, freeDays, bottlesPerDay, unit, description, isActive } = req.body;

    const plan = await SubscriptionPlan.create({
      name,
      code: code || ('PLAN_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      durationInDays,
      price,
      freeDays: freeDays || 0,
      bottlesPerDay,
      unit: unit || 'Litre',
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan,
    });
  } catch (error: any) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription plan',
    });
  }
};

/**
 * Admin: Update subscription plan by ID
 */
export const updateSubscriptionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      res.status(404).json({ success: false, message: 'Subscription plan not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: plan,
    });
  } catch (error: any) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update subscription plan',
    });
  }
};

/**
 * Admin: Soft delete (deactivate) subscription plan
 */
export const deleteSubscriptionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!plan) {
      res.status(404).json({ success: false, message: 'Subscription plan not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Subscription plan deactivated successfully',
      data: plan,
    });
  } catch (error: any) {
    console.error('Error deactivating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to deactivate subscription plan',
    });
  }
};

/**
 * Admin: List all user subscriptions across system with filters
 */
export const getAllSubscriptionsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, seller, plan } = req.query;
    const filterQuery: any = {};

    if (status) filterQuery.status = status;
    if (seller) filterQuery.seller = seller;
    if (plan) filterQuery.plan = plan;

    const subscriptions = await UserSubscription.find(filterQuery)
      .populate('customer', 'name phone email')
      .populate('seller', 'storeName sellerName mobile')
      .populate('plan', 'name durationInDays price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    console.error('Error fetching admin subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message,
    });
  }
};

/**
 * Admin: Edit user subscription (status, deliverySlot, endDate)
 */
export const updateSubscriptionByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, deliverySlot, endDate } = req.body;
    const updateFields: any = {};

    if (status) updateFields.status = status;
    if (deliverySlot) updateFields.deliverySlot = deliverySlot;
    if (endDate) updateFields.endDate = new Date(endDate);

    const subscription = await UserSubscription.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!subscription) {
      res.status(404).json({ success: false, message: 'User subscription not found' });
      return;
    }

    res.json({
      success: true,
      message: 'User subscription updated successfully',
      data: subscription,
    });
  } catch (error: any) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user subscription',
    });
  }
};

/**
 * Admin: Update seller subscription commission rate
 */
export const updateSellerSubscriptionCommission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionCommissionRate } = req.body;

    if (subscriptionCommissionRate === undefined || subscriptionCommissionRate < 0 || subscriptionCommissionRate > 100) {
      res.status(400).json({
        success: false,
        message: 'subscriptionCommissionRate must be a number between 0 and 100',
      });
      return;
    }

    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { subscriptionCommissionRate },
      { new: true }
    );

    if (!seller) {
      res.status(404).json({ success: false, message: 'Seller not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Seller subscription commission rate updated successfully',
      data: seller,
    });
  } catch (error: any) {
    console.error('Error updating seller subscription commission rate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update seller subscription commission rate',
    });
  }
};

/**
 * Customer: Pause active subscription (PATCH /api/v1/subscriptions/pause)
 */
export const pauseSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.userId;
    const subscription = await UserSubscription.findOne({
      customer: customerId,
      status: 'active',
    });

    if (!subscription) {
      res.status(400).json({
        success: false,
        message: 'No active subscription found to pause',
      });
      return;
    }

    // Check pause-limit
    const maxAllowed = subscription.maxPauseDaysAllowed || 0;
    const used = subscription.totalPauseDaysUsed || 0;
    if (used >= maxAllowed) {
      res.status(400).json({
        success: false,
        message: `Pause limit reached for this subscription. You've used ${used} of ${maxAllowed} allowed pause days.`,
      });
      return;
    }

    subscription.status = 'paused';
    subscription.currentPauseStartDate = new Date();
    await subscription.save();

    // Trigger notifications
    try {
      await sendNotification(
        'Customer',
        customerId!.toString(),
        'Subscription Paused',
        `Your milk subscription has been paused. You have ${maxAllowed - used} pause days remaining.`,
        { type: 'Warning' }
      );
      if (subscription.seller) {
        await sendNotification(
          'Seller',
          subscription.seller.toString(),
          'Subscription Paused',
          'A customer subscription assigned to your store has been paused.',
          { type: 'Info' }
        );
      }
    } catch (notifErr) {
      console.error('Error sending pause notifications:', notifErr);
    }

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      data: subscription,
    });
  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to pause subscription',
    });
  }
};

/**
 * Customer: Resume paused subscription (PATCH /api/v1/subscriptions/resume)
 * Extends endDate by the number of days paused, capped by remaining pause-day allowance.
 */
export const resumeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.userId;
    const subscription = await UserSubscription.findOne({
      customer: customerId,
      status: 'paused',
    });

    if (!subscription) {
      res.status(400).json({
        success: false,
        message: 'No paused subscription found to resume',
      });
      return;
    }

    // Calculate raw pause duration using currentPauseStartDate (falls back to updatedAt for legacy records)
    const pauseStart = subscription.currentPauseStartDate
      ? new Date(subscription.currentPauseStartDate)
      : new Date(subscription.updatedAt);
    const rawPauseDays = Math.max(1, Math.ceil((Date.now() - pauseStart.getTime()) / (1000 * 60 * 60 * 24)));

    // Cap against remaining allowance
    const maxAllowed = subscription.maxPauseDaysAllowed || 0;
    const used = subscription.totalPauseDaysUsed || 0;
    const remaining = Math.max(0, maxAllowed - used);
    const cappedPauseDays = Math.min(rawPauseDays, remaining);
    const wasPartial = cappedPauseDays < rawPauseDays;

    // Extend endDate and update counters
    subscription.endDate = new Date(new Date(subscription.endDate).getTime() + cappedPauseDays * 24 * 60 * 60 * 1000);
    subscription.totalPauseDaysUsed = used + cappedPauseDays;
    subscription.currentPauseStartDate = null;
    subscription.status = 'active';
    await subscription.save();

    // Trigger notifications
    const extensionMsg = wasPartial
      ? `Your subscription was extended by ${cappedPauseDays} day(s) (partial — pause limit reached). ${rawPauseDays - cappedPauseDays} day(s) were not compensated.`
      : `Your milk subscription has been resumed. End date extended by ${cappedPauseDays} day(s).`;
    try {
      await sendNotification(
        'Customer',
        customerId!.toString(),
        'Subscription Resumed!',
        extensionMsg,
        { type: wasPartial ? 'Warning' : 'Success' }
      );
      if (subscription.seller) {
        await sendNotification(
          'Seller',
          subscription.seller.toString(),
          'Subscription Resumed',
          'A paused customer subscription has been resumed for your store.',
          { type: 'Info' }
        );
      }
    } catch (notifErr) {
      console.error('Error sending resume notifications:', notifErr);
    }

    res.json({
      success: true,
      message: `Subscription resumed successfully. End date extended by ${cappedPauseDays} day(s).${wasPartial ? ' (Pause limit reached — partial extension)' : ''}`,
      data: subscription,
    });
  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resume subscription',
    });
  }
};

/**
 * Customer: Cancel active/paused subscription (PATCH /api/v1/subscriptions/cancel)
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.userId;
    const subscription = await UserSubscription.findOne({
      customer: customerId,
      status: { $in: ['active', 'paused'] },
    });

    if (!subscription) {
      res.status(400).json({
        success: false,
        message: 'No active or paused subscription found to cancel',
      });
      return;
    }

    subscription.status = 'cancelled';
    await subscription.save();

    // Trigger notifications
    try {
      await sendNotification(
        'Customer',
        customerId!.toString(),
        'Subscription Cancelled',
        'Your milk subscription has been cancelled.',
        { type: 'Error' }
      );
      if (subscription.seller) {
        await sendNotification(
          'Seller',
          subscription.seller.toString(),
          'Subscription Cancelled',
          'A customer subscription assigned to your store has been cancelled.',
          { type: 'Warning' }
        );
      }
    } catch (notifErr) {
      console.error('Error sending cancel notifications:', notifErr);
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel subscription',
    });
  }
};

/**
 * Seller: Mark daily bottle delivery status (POST /api/v1/seller/subscription-deliveries/mark)
 */
export const markSubscriptionDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;
    const { subscriptionId, date, status } = req.body;

    if (!subscriptionId || !status || !['delivered', 'skipped', 'missed'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'subscriptionId and valid status (delivered/skipped/missed) are required',
      });
      return;
    }

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      seller: sellerId,
    });

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Assigned subscription not found for this seller',
      });
      return;
    }

    // Normalize date to UTC start-of-day
    const deliveryDate = date ? new Date(date) : new Date();
    deliveryDate.setUTCHours(0, 0, 0, 0);

    let isFreeDay = false;

    // Free Day logic on delivery mark
    if (status === 'delivered') {
      if (subscription.freeDaysUsed < subscription.freeDaysTotal) {
        isFreeDay = true;
        subscription.freeDaysUsed += 1;
        await subscription.save();

        // Trigger Free Day Notification (Part B Point 4)
        try {
          await sendNotification(
            'Customer',
            subscription.customer.toString(),
            "Today's Milk is FREE!",
            "Today's milk delivery is FREE as part of your subscription plan! Enjoy your fresh organic milk.",
            { type: 'Success' }
          );
        } catch (notifErr) {
          console.error('Error sending free day notification:', notifErr);
        }
      } else {
        try {
          await sendNotification(
            'Customer',
            subscription.customer.toString(),
            'Milk Delivered',
            'Your daily milk bottle has been delivered to your doorstep.',
            { type: 'Success' }
          );
        } catch (notifErr) {
          console.error('Error sending milk delivery notification:', notifErr);
        }
      }
    }

    // Upsert delivery tracking record
    const deliveryRecord = await SubscriptionDelivery.findOneAndUpdate(
      { subscription: subscriptionId, date: deliveryDate },
      {
        subscription: subscriptionId,
        date: deliveryDate,
        status,
        isFreeDay,
        markedBy: sellerId,
        markedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Delivery marked as ${status} successfully`,
      data: deliveryRecord,
    });
  } catch (error: any) {
    console.error('Error marking subscription delivery:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark subscription delivery',
    });
  }
};

/**
 * Seller: Get assigned subscription deliveries with today's status (GET /api/v1/seller/subscription-deliveries?date=YYYY-MM-DD)
 */
export const getSellerSubscriptionDeliveriesByDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;
    const dateParam = req.query.date as string;

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    // Fetch all active/paused subscriptions assigned to this seller
    const subscriptions = await UserSubscription.find({ seller: sellerId })
      .populate('customer', 'name phone email address city pincode deliveryOtp')
      .populate('plan', 'name bottlesPerDay unit durationInDays')
      .sort({ createdAt: -1 });

    // Fetch all delivery records for this seller on the target date
    const subIds = subscriptions.map((s) => s._id);
    const deliveryRecords = await SubscriptionDelivery.find({
      subscription: { $in: subIds },
      date: targetDate,
    });

    const deliveryMap = new Map<string, any>();
    deliveryRecords.forEach((d) => {
      deliveryMap.set(d.subscription.toString(), d);
    });

    // Merge delivery status with subscription object
    const result = subscriptions.map((sub) => {
      const existingDelivery = deliveryMap.get(sub._id.toString());
      const subObj = sub.toObject();

      const isEligibleForFreeDay = sub.freeDaysUsed < sub.freeDaysTotal;

      return {
        ...subObj,
        todayDelivery: existingDelivery
          ? {
              status: existingDelivery.status,
              isFreeDay: existingDelivery.isFreeDay,
              markedAt: existingDelivery.markedAt,
            }
          : {
              status: 'pending',
              isFreeDay: isEligibleForFreeDay,
              markedAt: null,
            },
      };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching seller subscription deliveries by date:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch subscription deliveries by date',
    });
  }
};


