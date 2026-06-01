import { Request, Response } from "express";
import Customer from "../../../models/Customer";
import {
  sendSmsOtp as sendSmsOtpService,
  verifySmsOtp as verifySmsOtpService,
} from "../../../services/otpService";
import { generateToken } from "../../../services/jwtService";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Send SMS OTP to customer mobile number
 * Returns session_id for verification
 */
export const sendSmsOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, action } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  // Check if customer already exists
  const customer = await Customer.findOne({ phone: mobile });

  if (action === "login" && !customer) {
    return res.status(404).json({
      success: false,
      message: "This mobile number is not registered. Please sign up first.",
    });
  }

  if (action === "signup" && customer) {
    return res.status(400).json({
      success: false,
      message: "This mobile number is already registered. Please log in instead.",
    });
  }

  // Send SMS OTP
  const result = await sendSmsOtpService(mobile, 'Customer');

  return res.status(200).json({
    success: true,
    message: result.message,
    sessionId: result.sessionId,
  });
});

/**
 * Verify SMS OTP and login customer
 * Requires session_id and otp
 * Auto-creates customer if not exists (only on signup)
 */
export const verifySmsOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, otp, sessionId, name, customerType, action } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Valid 10-digit mobile number is required",
    });
  }

  if (!otp || !/^[0-9]{4}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "Valid 4-digit OTP is required",
    });
  }

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "Session ID is required for verification",
    });
  }

  // Verify SMS OTP
  const isValid = await verifySmsOtpService(sessionId, otp, mobile, 'Customer');
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  // Find customer
  let customer = await Customer.findOne({ phone: mobile });
  let isNewUser = false;

  if (!customer) {
    if (action === "login") {
      return res.status(404).json({
        success: false,
        message: "Customer account not found. Please sign up first.",
      });
    }

    // Auto-create new customer with signup data
    customer = await Customer.create({
      phone: mobile,
      name: name || "User",
      customerType: customerType || "retailer",
      email: `${mobile}@kosil.temp`,
      status: "Active",
      walletAmount: 0,
      totalOrders: 0,
      totalSpent: 0,
    });
    isNewUser = true;
  } else {
    if (action === "signup") {
      return res.status(400).json({
        success: false,
        message: "This mobile number is already registered. Please log in instead.",
      });
    }

    if (customerType && customer.customerType !== customerType) {
      customer.customerType = customerType;
      await customer.save();
    }
  }

  // Generate JWT token
  const token = generateToken(customer._id.toString(), "Customer");

  return res.status(200).json({
    success: true,
    message: isNewUser ? "Account created and login successful" : "Login successful",
    data: {
      token,
      user: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        walletAmount: customer.walletAmount,
        refCode: customer.refCode,
        status: customer.status,
        customerType: customer.customerType,
      },
      isNewUser,
    },
  });
});
