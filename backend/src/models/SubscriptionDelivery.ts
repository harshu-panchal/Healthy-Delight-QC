import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionDelivery extends Document {
  subscription: mongoose.Types.ObjectId;
  date: Date;
  status: 'delivered' | 'skipped' | 'missed';
  isFreeDay: boolean;
  markedBy?: mongoose.Types.ObjectId;
  markedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionDeliverySchema = new Schema<ISubscriptionDelivery>(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'UserSubscription',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['delivered', 'skipped', 'missed'],
      default: 'missed',
      required: true,
    },
    isFreeDay: {
      type: Boolean,
      default: false,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index so each subscription has at most one delivery record per date
subscriptionDeliverySchema.index({ subscription: 1, date: 1 }, { unique: true });

export default mongoose.model<ISubscriptionDelivery>('SubscriptionDelivery', subscriptionDeliverySchema);
