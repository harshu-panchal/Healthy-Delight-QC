import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Shift from "../../../models/Shift";

/**
 * Get all shifts
 */
export const getShifts = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    type,
    isActive,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query: any = {};

  // Search filter (by name)
  if (search) {
    query.name = { $regex: search as string, $options: "i" };
  }

  // Type filter (Instant, Scheduled, Both)
  if (type) {
    query.type = type;
  }

  // Active status filter
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const [shifts, total] = await Promise.all([
    Shift.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit as string)),
    Shift.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    message: "Shifts fetched successfully",
    data: shifts,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});

/**
 * Get shift by ID
 */
export const getShiftById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const shift = await Shift.findById(id);

  if (!shift) {
    return res.status(404).json({
      success: false,
      message: "Shift not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Shift fetched successfully",
    data: shift,
  });
});

/**
 * Create a new shift
 */
export const createShift = asyncHandler(async (req: Request, res: Response) => {
  const { name, startTime, endTime, type, isActive } = req.body;

  if (!name || !startTime || !endTime || !type) {
    return res.status(400).json({
      success: false,
      message: "Name, start time, end time, and type are required",
    });
  }

  // Check if name is unique
  const existingShift = await Shift.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existingShift) {
    return res.status(400).json({
      success: false,
      message: "A shift with this name already exists",
    });
  }

  const shift = await Shift.create({
    name,
    startTime,
    endTime,
    type,
    isActive: isActive !== undefined ? isActive : true,
  });

  return res.status(201).json({
    success: true,
    message: "Shift created successfully",
    data: shift,
  });
});

/**
 * Update shift
 */
export const updateShift = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, startTime, endTime, type, isActive } = req.body;

  const shift = await Shift.findById(id);

  if (!shift) {
    return res.status(404).json({
      success: false,
      message: "Shift not found",
    });
  }

  if (name !== undefined && name !== shift.name) {
    // Check uniqueness of new name
    const existingShift = await Shift.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existingShift && existingShift._id.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: "A shift with this name already exists",
      });
    }
    shift.name = name;
  }

  if (startTime !== undefined) shift.startTime = startTime;
  if (endTime !== undefined) shift.endTime = endTime;
  if (type !== undefined) shift.type = type;
  if (isActive !== undefined) shift.isActive = isActive;

  await shift.save();

  return res.status(200).json({
    success: true,
    message: "Shift updated successfully",
    data: shift,
  });
});

/**
 * Update shift status
 */
export const updateShiftStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({
      success: false,
      message: "isActive is required",
    });
  }

  const shift = await Shift.findById(id);

  if (!shift) {
    return res.status(404).json({
      success: false,
      message: "Shift not found",
    });
  }

  shift.isActive = isActive;
  await shift.save();

  return res.status(200).json({
    success: true,
    message: "Shift status updated successfully",
    data: shift,
  });
});

/**
 * Delete shift
 */
export const deleteShift = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const shift = await Shift.findById(id);

  if (!shift) {
    return res.status(404).json({
      success: false,
      message: "Shift not found",
    });
  }

  await Shift.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Shift deleted successfully",
  });
});
