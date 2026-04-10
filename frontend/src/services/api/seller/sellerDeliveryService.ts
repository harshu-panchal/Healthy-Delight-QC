import api from "../config";
import { ApiResponse } from "../admin/types";
import { DeliveryBoy } from "../admin/adminDeliveryService";
import { Order } from "../admin/adminOrderService";

/**
 * Get available delivery boys for sellers
 */
export const getSellerDeliveryBoys = async (params?: { search?: string }): Promise<ApiResponse<DeliveryBoy[]>> => {
  const response = await api.get<ApiResponse<DeliveryBoy[]>>("/orders/delivery-boys", { params });
  return response.data;
};

/**
 * Assign delivery boy to order (Seller authorized version)
 */
export const sellerAssignDeliveryBoy = async (
  id: string,
  data: { deliveryBoyId: string }
): Promise<ApiResponse<Order>> => {
  const response = await api.patch<ApiResponse<Order>>(
    `/orders/${id}/assign-delivery`,
    data
  );
  return response.data;
};
