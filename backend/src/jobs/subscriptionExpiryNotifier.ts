import cron from 'node-cron';
import UserSubscription from '../models/UserSubscription';
import { sendNotification } from '../services/notificationService';

export const startSubscriptionExpiryNotifierJob = () => {
  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron Job] Checking for subscriptions expiring in 3 days...');
    try {
      const now = new Date();
      const threeDaysLaterStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      threeDaysLaterStart.setHours(0, 0, 0, 0);

      const threeDaysLaterEnd = new Date(threeDaysLaterStart.getTime());
      threeDaysLaterEnd.setHours(23, 59, 59, 999);

      const expiringSubscriptions = await UserSubscription.find({
        status: 'active',
        endDate: { $gte: threeDaysLaterStart, $lte: threeDaysLaterEnd },
      }).populate('plan');

      console.log(`[Cron Job] Found ${expiringSubscriptions.length} subscriptions expiring in 3 days.`);

      for (const sub of expiringSubscriptions) {
        if (sub.customer) {
          const planName = (sub.plan as any)?.name || 'milk';
          await sendNotification(
            'Customer',
            sub.customer.toString(),
            'Subscription Expiring Soon!',
            `Your ${planName} subscription expires in 3 days. Renew now to continue uninterrupted milk deliveries!`,
            { type: 'Warning', priority: 'High' }
          );
        }
      }
    } catch (error) {
      console.error('[Cron Job] Error checking expiring subscriptions:', error);
    }
  });

  console.log('[Cron Job] Subscription Expiry Notifier Job initialized (8:00 AM daily)');
};
