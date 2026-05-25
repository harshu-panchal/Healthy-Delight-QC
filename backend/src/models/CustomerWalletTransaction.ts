import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerWalletTransaction extends Document {
  customerId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  type: 'Credit' | 'Debit';
  source: 'Refund' | 'Purchase' | 'Manual';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerWalletTransactionSchema = new Schema<ICustomerWalletTransaction>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    type: {
      type: String,
      enum: ['Credit', 'Debit'],
      required: [true, 'Transaction type is required'],
    },
    source: {
      type: String,
      enum: ['Refund', 'Purchase', 'Manual'],
      required: [true, 'Transaction source is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    balanceBefore: {
      type: Number,
      required: [true, 'Balance before is required'],
      min: [0, 'Balance before cannot be negative'],
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after is required'],
      min: [0, 'Balance after cannot be negative'],
    },
    remark: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

CustomerWalletTransactionSchema.index({ customerId: 1 });
CustomerWalletTransactionSchema.index({ createdAt: -1 });
CustomerWalletTransactionSchema.index({ orderId: 1 });

const CustomerWalletTransaction = mongoose.model<ICustomerWalletTransaction>(
  'CustomerWalletTransaction',
  CustomerWalletTransactionSchema
);

export default CustomerWalletTransaction;
