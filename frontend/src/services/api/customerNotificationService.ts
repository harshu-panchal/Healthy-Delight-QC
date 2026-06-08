import api from './config';

export interface CustomerNotification {
  _id: string;
  recipientType: "Admin" | "Seller" | "Customer" | "Delivery" | "All";
  recipientId?: string;
  title: string;
  message: string;
  type: "Info" | "Success" | "Warning" | "Error" | "Order" | "Payment" | "System";
  link?: string;
  actionLabel?: string;
  isRead: boolean;
  priority: "Low" | "Medium" | "High" | "Urgent";
  expiresAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetCustomerNotificationsResponse {
  success: boolean;
  message: string;
  data: CustomerNotification[];
}

export interface MarkReadResponse {
  success: boolean;
  message: string;
  data: CustomerNotification;
}

/**
 * Get customer notifications
 */
export const getCustomerNotifications = async (): Promise<GetCustomerNotificationsResponse> => {
  const response = await api.get<GetCustomerNotificationsResponse>('/customer/notifications');
  return response.data;
};

/**
 * Mark notification as read
 */
export const markCustomerNotificationRead = async (id: string): Promise<MarkReadResponse> => {
  const response = await api.put<MarkReadResponse>(`/customer/notifications/${id}/read`);
  return response.data;
};
