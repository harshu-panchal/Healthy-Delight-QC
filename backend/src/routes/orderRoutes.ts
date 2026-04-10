import { Router } from "express";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "../modules/seller/controllers/orderController";
import {
  getAvailableDeliveryBoys,
  assignDeliveryBoy,
} from "../modules/seller/controllers/sellerDeliveryController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

// All routes require authentication and seller user type
router.use(authenticate);
router.use(requireUserType("Seller"));

// Get available delivery boys for assignment
router.get("/delivery-boys", getAvailableDeliveryBoys);

// Get seller's orders with filters
router.get("/", getOrders);

// Get order by ID
router.get("/:id", getOrderById);

// Update order status
router.patch("/:id/status", updateOrderStatus);

// Assign delivery boy to order
router.patch("/:id/assign-delivery", assignDeliveryBoy);

export default router;
