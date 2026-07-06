import api from './config';

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  registrationDate: string;
  status: string;
  refCode: string;
  walletAmount: number;
  totalOrders: number;
  totalSpent: number;
  profileImage?: string;
}

export interface GetProfileResponse {
  success: boolean;
  message: string;
  data: CustomerProfile;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  profileImage?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: CustomerProfile;
}

export interface CustomerFAQ {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetCustomerFAQsResponse {
  success: boolean;
  message: string;
  data: CustomerFAQ[];
}

/**
 * Get customer profile
 */
export const getProfile = async (): Promise<GetProfileResponse> => {
  const response = await api.get<GetProfileResponse>('/customer/profile');
  return response.data;
};

/**
 * Update customer profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
  const response = await api.put<UpdateProfileResponse>('/customer/profile', data);
  return response.data;
};

/**
 * Get customer FAQs (managed by admin)
 */
export const getCustomerFAQs = async (): Promise<GetCustomerFAQsResponse> => {
  const response = await api.get<GetCustomerFAQsResponse>('/customer/faqs');
  return response.data;
};

/**
 * Delete customer account
 */
export const deleteAccount = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>('/customer/profile');
  return response.data;
};

export interface WalletAddOrderResponse {
  success: boolean;
  message?: string;
  data: {
    razorpayOrderId: string;
    razorpayKey: string;
    amount: number;
    currency: string;
    receipt: string;
  };
}

export interface WalletAddVerifyData {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
}

export interface WalletAddVerifyResponse {
  success: boolean;
  message: string;
  data: {
    walletAmount: number;
  };
}

/**
 * Create Razorpay order for adding balance to customer wallet
 */
export const createWalletAddOrder = async (amount: number): Promise<WalletAddOrderResponse> => {
  const response = await api.post<WalletAddOrderResponse>('/customer/wallet/add/order', { amount });
  return response.data;
};

/**
 * Verify Razorpay payment and credit customer wallet
 */
export const verifyWalletAddPayment = async (data: WalletAddVerifyData): Promise<WalletAddVerifyResponse> => {
  const response = await api.post<WalletAddVerifyResponse>('/customer/wallet/add/verify', data);
  return response.data;
};

