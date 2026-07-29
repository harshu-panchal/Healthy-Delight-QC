import api from "../config";

export interface SellerSubscriptionDelivery {
  _id: string;
  customer: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    pincode?: string;
    deliveryOtp?: string;
  };
  plan: {
    _id: string;
    name: string;
    bottlesPerDay: number;
    unit: string;
    durationInDays: number;
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
  todayDelivery?: {
    status: 'pending' | 'delivered' | 'skipped' | 'missed';
    isFreeDay: boolean;
    markedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const getSellerSubscriptionDeliveries = async (): Promise<SellerSubscriptionDelivery[]> => {
  const response = await api.get("/seller/subscriptions");
  return response.data.data;
};

export const getSellerSubscriptionDeliveriesByDate = async (
  date?: string
): Promise<SellerSubscriptionDelivery[]> => {
  const response = await api.get("/seller/subscription-deliveries", {
    params: { date },
  });
  return response.data.data;
};

export const markSubscriptionDelivery = async (
  subscriptionId: string,
  status: 'delivered' | 'skipped',
  date?: string
): Promise<any> => {
  const response = await api.post("/seller/subscription-deliveries/mark", {
    subscriptionId,
    status,
    date,
  });
  return response.data;
};
