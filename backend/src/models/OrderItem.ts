import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItem extends Document {
  order: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;

  // Product Details (snapshot at time of order)
  productName: string;
  productImage?: string;
  sku?: string;

  // Pricing
  unitPrice: number;
  quantity: number;
  total: number;

  // Variation
  variation?: string;

  // Additional fields for calculations
  subtotal?: number;
  commissionRate?: number;
  orderId?: any;
  variantTitle?: string;

  // Status
  status: "Pending" | "Confirmed" | "Shipped" | "On the way" | "Delivered" | "Cancelled" | "Returned";

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: [true, "Seller is required"],
    },

    // Product Details (snapshot)
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    productImage: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },

    // Pricing
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },

    // Variation
    variation: {
      type: String,
      trim: true,
    },

    // Additional fields for calculations
    subtotal: {
      type: Number,
      default: 0,
    },
    commissionRate: {
      type: Number,
      default: 0,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    variantTitle: {
      type: String,
      trim: true,
    },

    // Status
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "On the way", "Delivered", "Cancelled", "Returned"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
OrderItemSchema.index({ order: 1 });
OrderItemSchema.index({ product: 1 });
OrderItemSchema.index({ seller: 1 });

const OrderItem = mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);

export default OrderItem;
