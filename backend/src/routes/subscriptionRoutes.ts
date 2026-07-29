import { Router } from 'express';
import { authenticate, requireUserType } from '../middleware/auth';
import {
  getActiveSubscriptionPlans,
  purchaseSubscription,
  verifySubscriptionPayment,
  getMySubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getSellerSubscriptions,
  markSubscriptionDelivery,
  getSellerSubscriptionDeliveriesByDate,
  getAllSubscriptionPlansAdmin,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAllSubscriptionsAdmin,
  updateSubscriptionByAdmin,
  updateSellerSubscriptionCommission,
} from '../controllers/subscriptionController';

const router = Router();

// ==================== PUBLIC / CUSTOMER ROUTES ====================
// GET /api/subscriptions/plans (Public)
router.get('/subscriptions/plans', getActiveSubscriptionPlans);

// POST /api/subscriptions/purchase (Customer Auth)
router.post(
  '/subscriptions/purchase',
  authenticate,
  requireUserType('Customer'),
  purchaseSubscription
);

// POST /api/subscriptions/verify-payment (Customer Auth)
router.post(
  '/subscriptions/verify-payment',
  authenticate,
  requireUserType('Customer'),
  verifySubscriptionPayment
);

// GET /api/subscriptions/my-subscription (Customer Auth)
router.get(
  '/subscriptions/my-subscription',
  authenticate,
  requireUserType('Customer'),
  getMySubscription
);

// PATCH /api/subscriptions/pause (Customer Auth)
router.patch(
  '/subscriptions/pause',
  authenticate,
  requireUserType('Customer'),
  pauseSubscription
);

// PATCH /api/subscriptions/resume (Customer Auth)
router.patch(
  '/subscriptions/resume',
  authenticate,
  requireUserType('Customer'),
  resumeSubscription
);

// PATCH /api/subscriptions/cancel (Customer Auth)
router.patch(
  '/subscriptions/cancel',
  authenticate,
  requireUserType('Customer'),
  cancelSubscription
);

// ==================== SELLER ROUTES ====================
// GET /api/seller/subscriptions (Seller Auth)
router.get(
  '/seller/subscriptions',
  authenticate,
  requireUserType('Seller'),
  getSellerSubscriptions
);

// GET /api/seller/subscription-deliveries (Seller Auth)
router.get(
  '/seller/subscription-deliveries',
  authenticate,
  requireUserType('Seller'),
  getSellerSubscriptionDeliveriesByDate
);

// POST /api/seller/subscription-deliveries/mark (Seller Auth)
router.post(
  '/seller/subscription-deliveries/mark',
  authenticate,
  requireUserType('Seller'),
  markSubscriptionDelivery
);

// ==================== ADMIN ROUTES ====================
// GET /api/admin/subscription-plans (Admin Auth)
router.get(
  '/admin/subscription-plans',
  authenticate,
  requireUserType('Admin'),
  getAllSubscriptionPlansAdmin
);

// POST /api/admin/subscription-plans (Admin Auth)
router.post(
  '/admin/subscription-plans',
  authenticate,
  requireUserType('Admin'),
  createSubscriptionPlan
);

// PUT /api/admin/subscription-plans/:id (Admin Auth)
router.put(
  '/admin/subscription-plans/:id',
  authenticate,
  requireUserType('Admin'),
  updateSubscriptionPlan
);

// DELETE /api/admin/subscription-plans/:id (Admin Auth - Soft Delete)
router.delete(
  '/admin/subscription-plans/:id',
  authenticate,
  requireUserType('Admin'),
  deleteSubscriptionPlan
);

// GET /api/admin/subscriptions (Admin Auth)
router.get(
  '/admin/subscriptions',
  authenticate,
  requireUserType('Admin'),
  getAllSubscriptionsAdmin
);

// PUT /api/admin/subscriptions/:id (Admin Auth)
router.put(
  '/admin/subscriptions/:id',
  authenticate,
  requireUserType('Admin'),
  updateSubscriptionByAdmin
);

// PUT /api/admin/sellers/:id/subscription-commission (Admin Auth)
router.put(
  '/admin/sellers/:id/subscription-commission',
  authenticate,
  requireUserType('Admin'),
  updateSellerSubscriptionCommission
);

export default router;
