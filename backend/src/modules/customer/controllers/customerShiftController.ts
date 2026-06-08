import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Shift from "../../../models/Shift";

/**
 * Get active shifts for customers
 */
export const getActiveShifts = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;

  const query: any = { isActive: true };

  if (type) {
    // If type is Instant, match Instant or Both
    // If type is Scheduled, match Scheduled or Both
    query.type = { $in: [type, "Both"] };
  }

  const shifts = await Shift.find(query).sort({ startTime: 1 });

  return res.status(200).json({
    success: true,
    message: "Active shifts fetched successfully",
    data: shifts,
  });
});
