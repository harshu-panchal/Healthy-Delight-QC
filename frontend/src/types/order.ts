import { CartItem } from './cart';

export type OrderStatus = 'Placed' | 'Scheduled' | 'Rider Assigned' | 'Accepted' | 'On the way' | 'Delivered' | 'Cancelled' | 'Returned' | 'Rejected';

export interface OrderAddress {
  name: string;
  phone: string;
  flat: string;
  street: string;
  address?: string; // Add address field for backend compat
  city: string;
  state?: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  id?: string;
  _id?: string;
}

export interface OrderFees {
  platformFee?: number;
  deliveryFee?: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  fees: OrderFees;
  totalAmount: number;
  address: OrderAddress;
  timeSlot: string;
  status: OrderStatus;
  paymentMethod?: string;
  createdAt: string;
  deliveredAt?: string;
  tipAmount?: number;
  donationAmount?: number;
  gstin?: string;
  couponCode?: string;
  giftPackaging?: boolean;
}


