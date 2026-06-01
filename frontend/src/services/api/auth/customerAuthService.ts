import api, {
  setAuthToken,
  removeAuthToken,
  getUserStorageKeyForRole,
} from '../config';
import type { UserRole } from '../config';

export interface SendOTPResponse {
  success: boolean;
  message: string;
  sessionId?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      name: string;
      phone: string;
      email: string;
      walletAmount: number;
      refCode: string;
      status: string;
      customerType?: 'retailer' | 'wholesaler';
    };
    isNewUser?: boolean;
  };
}

/**
 * Send SMS OTP to customer mobile number
 */
export const sendOTP = async (mobile: string, action?: 'login' | 'signup'): Promise<SendOTPResponse> => {
  const response = await api.post<SendOTPResponse>('/auth/customer/send-sms-otp', { mobile, action });
  return response.data;
};

/**
 * Verify SMS OTP and login customer
 * Auto-creates customer if not exists (only on signup)
 */
export const verifyOTP = async (
  mobile: string,
  otp: string,
  sessionId?: string,
  name?: string,
  customerType?: 'retailer' | 'wholesaler',
  action?: 'login' | 'signup'
): Promise<VerifyOTPResponse> => {
  const response = await api.post<VerifyOTPResponse>('/auth/customer/verify-sms-otp', {
    mobile,
    otp,
    sessionId,
    name,
    customerType,
    action,
  });

  if (response.data.success && response.data.data.token) {
    const role: UserRole = 'Customer';
    // Add userType to user data for proper identification
    const userData = {
      ...response.data.data.user,
      userType: role,
    };
    setAuthToken(response.data.data.token, role);
    localStorage.setItem(getUserStorageKeyForRole(role), JSON.stringify(userData));
  }

  return response.data;
};

/**
 * Logout customer
 */
export const logout = (): void => {
  removeAuthToken('Customer');
};

