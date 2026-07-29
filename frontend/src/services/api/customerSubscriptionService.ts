import api from "./config";

export interface SubscriptionPlan {
  _id: string;
  name: string;
  durationInDays: number;
  price: number;
  freeDays: number;
  bottlesPerDay: number;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  _id: string;
  customer: string;
  plan: SubscriptionPlan;
  seller: {
    _id: string;
    storeName: string;
    phone?: string;
    address?: string;
    logo?: string;
    latitude?: string;
    longitude?: string;
    sellerName?: string;
  };
  deliverySlot: 'morning' | 'evening';
  bottlesPerDay: number;
  unit: string;
  startDate: string;
  endDate: string;
  freeDaysTotal: number;
  freeDaysUsed: number;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
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
  maxPauseDaysAllowed?: number;
  totalPauseDaysUsed?: number;
  currentPauseStartDate?: string | null;
  payment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInitResponse {
  razorpayOrderId: string;
  razorpayKey: string;
  amount: number;
  currency: string;
  planId: string;
  deliverySlot: string;
  sellerId: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
  deliverySlot: string;
}

// 1. Get active plans (Public)
export const getPublicSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get("/subscriptions/plans");
  return response.data.data;
};

// 2. Get customer's active subscription (Auth Required)
export const getMySubscription = async (): Promise<UserSubscription | null> => {
  const response = await api.get("/subscriptions/my-subscription");
  return response.data.data;
};

// 3. Initiate subscription purchase (Auth Required)
export const purchaseSubscription = async (
  planId: string,
  deliverySlot: 'morning' | 'evening'
): Promise<PurchaseInitResponse> => {
  const response = await api.post("/subscriptions/purchase", {
    planId,
    deliverySlot,
  });
  return response.data.data;
};

// 4. Verify subscription payment and activate (Auth Required)
export const verifySubscriptionPayment = async (
  payload: VerifyPaymentPayload
): Promise<UserSubscription> => {
  const response = await api.post("/subscriptions/verify-payment", payload);
  return response.data.data;
};

// 5. Pause subscription (Auth Required)
export const pauseSubscriptionApi = async (): Promise<UserSubscription> => {
  const response = await api.patch("/subscriptions/pause");
  return response.data.data;
};

// 6. Resume subscription (Auth Required)
export const resumeSubscriptionApi = async (): Promise<UserSubscription> => {
  const response = await api.patch("/subscriptions/resume");
  return response.data.data;
};

// 7. Cancel subscription (Auth Required)
export const cancelSubscriptionApi = async (): Promise<UserSubscription> => {
  const response = await api.patch("/subscriptions/cancel");
  return response.data.data;
};
