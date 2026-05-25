import api from './config';

export interface CustomerWalletTransaction {
  _id: string;
  customerId: string;
  orderId?: any;
  type: 'Credit' | 'Debit';
  source: 'Refund' | 'Debit' | 'Manual';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  remark?: string;
  createdAt: string;
}

export interface GetWalletTransactionsResponse {
  success: boolean;
  message: string;
  data: CustomerWalletTransaction[];
}

/**
 * Get customer wallet transactions
 */
export const getCustomerWalletTransactions = async (): Promise<GetWalletTransactionsResponse> => {
  const response = await api.get<GetWalletTransactionsResponse>('/customer/wallet/transactions');
  return response.data;
};
