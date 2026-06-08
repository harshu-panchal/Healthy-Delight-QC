import api from "../config";

export interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: "Instant" | "Scheduled" | "Both";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftFormData {
  name: string;
  startTime: string;
  endTime: string;
  type: "Instant" | "Scheduled" | "Both";
  isActive: boolean;
}

export interface GetShiftsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  isActive?: boolean | string;
  sortBy?: string;
  sortOrder?: string;
}

export interface GetShiftsResponse {
  success: boolean;
  message: string;
  data: Shift[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Get all shifts (with pagination, filter, search)
export const getShifts = async (params?: GetShiftsParams): Promise<GetShiftsResponse> => {
  const response = await api.get("/admin/shifts", { params });
  return response.data;
};

// Get shift by ID
export const getShiftById = async (id: string): Promise<Shift> => {
  const response = await api.get(`/admin/shifts/${id}`);
  return response.data.data;
};

// Create a new shift
export const createShift = async (data: ShiftFormData): Promise<Shift> => {
  const response = await api.post("/admin/shifts", data);
  return response.data.data;
};

// Update shift
export const updateShift = async (
  id: string,
  data: Partial<ShiftFormData>
): Promise<Shift> => {
  const response = await api.put(`/admin/shifts/${id}`, data);
  return response.data.data;
};

// Delete shift
export const deleteShift = async (id: string): Promise<void> => {
  await api.delete(`/admin/shifts/${id}`);
};

// Toggle shift status
export const toggleShiftStatus = async (
  id: string,
  isActive: boolean
): Promise<Shift> => {
  const response = await api.patch(`/admin/shifts/${id}/status`, { isActive });
  return response.data.data;
};
