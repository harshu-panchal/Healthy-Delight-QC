import api from "./config";

export interface CustomerShift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: "Instant" | "Scheduled" | "Both";
  isActive: boolean;
}

export interface GetActiveShiftsResponse {
  success: boolean;
  message: string;
  data: CustomerShift[];
}

/**
 * Get active shifts for customers
 * Can be filtered by type: "Instant" | "Scheduled"
 */
export const getActiveShifts = async (type?: "Instant" | "Scheduled"): Promise<GetActiveShiftsResponse> => {
  const response = await api.get<GetActiveShiftsResponse>("/customer/shifts", {
    params: type ? { type } : undefined,
  });
  return response.data;
};
