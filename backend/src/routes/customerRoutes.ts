import { Router } from "express";
import * as customerController from "../modules/customer/controllers/customerController";
import * as customerFAQController from "../modules/customer/controllers/customerFAQController";
import * as customerNotificationController from "../modules/customer/controllers/customerNotificationController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Get customer profile (protected route)
router.get("/profile", authenticate, customerController.getProfile);

// Update customer profile (protected route)
router.put("/profile", authenticate, customerController.updateProfile);

// Delete customer profile/account (protected route)
router.delete("/profile", authenticate, customerController.deleteAccount);

// Update customer location (protected route)
router.post("/location", authenticate, customerController.updateLocation);

// Get customer location (protected route)
router.get("/location", authenticate, customerController.getLocation);

// Get customer wallet transactions (protected route)
router.get("/wallet/transactions", authenticate, customerController.getWalletTransactions);

// Get FAQs for customer app (protected route)
router.get("/faqs", authenticate, customerFAQController.getFAQs);

// Get notifications for customer (protected route)
router.get("/notifications", authenticate, customerNotificationController.getNotifications);

// Mark customer notification as read (protected route)
router.put("/notifications/:id/read", authenticate, customerNotificationController.markNotificationRead);

// Get active shifts (protected route)
import * as customerShiftController from "../modules/customer/controllers/customerShiftController";
router.get("/shifts", authenticate, customerShiftController.getActiveShifts);

export default router;
