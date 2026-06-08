import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  toggleShiftStatus,
  type Shift,
  type ShiftFormData,
} from "../../../services/api/admin/adminShiftService";

const convertTo24Hour = (time12h: string): string => {
  if (!time12h) return "";
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  
  let [_, hoursStr, minutesStr, modifier] = match;
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  
  if (modifier.toUpperCase() === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }
  
  const paddedHours = String(hours).padStart(2, "0");
  return `${paddedHours}:${minutes}`;
};

const convertTo12Hour = (time24h: string): string => {
  if (!time24h) return "";
  const parts = time24h.split(":");
  if (parts.length < 2) return "";
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const modifier = hours >= 12 ? "PM" : "AM";
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  const paddedHours = String(hours).padStart(2, "0");
  return `${paddedHours}:${minutes} ${modifier}`;
};

export default function AdminManageShifts() {
  const { isAuthenticated, token } = useAuth();

  const [formData, setFormData] = useState<ShiftFormData>({
    name: "",
    startTime: "",
    endTime: "",
    type: "Both",
    isActive: true,
  });

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [totalShifts, setTotalShifts] = useState(0);

  // Edit Mode state
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchShiftsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: rowsPerPage,
        search: searchQuery,
        type: typeFilter || undefined,
      };
      const response = await getShifts(params);
      if (response.success) {
        setShifts(response.data);
        setTotalShifts(response.pagination.total);
      } else {
        setError("Failed to load shifts");
      }
    } catch (err: any) {
      console.error("Error fetching shifts:", err);
      setError("Failed to load shifts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchShiftsList();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token, currentPage, rowsPerPage, searchQuery, typeFilter]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleClearAlerts = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      startTime: "",
      endTime: "",
      type: "Both",
      isActive: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleClearAlerts();

    if (!formData.name || !formData.startTime || !formData.endTime || !formData.type) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const dataToSubmit = {
        ...formData,
        startTime: convertTo12Hour(formData.startTime),
        endTime: convertTo12Hour(formData.endTime),
      };

      if (editingId) {
        // Update shift
        const updated = await updateShift(editingId, dataToSubmit);
        setSuccessMsg(`Shift "${updated.name}" updated successfully.`);
        resetForm();
      } else {
        // Create shift
        const created = await createShift(dataToSubmit);
        setSuccessMsg(`Shift "${created.name}" created successfully.`);
        resetForm();
      }
      fetchShiftsList();
    } catch (err: any) {
      console.error("Error saving shift:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save shift. Please check input parameters."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (shift: Shift) => {
    handleClearAlerts();
    setEditingId(shift._id);
    setFormData({
      name: shift.name,
      startTime: convertTo24Hour(shift.startTime),
      endTime: convertTo24Hour(shift.endTime),
      type: shift.type,
      isActive: shift.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    handleClearAlerts();

    try {
      await deleteShift(id);
      setSuccessMsg("Shift deleted successfully.");
      fetchShiftsList();
    } catch (err: any) {
      console.error("Error deleting shift:", err);
      setError(err.response?.data?.message || "Failed to delete shift.");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    handleClearAlerts();
    try {
      const updated = await toggleShiftStatus(id, !currentStatus);
      setShifts((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isActive: updated.isActive } : s))
      );
      setSuccessMsg(`Shift status updated to ${updated.isActive ? "Active" : "Inactive"}.`);
    } catch (err: any) {
      console.error("Error toggling shift status:", err);
      setError("Failed to update shift status.");
    }
  };

  const totalPages = Math.ceil(totalShifts / rowsPerPage);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Page Content */}
      <div className="flex-1 p-6">
        {/* Header with Title and Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-neutral-800">Manage Shifts</h1>
          <div className="text-sm">
            <span className="text-primary-dark hover:underline cursor-pointer">Home</span>
            <span className="text-neutral-400 mx-1">/</span>
            <span className="text-neutral-600">Shifts</span>
          </div>
        </div>

        {/* Form Section (Add or Edit) */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-6">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4 rounded-t-lg flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-800">
              {editingId ? "Edit Shift" : "Add Shift"}
            </h2>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-xs text-red-600 hover:text-red-700 font-medium">
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-900 font-bold hover:text-red-700 ml-4">
                  ×
                </button>
              </div>
            )}

            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                <span>{successMsg}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMsg(null)}
                  className="text-green-900 font-bold hover:text-green-700 ml-4">
                  ×
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Shift Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Shift Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="e.g. Morning, Evening"
                  disabled={saving}
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  disabled={saving}
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  disabled={saving}
                />
              </div>

              {/* Availability Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Availability Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                  disabled={saving}>
                  <option value="Instant">Instant Delivery Only</option>
                  <option value="Scheduled">Scheduled Delivery Only</option>
                  <option value="Both">Both (Instant & Scheduled)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary cursor-pointer"
                disabled={saving}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 cursor-pointer select-none">
                Active status
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full px-6 py-3 rounded font-semibold transition-all active:scale-95 shadow-md ${
                saving
                  ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                  : "bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white"
              }`}>
              {saving ? "Saving Shift..." : editingId ? "Update Shift" : "Add Shift"}
            </button>
          </form>
        </div>

        {/* View Shifts Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-neutral-800">Shifts List</h2>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Show Entries selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Show</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-neutral-600">entries</span>
            </div>

            {/* Filter by Shift Type and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer">
                <option value="">All Types</option>
                <option value="Instant">Instant Only</option>
                <option value="Scheduled">Scheduled Only</option>
                <option value="Both">Both</option>
              </select>

              <input
                type="text"
                placeholder="Search shifts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xs font-bold text-neutral-800 border-b border-neutral-200">
                  <th className="p-4 w-16">Sr No.</th>
                  <th className="p-4">Shift Name</th>
                  <th className="p-4">Start Time</th>
                  <th className="p-4">End Time</th>
                  <th className="p-4">Availability Context</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-400">
                      Loading shifts...
                    </td>
                  </tr>
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-400">
                      No shifts found.
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift, index) => (
                    <tr
                      key={shift._id}
                      className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700 border-b border-neutral-200">
                      <td className="p-4 align-middle">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </td>
                      <td className="p-4 align-middle font-medium text-neutral-900">
                        {shift.name}
                      </td>
                      <td className="p-4 align-middle text-neutral-600">
                        {shift.startTime}
                      </td>
                      <td className="p-4 align-middle text-neutral-600">
                        {shift.endTime}
                      </td>
                      <td className="p-4 align-middle">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            shift.type === "Instant"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : shift.type === "Scheduled"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : "bg-teal-50 text-teal-800 border border-teal-200"
                          }`}>
                          {shift.type}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(shift._id, shift.isActive)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold select-none cursor-pointer transition-all active:scale-95 ${
                            shift.isActive
                              ? "bg-cream text-neutral-800 hover:bg-neutral-200"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}>
                          {shift.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit button */}
                          <button
                            onClick={() => handleEdit(shift)}
                            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded transition-colors"
                            title="Edit">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(shift._id)}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                            title="Delete">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-neutral-700">
              Showing {totalShifts === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{" "}
              {Math.min(currentPage * rowsPerPage, totalShifts)} of {totalShifts} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-2 border-2 rounded transition-all active:scale-95 ${
                  currentPage === 1
                    ? "text-neutral-400 cursor-not-allowed bg-neutral-50 border-neutral-200"
                    : "text-primary border-primary hover:bg-primary hover:text-white"
                }`}
                aria-label="Previous page">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M15 18L9 12L15 6" />
                </svg>
              </button>
              <button className="px-3 py-1.5 border-2 border-primary bg-primary text-white rounded font-medium text-sm">
                {currentPage}
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-2 border-2 rounded transition-all active:scale-95 ${
                  currentPage === totalPages || totalPages === 0
                    ? "text-neutral-400 border-neutral-200 cursor-not-allowed bg-neutral-50"
                    : "text-primary border-primary hover:bg-primary hover:text-white"
                }`}
                aria-label="Next page">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M9 18L15 12L9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-neutral-600 border-t border-neutral-200 bg-white">
        Copyright © {new Date().getFullYear()}. Developed By{" "}
        <a href="#" className="text-primary-dark hover:underline">
          Healthy Delight
        </a>
      </footer>
    </div>
  );
}
