import { useState, useEffect } from "react";
import {
  getCashCollections,
  createCashCollection,
  type CashCollection,
  type CreateCashCollectionData,
} from "../../../services/api/admin/adminDeliveryService";
import { getDeliveryBoys } from "../../../services/api/admin/adminDeliveryService";
import { useAuth } from "../../../context/AuthContext";

export default function AdminCashCollection() {
  const { isAuthenticated, token } = useAuth();
  const [cashCollections, setCashCollections] = useState<CashCollection[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCashCollectionData>({
    deliveryBoyId: "",
    amount: 0,
    remark: "",
  });

  const loadData = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const deliveryBoysResponse = await getDeliveryBoys({
        limit: 100,
      });
      if (deliveryBoysResponse.success) {
        setDeliveryBoys(deliveryBoysResponse.data);
      }

      const params: any = {
        page: currentPage,
        limit: entriesPerPage,
      };

      if (selectedDeliveryBoy !== "all") {
        params.deliveryBoyId = selectedDeliveryBoy;
      }

      if (fromDate) {
        params.fromDate = fromDate;
      }

      if (toDate) {
        params.toDate = toDate;
      }

      const cashResponse = await getCashCollections(params);
      if (cashResponse.success) {
        setCashCollections(cashResponse.data);
      } else {
        setError("Failed to load cash collections");
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(
        err.response?.data?.message ||
        "Failed to load data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch delivery boys and cash collections on component mount
  useEffect(() => {
    loadData();
  }, [
    isAuthenticated,
    token,
    currentPage,
    entriesPerPage,
    selectedDeliveryBoy,
    fromDate,
    toDate,
  ]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Note: Filtering is done server-side, so we just use the cashCollections as is
  const displayedCollections = cashCollections;

  // For pagination display (simplified - in real app, this would come from API)
  const totalPages = Math.ceil(displayedCollections.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;

  const handleAddCollection = async () => {
    setSubmitError(null);
    setFormData({
      deliveryBoyId: "",
      amount: 0,
      remark: "",
    });
    setShowAddModal(true);
  };

  const handleCreateCollection = async () => {
    if (!formData.deliveryBoyId || formData.amount <= 0) {
      setSubmitError("Delivery boy and amount are required.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      const response = await createCashCollection(formData);
      if (!response.success) {
        setSubmitError("Failed to create cash collection.");
        return;
      }
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || "Failed to create cash collection."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "Delivery Boy",
      "Amount Collected",
      "Remark",
      "Date",
    ];
    const csvContent = [
      headers.join(","),
      ...cashCollections.map((collection) =>
        [
          collection._id.slice(-6),
          `"${collection.deliveryBoyName}"`,
          collection.amount.toFixed(2),
          `"${collection.remark || ""}"`,
          new Date(collection.collectedAt).toLocaleDateString('en-GB'),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `cash_collections_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearDate = () => {
    setFromDate("");
    setToDate("");
  };

  const pendingCollections = deliveryBoys
    .filter(
      (boy) =>
        (boy.pendingAdminPayout && boy.pendingAdminPayout > 0) ||
        (boy.cashCollected && boy.cashCollected > 0)
    )
    .sort(
      (a, b) =>
        (b.pendingAdminPayout || b.cashCollected || 0) -
        (a.pendingAdminPayout || a.cashCollected || 0)
    );
  const totalPendingCollection = pendingCollections.reduce(
    (sum, boy) => sum + (boy.pendingAdminPayout || boy.cashCollected || 0),
    0
  );

  return (
    <div className="space-y-4 sm:space-y-6 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6">
      {/* Header Section */}
      <div className="bg-white border-b border-neutral-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
            Delivery Boy Cash Collection
          </h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-neutral-500">Dashboard</span>
            <span className="text-neutral-400">/</span>
            <span className="text-neutral-700">Cash Collection</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden mb-4 sm:mb-6">
          <div className="bg-neutral-50 border-b border-neutral-200 px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-800">
                Pending COD To Collect From Delivery Boys
              </h2>
              <span className="text-sm font-semibold text-neutral-900">
                Total Pending: ₹{totalPendingCollection.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {pendingCollections.length === 0 ? (
              <p className="text-sm text-neutral-500 italic">
                No pending COD cash with delivery boys.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-neutral-600 uppercase">Delivery Boy</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-neutral-600 uppercase">Mobile</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-neutral-600 uppercase">Pending COD</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-neutral-600 uppercase">Cash In Hand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {pendingCollections.map((boy) => (
                      <tr key={boy._id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900">{boy.name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{boy.mobile}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600">₹{(boy.pendingAdminPayout || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-900">₹{(boy.cashCollected || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          {/* Banner */}
          <div className="bg-neutral-50 border-b border-neutral-200 px-4 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-800">
              Cash Collection List
            </h2>
            <button
              onClick={handleAddCollection}
              className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-sm w-full sm:w-auto">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Cash Collection
            </button>
          </div>

          {/* Filters and Search Bar */}
          <div className="p-4 sm:p-6 border-b border-neutral-200 bg-neutral-50">
            <div className="flex flex-col gap-4">
              {/* Filter Row 1 */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                  {/* From - To Date */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">
                      Date Range:
                    </label>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFromDate(val);
                          if (toDate && val && toDate < val) {
                            setToDate("");
                          }
                        }}
                        className="flex-1 sm:flex-none px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[140px] bg-white"
                      />
                      <span className="text-neutral-500">to</span>
                      <input
                        type="date"
                        value={toDate}
                        min={fromDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!fromDate || !val || val >= fromDate) {
                            setToDate(val);
                          }
                        }}
                        className="flex-1 sm:flex-none px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[140px] bg-white"
                      />
                      <button
                        onClick={handleClearDate}
                        className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Clear dates">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Filter by Delivery Boy */}
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">
                      Delivery Boy:
                    </label>
                    <select
                      value={selectedDeliveryBoy}
                      onChange={(e) => {
                        setSelectedDeliveryBoy(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
                      <option value="all">All Delivery Boys</option>
                      {deliveryBoys.map((boy) => (
                        <option key={boy._id} value={boy._id}>
                          {boy.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Filter Row 2 */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                  {/* Per Page */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-700">
                      Show:
                    </span>
                    <select
                      value={entriesPerPage}
                      onChange={(e) => {
                        setEntriesPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1.5 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* Export Button */}
                  <button
                    onClick={handleExport}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-200">
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                    onClick={() => handleSort("id")}>
                    <div className="flex items-center gap-2">Id</div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                    onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-2">Delivery Boy</div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                    onClick={() => handleSort("amount")}>
                    <div className="flex items-center gap-2">Collected</div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                    onClick={() => handleSort("remark")}>
                    <div className="flex items-center gap-2">Remark</div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                    onClick={() => handleSort("dateTime")}>
                    <div className="flex items-center gap-2">Date & Time</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-neutral-500">
                          Loading collections...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : displayedCollections.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-neutral-500 italic">
                      No cash collections found for the current selection
                    </td>
                  </tr>
                ) : (
                  displayedCollections.map((collection) => (
                    <tr
                      key={collection._id}
                      className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-neutral-600">
                        #{collection._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-neutral-900 border-b border-transparent hover:border-primary inline-block transition-colors cursor-default">
                          {collection.deliveryBoyName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-primary">
                        ₹{collection.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 italic">
                        {collection.remark || "No remark provided"}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(collection.collectedAt).toLocaleDateString('en-GB')}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {new Date(collection.collectedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 sm:px-6 py-4 bg-white border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-neutral-600 font-medium">
              Showing{" "}
              <span className="text-neutral-900 font-bold">{startIndex + 1}</span>{" "}
              to{" "}
              <span className="text-neutral-900 font-bold">
                {Math.min(endIndex, cashCollections.length)}
              </span>{" "}
              of{" "}
              <span className="text-neutral-900 font-bold">
                {cashCollections.length}
              </span>{" "}
              entries
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs sm:text-sm text-neutral-600">
        Copyright © {new Date().getFullYear()}. Developed By{" "}
        <a href="#" className="font-semibold text-primary hover:text-neutral-900 transition-colors">
          Healthy Delight
        </a>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Add Cash Collection
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Delivery Boy
                </label>
                <select
                  value={formData.deliveryBoyId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, deliveryBoyId: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm"
                >
                  <option value="">Select delivery boy</option>
                  {deliveryBoys.map((boy) => (
                    <option key={boy._id} value={boy._id}>
                      {boy.name} ({boy.mobile})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))
                  }
                  placeholder="Enter collected amount"
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Remark (Optional)
                </label>
                <input
                  type="text"
                  value={formData.remark || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, remark: e.target.value }))
                  }
                  placeholder="Any notes"
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm"
                />
              </div>
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded text-sm"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                className="px-4 py-2 bg-neutral-900 text-white rounded text-sm"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
