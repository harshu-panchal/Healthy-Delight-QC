import { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import {
  getSellerTransactions,
  getWalletTransactions,
  createManualFundTransfer,
  type SellerTransaction,
} from "../../../services/api/admin/adminWalletService";
import { getAllSellers as getSellers } from "../../../services/api/sellerService";
import { useAuth } from "../../../context/AuthContext";

interface Transaction {
  id: string;
  sellerName: string;
  sellerId: string;
  amount: number;
  flag: string;
  date: string;
  type: string;
  status: string;
  remark?: string;
}

interface Seller {
  _id: string;
  sellerName: string;
  storeName: string;
  balance?: number;
}

export default function AdminSellerTransaction() {
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useToast();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // API Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Fund Modal States
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [formSeller, setFormSeller] = useState("");
  const [formType, setFormType] = useState<"Credit" | "Debit">("Credit");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch approved sellers on mount
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    const fetchSellers = async () => {
      try {
        const response = await getSellers({ status: "Approved" });
        if (response.success && response.data) {
          setSellers(
            response.data.map((seller) => ({
              _id: seller._id,
              sellerName: seller.sellerName,
              storeName: seller.storeName,
              balance: seller.balance,
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching sellers:", err);
        setError("Failed to load sellers");
      }
    };

    fetchSellers();
  }, [isAuthenticated, token]);

  // Fetch Transactions matching criteria
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      let dataToProcess = [];
      if (selectedSeller === "all") {
        const response = await getWalletTransactions({
          page: currentPage,
          limit: 100, // Fetch a good chunk for search/filtering
          userType: "SELLER",
          type: selectedMethod !== "all" ? selectedMethod : undefined,
          dateFrom: fromDate || undefined,
          dateTo: toDate || undefined,
        });
        if (response.success && response.data) {
          dataToProcess = response.data;
        }
      } else {
        const response = await getSellerTransactions(selectedSeller, {
          page: currentPage,
          limit: entriesPerPage,
        });
        if (response.success && response.data) {
          dataToProcess = response.data;
        }
      }

      const mappedTransactions: Transaction[] = dataToProcess.map((tx: any) => {
        const sellerObj = sellers.find(
          (s) => s._id === (tx.userId?._id || tx.userId)
        );
        return {
          id: tx.reference || tx._id || tx.id,
          sellerName: tx.userName || sellerObj?.sellerName || "Unknown Seller",
          sellerId: tx.userId?._id || tx.userId,
          amount: tx.amount,
          flag: tx.type ? tx.type.toLowerCase() : "credit",
          date: tx.createdAt || tx.date,
          type: tx.type || (tx.type ? tx.type : "Credit"),
          status: tx.status,
          remark: tx.description || tx.remark,
        };
      });
      setTransactions(mappedTransactions);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to load transactions. Please try again.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token && (selectedSeller !== "all" || sellers.length > 0)) {
      fetchTransactions();
    }
  }, [
    selectedSeller,
    selectedMethod,
    fromDate,
    toDate,
    currentPage,
    entriesPerPage,
    sellers,
    isAuthenticated,
    token,
  ]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleAddFundTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSeller) {
      showToast("Please select a seller", "error");
      return;
    }
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Please enter a valid amount greater than 0", "error");
      return;
    }
    if (!formDescription.trim()) {
      showToast("Please enter remarks/message", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createManualFundTransfer({
        userId: formSeller,
        userType: "SELLER",
        amount: amountNum,
        type: formType,
        description: formDescription,
      });

      if (res.success) {
        showToast("Fund transfer processed successfully", "success");
        setIsOpenModal(false);
        setFormSeller("");
        setFormAmount("");
        setFormDescription("");
        setFormType("Credit");
        // Reload transactions
        fetchTransactions();
      } else {
        showToast(res.message || "Failed to process fund transfer", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Failed to process fund transfer",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.remark &&
        transaction.remark.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort transactions
  if (sortColumn) {
    filteredTransactions.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "sellerName":
          aValue = a.sellerName;
          bValue = b.sellerName;
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(filteredTransactions.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const displayedTransactions = filteredTransactions.slice(
    startIndex,
    endIndex
  );

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      showToast("No transaction data to export", "info");
      return;
    }
    const headers = ["Transaction ID", "Seller Name", "Amount", "Type", "Description", "Date"];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.sellerName,
      `₹${t.amount.toFixed(2)}`,
      t.type,
      t.remark || "",
      new Date(t.date).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Seller_Fund_Transfers_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Transactions exported successfully", "success");
  };

  const handleClearDate = () => {
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const methods = ["All", "Credit", "Debit"];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-neutral-50 border border-neutral-200 px-4 sm:px-6 py-4 rounded-t-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-neutral-800 text-xl sm:text-2xl font-semibold">
          View Fund Transfer
        </h1>
        <button
          onClick={() => setIsOpenModal(true)}
          className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Fund Transfer
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Left Side Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
              {/* From - To Date */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  From - To Date:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[140px]"
                    />
                  </div>
                  <span className="text-neutral-500">-</span>
                  <div className="relative">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[140px]"
                    />
                  </div>
                  <button
                    onClick={handleClearDate}
                    className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded text-sm transition-all active:scale-95 shadow-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filter by Seller */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  Filter by Seller:
                </label>
                <select
                  value={selectedSeller}
                  onChange={(e) => {
                    setSelectedSeller(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[180px] disabled:bg-neutral-100 disabled:cursor-not-allowed"
                >
                  <option value="all">All Sellers</option>
                  {sellers.map((seller) => (
                    <option key={seller._id} value={seller._id}>
                      {seller.sellerName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Method */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  Filter by Method:
                </label>
                <select
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[100px]"
                >
                  {methods.map((method) => (
                    <option key={method} value={method === "All" ? "all" : method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Per Page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-700">Per Page:</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>

              {/* Search */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700">Search:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search ledger..."
                  className="px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[150px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
              <svg
                className="animate-spin h-8 w-8 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}

          <table className="w-full min-w-[800px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center gap-2">
                    Reference ID
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400"
                    >
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("sellerName")}
                >
                  <div className="flex items-center gap-2">
                    Seller Name
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400"
                    >
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Type
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center gap-2">
                    Amount (₹)
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400"
                    >
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Remarks / Message
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400"
                    >
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {error ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-neutral-50">
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-mono font-medium">
                      {transaction.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">
                      {transaction.sellerName}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          transaction.type === "Credit"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-semibold">
                      ₹{transaction.amount.toFixed(2)}
                    </td>
                    <td
                      className="px-4 sm:px-6 py-3 text-sm text-neutral-600 max-w-[300px] truncate"
                      title={transaction.remark}
                    >
                      {transaction.remark || "N/A"}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-neutral-700">
            Showing {Math.min(filteredTransactions.length, startIndex + 1)} to{" "}
            {Math.min(filteredTransactions.length, endIndex)} of{" "}
            {filteredTransactions.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${
                currentPage === 1 || totalPages === 0
                  ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
              aria-label="Previous page"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="text-sm font-medium text-neutral-700 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${
                currentPage === totalPages || totalPages === 0
                  ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
              aria-label="Next page"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
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

      {/* Add Fund Transfer Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-800">Add Fund Transfer</h2>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-all"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddFundTransfer} className="p-6 space-y-4">
              {/* Seller Selection */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">
                  Seller <span className="text-red-500">*</span>
                </label>
                <select
                  value={formSeller}
                  onChange={(e) => setFormSeller(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm bg-white"
                  required
                >
                  <option value="">Select Seller</option>
                  {sellers.map((seller) => (
                    <option key={seller._id} value={seller._id}>
                      {seller.sellerName} ({seller.storeName}) - Balance: ₹
                      {(seller.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Type */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType("Credit")}
                    className={`py-2 text-sm font-semibold rounded border transition-all ${
                      formType === "Credit"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    Credit (Add Balance)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("Debit")}
                    className={`py-2 text-sm font-semibold rounded border transition-all ${
                      formType === "Debit"
                        ? "bg-rose-50 border-rose-500 text-rose-600"
                        : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    Debit (Deduct Balance)
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                    required
                    min="0.01"
                  />
                </div>
              </div>

              {/* Remarks / Description */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">
                  Message / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Reason for manual adjustment (e.g. Incentive, Cash collection correction)"
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-none"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Submit Transfer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-neutral-500 py-4">
        Copyright © {new Date().getFullYear()}. Developed By{" "}
        <a href="#" className="text-primary hover:text-primary-dark">
          Healthy Delight
        </a>
      </div>
    </div>
  );
}
