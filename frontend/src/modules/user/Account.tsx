import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  CustomerProfile,
} from "../../services/api/customerService";
import logo from "../../../assets/logo.png";

export default function Account() {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGstModal, setShowGstModal] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
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
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getProfile();
        if (response.success) {
          setProfile(response.data);
        } else {
          setError("Failed to load profile");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load profile");
        if (err.response?.status === 401) {
          authLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user, navigate, authLogout]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleLogout = () => {
    authLogout();
    navigate("/login");
  };

  const handleGstSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowGstModal(false);
  };

  // Show login/signup prompt for unregistered users
  if (!user) {
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
                Account Info
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

        <div className="px-4 md:px-6 lg:px-8 pt-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-4 border border-neutral-200 shadow-xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-[#0a193b] mb-2 tracking-tight">
              Welcome!
            </h2>
            <p className="text-sm text-neutral-500 font-medium text-center max-w-[240px]">
              Login to access your profile, orders, and more
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <button
              onClick={() => navigate("/login")}
              className="w-full py-4 rounded-2xl font-black text-base bg-[#0a193b] text-white hover:bg-[#07122b] transition-all shadow-xl shadow-[#0a193b]/10 active:scale-[0.98] tracking-widest uppercase"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a193b] mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-[#0a193b] text-white rounded-xl font-semibold shadow-md">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || "User";
  const displayPhone = profile?.phone || user?.phone || "";
  const displayDateOfBirth = profile?.dateOfBirth;

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
              Account Info
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

      <div className="px-4 md:px-6 lg:px-8 mt-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-4 border border-neutral-200 shadow-xl relative overflow-hidden group">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-[#0a193b] mb-2 tracking-tight uppercase">
            {displayName}
          </h2>
          <div className="flex flex-col items-center gap-1.5 md:gap-2 text-[13px] text-neutral-500 font-bold uppercase tracking-widest leading-none">
            {displayPhone && (
              <div className="flex items-center gap-1.5 bg-[#0a193b]/5 px-3 py-1 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>{displayPhone}</span>
              </div>
            )}
            {displayDateOfBirth && (
              <div className="flex items-center gap-1.5 opacity-60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{formatDate(displayDateOfBirth)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-2xl md:mx-auto mb-8">
          <button
            onClick={() => navigate("/orders")}
            className="bg-white rounded-2xl border border-neutral-100 p-4 hover:shadow-xl transition-all text-center flex flex-col items-center group active:scale-95"
          >
            <div className="w-12 h-12 rounded-xl bg-[#0a193b]/5 flex items-center justify-center text-[#0a193b] mb-2 group-hover:bg-[#0a193b] group-hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div className="text-[11px] font-black uppercase text-[#0a193b] tracking-widest">
              My Orders
            </div>
          </button>
          <button
            onClick={() => navigate("/faq")}
            className="bg-white rounded-2xl border border-neutral-100 p-4 hover:shadow-xl transition-all text-center flex flex-col items-center group active:scale-95"
          >
            <div className="w-12 h-12 rounded-xl bg-[#0a193b]/5 flex items-center justify-center text-[#0a193b] mb-2 group-hover:bg-[#0a193b] group-hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="text-[11px] font-black uppercase text-[#0a193b] tracking-widest">
              Support
            </div>
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-[11px] font-black text-[#0a193b] mb-3 uppercase tracking-[0.2em] opacity-60 px-2">
            Your Premium Portal
          </h2>
          <div className="bg-white rounded-[24px] border border-neutral-100 overflow-hidden shadow-sm">
            <button
              onClick={() => navigate("/address-book")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:text-[#0a193b]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-[#0a193b]">Address Book</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate("/wishlist")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-[#0a193b]">Your Wishlist</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setShowGstModal(true)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-[#0a193b]">GST Details</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate("/about-us")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-[#0a193b]">About Healthy Delight</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-5 py-5 hover:bg-red-50/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-red-600">Sign Out</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center py-6">
          <p className="text-[10px] font-black text-[#0a193b]/30 uppercase tracking-[0.3em] mb-3">
            v2.1.0 • Purity Daily Delivered
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            <span className="text-[11px] font-bold text-neutral-400 lowercase tracking-wider">
              {new Date().getFullYear()} Healthy Delight Portal
            </span>
          </div>
        </div>
      </div>

      {showGstModal && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-[#0a193b]/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowGstModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="bg-white rounded-t-[32px] shadow-2xl max-w-lg mx-auto p-6 pt-10 relative">
              <button
                onClick={() => setShowGstModal(false)}
                className="absolute -top-12 right-4 w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="text-center">
                <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-[#0a193b]/5 border border-[#0a193b]/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#0a193b]" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
                    <line x1="9" y1="7" x2="15" y2="7" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                    <line x1="9" y1="15" x2="13" y2="15" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-[#0a193b] mb-2 tracking-tight">
                  Add GST Details
                </h3>
                <p className="text-[13px] text-neutral-500 font-medium mb-8 px-4 leading-relaxed">
                  Identify your business to receive GST-compliant invoices on your organic purchases.
                </p>
                <form onSubmit={handleGstSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="Enter GST Number"
                    className="w-full rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-4 text-[15px] font-bold text-[#0a193b] placeholder-neutral-400 focus:outline-none focus:ring-4 focus:ring-[#0a193b]/5 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!gstNumber.trim()}
                    className="w-full rounded-2xl bg-[#0a193b] text-white font-black py-4 hover:bg-[#07122b] disabled:opacity-50 transition-all shadow-xl shadow-[#0a193b]/10 uppercase tracking-widest text-sm active:scale-[0.98]"
                  >
                    Authenticate GST
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
