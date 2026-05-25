import { Request, Response } from "express";
import FAQ from "../../../models/FAQ";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Get active FAQs for customer app
 */
export const getFAQs = asyncHandler(async (_req: Request, res: Response) => {
  const faqs = await FAQ.find({ status: "Active" })
    .sort({ order: 1, createdAt: -1 })
    .select("question answer category order createdAt updatedAt");

  return res.status(200).json({
    success: true,
    message: "FAQs fetched successfully",
    data: faqs,
  });
});

