import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomerWalletTransactions, CustomerWalletTransaction } from "../../services/api/customerWalletService";
import { getProfile } from "../../services/api/customerService";
import logo from "../../../assets/logo.png";

const formatOrderFriendly = (orderNumber?: string, orderId?: string) => {
  if (orderNumber && orderNumber !== 'N/A') {
    if (orderNumber.startsWith('ORD')) {
      const numericPart = orderNumber.replace('ORD', '');
      if (numericPart.length > 6) {
        return `ORD-${numericPart.slice(-6)}`;
      }
      return orderNumber;
    }
    return orderNumber.length > 10 ? orderNumber.slice(0, 8) : orderNumber;
  }
  if (orderId) {
    const cleanId = orderId.includes('-') ? orderId.split('-').slice(-1)[0] : orderId;
    if (cleanId.length > 6) {
      return `ORD-${cleanId.slice(-6).toUpperCase()}`;
    }
    return `ORD-${cleanId.toUpperCase()}`;
  }
  return 'Unknown';
};

const getFormattedRemark = (remark?: string) => {
  if (!remark) return "";
  const ordMatch = remark.match(/#ORD\d+/);
  if (ordMatch) {
    const fullOrd = ordMatch[0].replace("#", "");
    const shortOrd = formatOrderFriendly(fullOrd);
    return remark.replace(ordMatch[0], `#${shortOrd}`);
  }
  return remark;
};

export default function WalletHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CustomerWalletTransaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);

  // Scroll Listener for Dynamic Header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setLoading(true);
        setError("");
        const [profileRes, txRes] = await Promise.all([
          getProfile(),
          getCustomerWalletTransactions()
        ]);

        if (profileRes.success) {
          setWalletBalance(profileRes.data.walletAmount);
        }
        if (txRes.success) {
          setTransactions(txRes.data);
        } else {
          setError("Failed to load transactions.");
        }
      } catch (err: any) {
        console.error("Wallet history error:", err);
        setError(err.response?.data?.message || "Failed to load wallet ledger.");
      } finally {
        setLoading(false);
      }
    };

    loadWalletData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="pb-24 md:pb-8 bg-transparent min-h-screen relative flex flex-col pt-[100px]">
      {/* Premium Fixed Header */}
      <header
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: isHeaderSolid
            ? "#0a193b"
            : "linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.9) 30%, rgba(10, 25, 59, 0.7) 60%, rgba(10, 25, 59, 0.4) 85%, rgba(252, 250, 247, 0) 100%)",
          boxShadow: isHeaderSolid ? "0 12px 24px rgba(0,0,0,0.12)" : "none",
          paddingBottom: "16px",
          borderBottomLeftRadius: isHeaderSolid ? "20px" : "0px",
          borderBottomRightRadius: isHeaderSolid ? "20px" : "0px",
        }}
      >
        <div className="px-5 md:px-10 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all"
              aria-label="Back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
              Wallet History
            </h1>
          </div>
          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-105" />
          </div>
        </div>
      </header>

      {/* Brand Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8f6f2] to-[#f6f1e6] -z-10" />
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none -z-5" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }}></div>

      <div className="px-4 md:px-6 lg:px-8 max-w-2xl mx-auto w-full mt-6">
        {/* Dynamic Balance Mini Card */}
        <div className="bg-white rounded-3xl border border-neutral-100 p-5 flex items-center justify-between shadow-sm mb-6">
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">
              Current Balance
            </p>
            <p className="text-2xl font-black text-[#0a193b]">
              ₹{walletBalance.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>
        </div>

        <h2 className="text-[11px] font-black text-[#0a193b] mb-4 uppercase tracking-[0.2em] opacity-60 px-2">
          Transaction Ledger
        </h2>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a193b] mx-auto mb-4"></div>
            <p className="text-sm text-neutral-500 font-semibold">Loading transaction ledger...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-5 text-center text-red-600 text-sm font-semibold">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white border border-neutral-100 rounded-3xl p-8 text-center text-neutral-500 shadow-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-neutral-300">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm font-bold text-neutral-700">No transactions yet</p>
            <p className="text-[11px] text-neutral-400 mt-1 font-semibold">Every credit and debit will be securely tracked in this audit ledger.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = tx.type === "Credit";
              return (
                <div key={tx._id} className="bg-white rounded-3xl border border-neutral-100 p-6 md:p-7 shadow-sm flex items-start gap-4">
                  {/* Icon Indicator */}
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                    isCredit ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"
                  }`}>
                    {isCredit ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </svg>
                    )}
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-black text-neutral-900 leading-snug">
                        {getFormattedRemark(tx.remark) || (isCredit ? "Manual credit" : "Wallet Debit")}
                      </h4>
                      <span className={`text-sm font-black whitespace-nowrap ${
                        isCredit ? "text-green-600" : "text-rose-600"
                      }`}>
                        {isCredit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase">
                        {formatDate(tx.createdAt)}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-neutral-300" />
                      <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">
                        {tx.source}
                      </span>
                      {tx.orderId && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-neutral-300" />
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wide flex items-center gap-1">
                            {typeof tx.orderId === 'object' ? (
                              <>
                                <span className="text-blue-600 font-extrabold">
                                  #{formatOrderFriendly(tx.orderId.orderNumber, tx.orderId.orderId || tx.orderId._id)}
                                </span>
                                {tx.orderId.items && tx.orderId.items.length > 0 && (
                                  <span className="text-neutral-500">
                                    • {tx.orderId.items.map((item: any) => `${item.productName} (${item.variation || item.variantTitle || "Default"})`).join(", ")}
                                  </span>
                                )}
                              </>
                            ) : (
                              `Order: ${tx.orderId}`
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
