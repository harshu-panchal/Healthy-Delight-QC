import { useState, useEffect } from "react";
import { uploadImage } from "../../../services/api/uploadService";
import {
  validateImageFile,
  createImagePreview,
} from "../../../utils/imageUpload";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type Coupon,
} from "../../../services/api/admin/adminCouponService";
import { useAuth } from "../../../context/AuthContext";

export default function AdminCoupon() {
  const { isAuthenticated, token } = useAuth();
  
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    userType: "",
    numberOfTimes: "Single Time Valid",
    couponImageUrl: "",
    couponExpiryDate: "",
    couponCode: "",
    couponTitle: "",
    couponStatus: "",
    couponMinOrderAmount: "",
    couponValue: "",
    couponType: "Percentage",
    couponDescription: "",
  });

  const [couponImageFile, setCouponImageFile] = useState<File | null>(null);
  const [couponImagePreview, setCouponImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "edit" | "delete" | null;
    coupon: Coupon | null;
  }>({
    isOpen: false,
    type: null,
    coupon: null,
  });

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fetch coupons from API
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCoupons({ limit: 100 });
      if (response.success) {
        setCoupons(response.data);
      } else {
        setError("Failed to load coupons");
      }
    } catch (err) {
      console.error("Error fetching coupons:", err);
      setError("Failed to load coupons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    fetchCoupons();
  }, [isAuthenticated, token]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid image file");
      return;
    }

    setCouponImageFile(file);
    setUploadError("");

    try {
      const preview = await createImagePreview(file);
      setCouponImagePreview(preview);
    } catch (error) {
      setUploadError("Failed to create image preview");
    }
  };

  const handleEditClick = (coupon: Coupon) => {
    setConfirmModal({
      isOpen: true,
      type: "edit",
      coupon: coupon,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.coupon || !confirmModal.type) return;
    const { type, coupon } = confirmModal;
    
    // Close modal first
    setConfirmModal({ isOpen: false, type: null, coupon: null });
    
    if (type === "edit") {
      try {
        setEditingCouponId(coupon._id);
        
        // Set form fields based on selected coupon
        setFormData({
          userType: (coupon.applicableTo || "All") === "All" ? "All Users" : "Specific User",
          numberOfTimes: coupon.usageLimit === 1 ? "Single Time Valid" : "Multi Time Valid",
          couponImageUrl: coupon.imageUrl || "",
          couponExpiryDate: coupon.endDate ? new Date(coupon.endDate).toLocaleDateString('en-CA') : "",
          couponCode: coupon.code || "",
          couponTitle: coupon.title || "",
          couponStatus: coupon.isActive ? "Published" : "Draft",
          couponMinOrderAmount: String(coupon.minimumPurchase ?? 0),
          couponValue: String(coupon.discountValue ?? 0),
          couponType: (coupon.discountType || "Percentage") === "Percentage" ? "Percentage" : "Fixed",
          couponDescription: coupon.description || "",
        });
        
        if (coupon.imageUrl) {
          setCouponImagePreview(coupon.imageUrl);
        } else {
          setCouponImagePreview("");
        }
        setCouponImageFile(null);
        setUploadError("");

        // Smooth scroll to top where the Edit Form is displayed
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        console.error("Error populating coupon for edit:", err);
        alert("Failed to populate coupon details for editing.");
      }
    } else if (type === "delete") {
      try {
        const response = await deleteCoupon(coupon._id);
        if (response.success) {
          setCoupons((prev) => prev.filter((c) => c._id !== coupon._id));
        }
      } catch (error: any) {
        alert(error.response?.data?.message || "Failed to delete coupon");
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingCouponId(null);
    setFormData({
      userType: "",
      numberOfTimes: "Single Time Valid",
      couponImageUrl: "",
      couponExpiryDate: "",
      couponCode: "",
      couponTitle: "",
      couponStatus: "",
      couponMinOrderAmount: "",
      couponValue: "",
      couponType: "Percentage",
      couponDescription: "",
    });
    setCouponImageFile(null);
    setCouponImagePreview("");
    setUploadError("");
  };

  const generateCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, couponCode: code }));
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    // Validation
    if (
      !formData.userType ||
      !formData.couponTitle ||
      !formData.couponCode ||
      !formData.couponExpiryDate ||
      !formData.couponStatus ||
      !formData.couponMinOrderAmount ||
      !formData.couponValue ||
      !formData.couponDescription
    ) {
      setUploadError("Please fill in all required fields");
      return;
    }

    const todayStr = getLocalDateString();
    if (!editingCouponId && formData.couponExpiryDate < todayStr) {
      setUploadError("Coupon expiry date cannot be in the past");
      return;
    }

    setUploading(true);

    try {
      let imageUrl = formData.couponImageUrl;

      // Upload coupon image if provided
      if (couponImageFile) {
        const imageResult = await uploadImage(couponImageFile, "kosil/coupons");
        imageUrl = imageResult.secureUrl;
      }

      // Create/Update coupon via API
      const today = new Date().toISOString().split("T")[0];
      const couponData = {
        code: formData.couponCode.toUpperCase(),
        title: formData.couponTitle,
        imageUrl: imageUrl,
        description: formData.couponDescription,
        discountType:
          formData.couponType === "Percentage"
            ? ("Percentage" as const)
            : ("Fixed" as const),
        discountValue: parseFloat(formData.couponValue),
        minimumPurchase: parseFloat(formData.couponMinOrderAmount),
        startDate: today,
        endDate: formData.couponExpiryDate,
        usageLimit:
          formData.numberOfTimes === "Single Time Valid" ? 1 : undefined,
        applicableTo:
          formData.userType === "All Users"
            ? ("All" as const)
            : ("All" as const),
        isActive: formData.couponStatus === "Published",
      };

      let response;
      if (editingCouponId) {
        response = await updateCoupon(editingCouponId, couponData);
      } else {
        response = await createCoupon(couponData);
      }

      if (response.success) {
        // Refresh the list
        fetchCoupons();
        handleCancelEdit();
      } else {
        setUploadError(editingCouponId ? "Failed to update coupon" : "Failed to create coupon");
      }
    } catch (error: any) {
      setUploadError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${editingCouponId ? "update" : "create"} coupon. Please try again.`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    const couponObj = coupons.find(c => c._id === id);
    if (!couponObj) return;
    setConfirmModal({
      isOpen: true,
      type: "delete",
      coupon: couponObj,
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => (
    <span className="text-neutral-400 text-xs ml-1">
      {sortColumn === column ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}
    </span>
  );

  // Sort coupons
  let sortedCoupons = [...coupons];
  if (sortColumn) {
    sortedCoupons = [...sortedCoupons].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "code":
          aValue = a.code;
          bValue = b.code;
          break;
        case "discountValue":
          aValue = a.discountValue;
          bValue = b.discountValue;
          break;
        case "endDate":
          aValue = a.endDate;
          bValue = b.endDate;
          break;
        case "isActive":
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        case "minimumPurchase":
          aValue = a.minimumPurchase || 0;
          bValue = b.minimumPurchase || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sortedCoupons.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedCoupons = sortedCoupons.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Page Content */}
      <div className="flex-1 p-6">
        {/* Header with Title and Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-neutral-800">Coupon</h1>
          <div className="text-sm">
            <span className="text-primary-dark hover:underline cursor-pointer">
              Home
            </span>
            <span className="text-neutral-400 mx-1">/</span>
            <span className="text-neutral-600">Coupon</span>
          </div>
        </div>

        {/* Add Coupon Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-6">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4 rounded-t-lg">
            <h2 className="text-lg font-semibold text-neutral-800">
              {editingCouponId ? "Edit Coupon" : "Add Coupon"}
            </h2>
          </div>

          <form onSubmit={handleAddCoupon} className="p-6">
            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {uploadError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Row 1 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select User Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                  disabled={uploading}>
                  <option value="">Select User Type</option>
                  <option value="All Users">All Users</option>
                  <option value="Specific User">Specific User</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Number of Times <span className="text-red-500">*</span>
                </label>
                <select
                  name="numberOfTimes"
                  value={formData.numberOfTimes}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                  disabled={uploading}>
                  <option value="Single Time Valid">Single Time Valid</option>
                  <option value="Multi Time Valid">Multi Time Valid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon Image
                </label>
                <div className="space-y-2">
                  <label className="block border-2 border-dashed border-neutral-300 rounded-lg overflow-hidden text-center cursor-pointer hover:border-primary transition-colors h-48 flex items-center justify-center bg-neutral-50 relative">
                    {couponImagePreview ? (
                      <img
                        src={couponImagePreview}
                        alt="Coupon preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-4">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="mx-auto mb-2 text-neutral-400">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p className="text-xs text-neutral-600">Choose File</p>
                        <p className="text-xs text-neutral-500 mt-1">Max 5MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>

                  {couponImagePreview && (
                    <div className="flex items-center justify-between text-xs bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                      <span className="text-neutral-600 truncate pr-4" title={couponImageFile?.name || "Coupon Image"}>
                        {couponImageFile?.name || "Uploaded Coupon Image"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setCouponImageFile(null);
                          setCouponImagePreview("");
                        }}
                        className="font-semibold text-red-600 hover:text-red-700 transition-colors">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Row 2 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon Expiry Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="couponExpiryDate"
                    value={formData.couponExpiryDate}
                    onChange={handleInputChange}
                    required
                    min={getLocalDateString()}
                    className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    name="couponCode"
                    value={formData.couponCode}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Enter coupon code"
                  />
                  <button
                    type="button"
                    onClick={generateCouponCode}
                    className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full transition-colors"
                    title="Generate Code">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="couponTitle"
                  value={formData.couponTitle}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Enter coupon title"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Row 3 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="couponStatus"
                  value={formData.couponStatus}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white">
                  <option value="">Select Coupon Status</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon Min Order Amount{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="couponMinOrderAmount"
                  value={formData.couponMinOrderAmount}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Enter min order amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="couponValue"
                  value={formData.couponValue}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Enter coupon value"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Coupon Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="couponType"
                  value={formData.couponType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white">
                  <option value="Percentage">Percentage</option>
                  <option value="Fixed">Fixed</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              {/* Row 4 */}
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Coupon Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="couponDescription"
                value={formData.couponDescription}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                placeholder="Enter coupon description"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading}
                className={`flex-1 px-6 py-3 rounded font-semibold transition-all active:scale-95 shadow-md ${
                  uploading
                    ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                    : "bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white"
                }`}>
                {uploading
                  ? editingCouponId
                    ? "Updating Coupon..."
                    : "Creating Coupon..."
                  : editingCouponId
                  ? "Save Changes"
                  : "Add Coupon"}
              </button>
              {editingCouponId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 rounded font-semibold bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 transition-all active:scale-95">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* View Coupon Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-neutral-800">
              View Coupon
            </h2>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-neutral-600">entries</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xs font-bold text-neutral-800 border-b border-neutral-200">
                  <th className="p-4">Sr No.</th>
                  <th className="p-4">Image</th>
                  <th className="p-4">Title</th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("code")}>
                    <div className="flex items-center">
                      Coupon Code <SortIcon column="code" />
                    </div>
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("discountValue")}>
                    <div className="flex items-center">
                      Discount <SortIcon column="discountValue" />
                    </div>
                  </th>
                  <th className="p-4">Discount Type</th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("minimumPurchase")}>
                    <div className="flex items-center">
                      Min Purchase <SortIcon column="minimumPurchase" />
                    </div>
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("endDate")}>
                    <div className="flex items-center">
                      Expiry Date <SortIcon column="endDate" />
                    </div>
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("isActive")}>
                    <div className="flex items-center">
                      Status <SortIcon column="isActive" />
                    </div>
                  </th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-neutral-400">
                      Loading coupons...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : displayedCoupons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-neutral-400">
                      No coupons found. Add your first coupon above.
                    </td>
                  </tr>
                ) : (
                  displayedCoupons.map((coupon, index) => (
                    <tr
                      key={coupon._id}
                      className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700 border-b border-neutral-200">
                      <td className="p-4 align-middle">
                        {startIndex + index + 1}
                      </td>
                      <td className="p-4 align-middle">
                        {coupon.imageUrl ? (
                          <img
                            src={coupon.imageUrl}
                            alt={coupon.title || coupon.code}
                            className="w-12 h-12 object-cover rounded border border-neutral-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-neutral-100 border border-neutral-200 rounded flex items-center justify-center text-xs text-neutral-400">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-middle font-semibold text-neutral-800">
                        {coupon.title || "N/A"}
                      </td>
                      <td className="p-4 align-middle font-medium">
                        {coupon.code}
                      </td>
                      <td className="p-4 align-middle">
                        {coupon.discountType === "Percentage"
                          ? `${coupon.discountValue}%`
                          : `₹${coupon.discountValue}`}
                      </td>
                      <td className="p-4 align-middle">
                        {coupon.discountType}
                      </td>
                      <td className="p-4 align-middle">
                        {coupon.minimumPurchase
                          ? `₹${coupon.minimumPurchase}`
                          : "N/A"}
                      </td>
                      <td className="p-4 align-middle">
                        {new Date(coupon.endDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="p-4 align-middle">
                        {(() => {
                          const couponEndDate = new Date(coupon.endDate);
                          couponEndDate.setHours(23, 59, 59, 999);
                          const isExpired = couponEndDate < new Date();
                          const displayActive = coupon.isActive && !isExpired;
                          return (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                displayActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-red-50 text-red-700 border border-red-100"
                              }`}>
                              {displayActive ? "Active" : isExpired ? "Expired" : "Inactive"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(coupon)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            title="Edit">
                            <svg
                              width="16"
                              height="16"
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
                          <button
                            onClick={() => handleDelete(coupon._id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                            title="Delete">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
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
              Showing {sortedCoupons.length === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, sortedCoupons.length)} of{" "}
              {sortedCoupons.length} entries
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
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button className="px-3 py-1.5 border-2 border-primary bg-primary text-white rounded font-medium text-sm">
                {currentPage}
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
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
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 flex flex-col items-center text-center transform scale-100 transition-all duration-300">
            {confirmModal.type === "delete" ? (
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4 animate-pulse">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
            )}

            <h3 className="text-lg font-bold text-neutral-800 mb-2">
              {confirmModal.type === "delete" ? "Delete Coupon?" : "Edit Coupon?"}
            </h3>
            
            <p className="text-sm text-neutral-600 mb-6">
              {confirmModal.type === "delete"
                ? `Are you sure you want to delete the coupon "${confirmModal.coupon?.code}"? This action cannot be undone.`
                : `Are you sure you want to load and edit the coupon "${confirmModal.coupon?.code}"?`}
            </p>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: null, coupon: null })}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all active:scale-95">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 ${
                  confirmModal.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}>
                {confirmModal.type === "delete" ? "Yes, Delete" : "Yes, Edit"}
              </button>
            </div>
          </div>
        </div>
      )}

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
