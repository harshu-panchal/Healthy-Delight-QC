import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSubscription extends Document {
  customer: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  deliverySlot: 'morning' | 'evening';
  bottlesPerDay: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  freeDaysTotal: number;
  freeDaysUsed: number;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  maxPauseDaysAllowed: number;
  totalPauseDaysUsed: number;
  currentPauseStartDate?: Date | null;
  deliveryAddress: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  price: number;
  commissionRateSnapshot: number;
  payment?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSubscriptionSchema = new Schema<IUserSubscription>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: [true, 'Subscription plan is required'],
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: [true, 'Seller is required'],
    },
    deliverySlot: {
      type: String,
      enum: ['morning', 'evening'],
      required: [true, 'Delivery slot is required'],
    },
    bottlesPerDay: {
      type: Number,
      required: [true, 'Bottles per day is required'],
      min: [1, 'Bottles per day must be at least 1'],
    },
    unit: {
      type: String,
      default: 'Litre',
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    freeDaysTotal: {
      type: Number,
      default: 0,
      min: [0, 'Free days total cannot be negative'],
    },
    freeDaysUsed: {
      type: Number,
      default: 0,
      min: [0, 'Free days used cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'expired', 'cancelled'],
      default: 'active',
    },
    maxPauseDaysAllowed: {
      type: Number,
      default: 0,
      min: [0, 'maxPauseDaysAllowed cannot be negative'],
    },
    totalPauseDaysUsed: {
      type: Number,
      default: 0,
      min: [0, 'totalPauseDaysUsed cannot be negative'],
    },
    currentPauseStartDate: {
      type: Date,
      default: null,
    },
    deliveryAddress: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    price: {
      type: Number,
      required: [true, 'Price snapshot is required'],
      min: [0, 'Price cannot be negative'],
    },
    commissionRateSnapshot: {
      type: Number,
      default: 0,
      min: [0, 'Commission rate snapshot cannot be negative'],
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  {
    timestamps: true,
  }
);

UserSubscriptionSchema.index({ customer: 1, status: 1 });
UserSubscriptionSchema.index({ seller: 1, status: 1 });

const UserSubscription = mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);

export default UserSubscription;
