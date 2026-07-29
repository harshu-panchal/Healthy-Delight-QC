import api from "../config";

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

export interface SubscriptionPlanFormData {
  name: string;
  durationInDays: number;
  price: number;
  freeDays: number;
  bottlesPerDay: number;
  unit: string;
  description?: string;
  isActive: boolean;
}

export interface UserSubscription {
  _id: string;
  customer: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
  };
  plan: {
    _id: string;
    name: string;
    durationInDays: number;
    price: number;
    bottlesPerDay?: number;
    unit?: string;
  };
  seller: {
    _id: string;
    storeName: string;
    sellerName: string;
    mobile: string;
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
  payment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionFilterParams {
  status?: string;
  seller?: string;
  plan?: string;
}

export interface UpdateUserSubscriptionData {
  status?: 'active' | 'paused' | 'expired' | 'cancelled';
  deliverySlot?: 'morning' | 'evening';
  endDate?: string;
}

// Get all subscription plans for Admin (active + inactive)
export const getAdminSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get("/admin/subscription-plans");
  return response.data.data;
};

// Create subscription plan
export const createSubscriptionPlan = async (
  data: SubscriptionPlanFormData
): Promise<SubscriptionPlan> => {
  const response = await api.post("/admin/subscription-plans", data);
  return response.data.data;
};

// Update subscription plan
export const updateSubscriptionPlan = async (
  id: string,
  data: Partial<SubscriptionPlanFormData>
): Promise<SubscriptionPlan> => {
  const response = await api.put(`/admin/subscription-plans/${id}`, data);
  return response.data.data;
};

// Delete (Deactivate) subscription plan
export const deleteSubscriptionPlan = async (id: string): Promise<SubscriptionPlan> => {
  const response = await api.delete(`/admin/subscription-plans/${id}`);
  return response.data.data;
};

// Get all user subscriptions across system with filters
export const getAllSubscriptionsAdmin = async (
  params?: SubscriptionFilterParams
): Promise<UserSubscription[]> => {
  const response = await api.get("/admin/subscriptions", { params });
  return response.data.data;
};

// Update user subscription by Admin
export const updateSubscriptionAdmin = async (
  id: string,
  data: UpdateUserSubscriptionData
): Promise<UserSubscription> => {
  const response = await api.put(`/admin/subscriptions/${id}`, data);
  return response.data.data;
};

// Update seller subscription commission rate
export const updateSellerSubscriptionCommission = async (
  sellerId: string,
  subscriptionCommissionRate: number
): Promise<any> => {
  const response = await api.put(`/admin/sellers/${sellerId}/subscription-commission`, {
    subscriptionCommissionRate,
  });
  return response.data;
};
