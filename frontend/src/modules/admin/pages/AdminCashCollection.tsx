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
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch delivery boys and cash collections on component mount
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch delivery boys for the dropdown
        const deliveryBoysResponse = await getDeliveryBoys({
          status: "Active",
          limit: 100,
        });
        if (deliveryBoysResponse.success) {
          setDeliveryBoys(deliveryBoysResponse.data);
        }

        // Fetch cash collections
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

        if (searchTerm) {
          params.search = searchTerm;
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

    fetchData();
  }, [
    isAuthenticated,
    token,
    currentPage,
    entriesPerPage,
    selectedDeliveryBoy,
    fromDate,
    toDate,
    searchTerm,
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
    // For now, just show an alert. In a real app, this would open a modal to add a cash collection
    alert("Add cash collection functionality would be implemented here");
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "Delivery Boy",
      "Order ID",
      "Total",
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
          collection.orderId,
          collection.total.toFixed(2),
          collection.amount.toFixed(2),
          `"${collection.remark || ""}"`,
          new Date(collection.collectedAt).toLocaleDateString(),
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

  const methods = ["All", "Cash", "Card", "Online"];

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
                        onChange={(e) => setFromDate(e.target.value)}
                        className="flex-1 sm:flex-none px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[140px] bg-white"
                      />
                      <span className="text-neutral-500">to</span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
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
                  {/* Filter by Method */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">
                      Method:
                    </label>
                    <select
                      value={selectedMethod}
                      onChange={(e) => {
                        setSelectedMethod(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[120px]">
                      {methods.map((method) => (
                        <option
                          key={method}
                          value={method === "All" ? "all" : method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

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
                  {/* Search */}
                  <div className="relative flex-1 sm:min-w-[250px]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search collection info..."
                      className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                    />
                  </div>

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
                    onClick={() => handleSort("orderId")}>
                    <div className="flex items-center gap-2">Order ID</div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                    onClick={() => handleSort("total")}>
                    <div className="flex items-center gap-2">Order Total</div>
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
                    <td colSpan={7} className="px-6 py-12 text-center">
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
                      colSpan={7}
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
                      <td className="px-6 py-4 text-sm text-neutral-700">
                        {collection.orderId}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500">
                        ₹{collection.total.toFixed(2)}
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
                            {new Date(collection.collectedAt).toLocaleDateString()}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`flex items-center gap-2 px-4 py-2 border-2 rounded transition-all active:scale-95 text-sm font-medium ${
                  currentPage === 1 || totalPages === 0
                    ? "border-neutral-200 text-neutral-400 cursor-not-allowed bg-neutral-50"
                    : "border-primary text-primary hover:bg-primary hover:text-white"
                }`}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5">
                  <path d="M15 18L9 12L15 6" />
                </svg>
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className={`flex items-center gap-2 px-4 py-2 border-2 rounded transition-all active:scale-95 text-sm font-medium ${
                  currentPage === totalPages || totalPages === 0
                    ? "border-neutral-200 text-neutral-400 cursor-not-allowed bg-neutral-50"
                    : "border-primary text-primary hover:bg-primary hover:text-white"
                }`}>
                Next
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5">
                  <path d="M9 18L15 12L9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs sm:text-sm text-neutral-600">
        Copyright © 2025. Developed By{" "}
        <a href="#" className="font-semibold text-primary hover:text-neutral-900 transition-colors">
          Healthy Delight
        </a>
      </div>
    </div>
  );
}
