import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import {
  getWalletTransactions,
  createManualFundTransfer,
} from '../../../services/api/admin/adminWalletService';
import {
  getDeliveryBoys,
  DeliveryBoy,
} from '../../../services/api/admin/adminDeliveryService';

const shortenReferenceId = (ref: string) => {
  if (!ref) return '';
  const parts = ref.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parts[2]}`;
  }
  if (parts.length === 2) {
    return `${parts[0]}-${parts[1].slice(-8)}`;
  }
  if (ref.length > 12) {
    return ref.slice(-8).toUpperCase();
  }
  return ref;
};

export default function AdminFundTransfer() {
  const { showToast } = useToast();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // API Data States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [deliveryBoysList, setDeliveryBoysList] = useState<DeliveryBoy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Add Fund Modal States
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [formDeliveryBoy, setFormDeliveryBoy] = useState('');
  const [formType, setFormType] = useState<'Credit' | 'Debit'>('Credit');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Active Delivery Boys for filters and modal dropdown
  useEffect(() => {
    const fetchDeliveryBoys = async () => {
      try {
        const res = await getDeliveryBoys({ limit: 1000, status: 'Active' });
        if (res.success && res.data) {
          setDeliveryBoysList(res.data);
        }
      } catch (err) {
        console.error('Failed to load active delivery boys', err);
      }
    };
    fetchDeliveryBoys();
  }, []);

  // Fetch Transactions matching criteria
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: entriesPerPage,
        userType: 'DELIVERY_BOY',
      };
      if (selectedDeliveryBoy !== 'all') {
        params.userId = selectedDeliveryBoy;
      }
      if (selectedMethod !== 'all') {
        params.type = selectedMethod;
      }
      if (fromDate) {
        params.dateFrom = fromDate;
      }
      if (toDate) {
        params.dateTo = toDate;
      }
      const res = await getWalletTransactions(params);
      if (res.success && res.data) {
        setTransactions(res.data);
        if (res.pagination) {
          setTotalEntries(res.pagination.total || res.data.length);
          setTotalPages(res.pagination.pages || 1);
        } else {
          setTotalEntries(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to load wallet transactions', err);
      showToast('Failed to load wallet transactions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, entriesPerPage, selectedDeliveryBoy, selectedMethod, fromDate, toDate]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleAddFundTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeliveryBoy) {
      showToast('Please select a delivery boy', 'error');
      return;
    }
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return;
    }
    if (!formDescription.trim()) {
      showToast('Please enter remarks/message', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createManualFundTransfer({
        userId: formDeliveryBoy,
        userType: 'DELIVERY_BOY',
        amount: amountNum,
        type: formType,
        description: formDescription,
      });

      if (res.success) {
        showToast('Fund transfer processed successfully', 'success');
        setIsOpenModal(false);
        setFormDeliveryBoy('');
        setFormAmount('');
        setFormDescription('');
        setFormType('Credit');
        // Refresh transactions list
        fetchTransactions();
      } else {
        showToast(res.message || 'Failed to process fund transfer', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to process fund transfer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side search matching username, mobile, reference, or description
  const filteredTransfers = transactions.filter(t => {
    const term = searchTerm.toLowerCase();
    const userName = (t.userName || '').toLowerCase();
    const mobile = (t.userId?.mobile || '').toLowerCase();
    const reference = (t.reference || '').toLowerCase();
    const description = (t.description || '').toLowerCase();
    return (
      userName.includes(term) ||
      mobile.includes(term) ||
      reference.includes(term) ||
      description.includes(term)
    );
  });

  // Pre-calculate chronological running balances per user, starting from their current real-time balance
  const computedBalances = new Map<string, { opening: number; closing: number }>();
  const userBalances = new Map<string, number>();

  transactions.forEach((t) => {
    const uId = t.userId?._id?.toString() || 'unknown';
    if (!userBalances.has(uId)) {
      userBalances.set(uId, t.userId?.balance || 0);
    }
    const closing = userBalances.get(uId)!;
    const opening = closing - (t.type === 'Credit' ? t.amount : -t.amount);
    
    computedBalances.set(t._id.toString(), { opening, closing });
    userBalances.set(uId, opening);
  });

  // Client-side sorting support
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn];
    let bVal: any = b[sortColumn];

    if (sortColumn === 'name') {
      aVal = a.userName;
      bVal = b.userName;
    } else if (sortColumn === 'mobile') {
      aVal = a.userId?.mobile || '';
      bVal = b.userId?.mobile || '';
    } else if (sortColumn === 'openingBalance') {
      const aCalc = computedBalances.get(a._id.toString()) || { opening: 0 };
      const bCalc = computedBalances.get(b._id.toString()) || { opening: 0 };
      aVal = aCalc.opening;
      bVal = bCalc.opening;
    } else if (sortColumn === 'closingBalance') {
      const aCalc = computedBalances.get(a._id.toString()) || { closing: 0 };
      const bCalc = computedBalances.get(b._id.toString()) || { closing: 0 };
      aVal = aCalc.closing;
      bVal = bCalc.closing;
    } else if (sortColumn === 'date') {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleExport = () => {
    // Generate simple CSV export
    if (sortedTransfers.length === 0) {
      showToast('No transaction data to export', 'info');
      return;
    }
    const headers = ['Transaction ID', 'Name', 'Mobile', 'Wallet Balance', 'Amount', 'Type', 'Description', 'Date'];
    const rows = sortedTransfers.map((t, idx) => {
      const calculated = computedBalances.get(t._id.toString()) || { opening: 0, closing: 0 };
      return [
        t.reference || t._id,
        t.userName,
        t.userId?.mobile || '',
        `₹${calculated.closing.toFixed(2)}`,
        `₹${t.amount.toFixed(2)}`,
        t.type,
        t.description,
        new Date(t.createdAt).toLocaleDateString('en-GB'),
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Delivery_Boy_Fund_Transfers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transactions exported successfully', 'success');
  };

  const handleClearDate = () => {
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const methods = ['All', 'Credit', 'Debit'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-neutral-50 border border-neutral-200 px-4 sm:px-6 py-4 rounded-t-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-neutral-800 text-xl sm:text-2xl font-semibold">View Fund Transfer</h1>
        <button
          onClick={() => setIsOpenModal(true)}
          className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <label className="text-sm text-neutral-700 whitespace-nowrap">From - To Date:</label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none">
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none">
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

              {/* Filter by Delivery Boy */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">Filter by Delivery Boy:</label>
                <select
                  value={selectedDeliveryBoy}
                  onChange={(e) => {
                    setSelectedDeliveryBoy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[180px]"
                >
                  <option value="all">All Delivery Boys</option>
                  {deliveryBoysList.map((boy) => (
                    <option key={boy._id} value={boy._id}>
                      {boy.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Method */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">Filter by Method:</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[100px]"
                >
                  {methods.map((method) => (
                    <option key={method} value={method === 'All' ? 'all' : method}>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}

          <table className="w-full min-w-[1200px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('reference')}
                >
                  <div className="flex items-center gap-2">
                    Reference ID
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Name
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('mobile')}
                >
                  <div className="flex items-center gap-2">
                    Mobile
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('closingBalance')}
                >
                  <div className="flex items-center gap-2">
                    Wallet Balance (₹)
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-2">
                    Amount (₹)
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Remarks / Message
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {sortedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                    No transactions available
                  </td>
                </tr>
              ) : (
                sortedTransfers.map((t) => {
                  const calculated = computedBalances.get(t._id.toString()) || { opening: 0, closing: 0 };
                  return (
                    <tr key={t._id} className="hover:bg-neutral-50">
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-mono font-medium" title={t.reference || t._id}>
                        {shortenReferenceId(t.reference || t._id)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">{t.userName}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">{t.userId?.mobile || 'N/A'}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-semibold">₹{calculated.closing.toFixed(2)}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-semibold">₹{t.amount.toFixed(2)}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          t.type === 'Credit' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600 max-w-[250px] truncate" title={t.description}>{t.description}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">{new Date(t.createdAt).toLocaleDateString('en-GB')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-neutral-700">
            Showing {Math.min(totalEntries, (currentPage - 1) * entriesPerPage + 1)} to {Math.min(totalEntries, currentPage * entriesPerPage)} of {totalEntries} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${
                currentPage === 1 || totalPages === 0
                  ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
              aria-label="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-sm font-medium text-neutral-700 px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 border border-neutral-300 rounded ${
                currentPage === totalPages || totalPages === 0
                  ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
              aria-label="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddFundTransfer} className="p-6 space-y-4">
              {/* Delivery Boy */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">Delivery Boy <span className="text-red-500">*</span></label>
                <select
                  value={formDeliveryBoy}
                  onChange={(e) => setFormDeliveryBoy(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm bg-white"
                  required
                >
                  <option value="">Select Delivery Boy</option>
                  {deliveryBoysList.map((boy) => (
                    <option key={boy._id} value={boy._id}>
                      {boy.name} ({boy.mobile}) - Balance: ₹{(boy.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Type */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('Credit')}
                    className={`py-2 text-sm font-semibold rounded border transition-all ${
                      formType === 'Credit'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    Credit (Add Balance)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('Debit')}
                    className={`py-2 text-sm font-semibold rounded border transition-all ${
                      formType === 'Debit'
                        ? 'bg-rose-50 border-rose-500 text-rose-600'
                        : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    Debit (Deduct Balance)
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">Amount (₹) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 text-sm">₹</span>
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
                <label className="block text-sm font-medium text-neutral-700">Message / Remarks <span className="text-red-500">*</span></label>
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
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Submit Transfer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-neutral-500 py-4">
        Copyright © {new Date().getFullYear()}. Developed By{' '}
        <a href="#" className="text-primary hover:text-primary-dark">
          Healthy Delight
        </a>
      </div>
    </div>
  );
}
