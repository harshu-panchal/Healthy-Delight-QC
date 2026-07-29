import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  code?: string;
  durationInDays: number;
  price: number;
  freeDays: number;
  bottlesPerDay: number;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    code: {
      type: String,
      default: () => 'PLAN_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      trim: true,
    },
    durationInDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [1, 'Duration must be at least 1 day'],
    },
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: [0, 'Price cannot be negative'],
    },
    freeDays: {
      type: Number,
      default: 0,
      min: [0, 'Free days cannot be negative'],
    },
    bottlesPerDay: {
      type: Number,
      required: [true, 'Bottles per day quantity is required'],
      min: [1, 'Bottles per day must be at least 1'],
    },
    unit: {
      type: String,
      default: 'Litre',
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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

const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);

// Safely drop legacy code_1 index from MongoDB if present
SubscriptionPlan.collection.dropIndex('code_1').catch(() => {
  // Index doesn't exist or already dropped
});

export default SubscriptionPlan;
