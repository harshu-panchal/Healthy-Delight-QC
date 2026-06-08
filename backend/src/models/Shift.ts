import mongoose, { Document, Schema } from "mongoose";

export interface IShift extends Document {
  name: string;
  startTime: string; // e.g., "06:00 AM"
  endTime: string;   // e.g., "09:00 AM"
  type: "Instant" | "Scheduled" | "Both";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    name: {
      type: String,
      required: [true, "Shift name is required"],
      trim: true,
      unique: true,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Instant", "Scheduled", "Both"],
      default: "Both",
      required: [true, "Shift availability type is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ShiftSchema.index({ name: 1 });
ShiftSchema.index({ isActive: 1 });

const Shift = mongoose.model<IShift>("Shift", ShiftSchema);

export default Shift;
