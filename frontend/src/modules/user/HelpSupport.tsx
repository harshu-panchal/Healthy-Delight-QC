import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getCustomerFAQs, CustomerFAQ } from "../../services/api/customerService";
import logo from "../../../assets/logo.png";

export default function HelpSupport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [faqs, setFaqs] = useState<CustomerFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchFAQs = async () => {
      if (!user) {
        setError("Please login to view FAQs");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const response = await getCustomerFAQs();
        if (response.success) {
          setFaqs(response.data || []);
        } else {
          setError(response.message || "Failed to load FAQs");
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          setError("Please login to view FAQs");
        } else {
          setError(err?.response?.data?.message || "Failed to load FAQs");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, [user]);

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
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
              Help & Support
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

      <div className="px-5 md:px-10 py-6 max-w-2xl mx-auto w-full">
        {/* Contact Info Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <a
            href="tel:+919740234199"
            className="bg-white rounded-3xl border border-neutral-100 p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-full bg-[#0a193b]/5 text-[#0a193b] flex items-center justify-center mb-4 border border-[#0a193b]/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#0a193b] mb-1">Call Us</h3>
            <p className="text-xs text-neutral-500 font-bold">+91 9740234199</p>
          </a>

          <a
            href="mailto:support@healthydelight.com"
            className="bg-white rounded-3xl border border-neutral-100 p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-full bg-[#0a193b]/5 text-[#0a193b] flex items-center justify-center mb-4 border border-[#0a193b]/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#0a193b] mb-1">Email Us</h3>
            <p className="text-xs text-neutral-500 font-bold break-all">support@healthydelight.com</p>
          </a>
        </div>

        {/* FAQ Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[#0a193b] mb-4">Frequently Asked Questions</h2>
          
          {loading && (
            <div className="bg-white rounded-3xl border border-neutral-100 p-6 text-center text-neutral-500">
              Loading FAQs...
            </div>
          )}

          {!loading && error && (
            <div className="bg-white rounded-3xl border border-neutral-100 p-6 text-center">
              <p className="text-neutral-500 mb-3">{error}</p>
              {!user && (
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 text-xs font-bold bg-[#0a193b] text-white rounded-2xl shadow-md hover:bg-[#07122b] transition-all"
                >
                  Sign In to view FAQs
                </button>
              )}
            </div>
          )}

          {!loading && !error && faqs.length === 0 && (
            <div className="bg-white rounded-3xl border border-neutral-100 p-6 text-center text-neutral-500">
              No FAQs available at the moment.
            </div>
          )}

          {!loading && !error && faqs.length > 0 && (
            <div className="space-y-3">
              {faqs.map((item) => {
                const isOpen = openItems.has(item._id);
                return (
                  <div
                    key={item._id}
                    className="bg-white rounded-2xl border border-neutral-100 overflow-hidden transition-all shadow-sm"
                  >
                    <button
                      onClick={() => toggleItem(item._id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors text-left"
                    >
                      <span className="text-sm font-bold text-[#0a193b] pr-4">
                        {item.question}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-0">
                        <p className="text-xs text-neutral-500 font-semibold leading-relaxed border-t border-neutral-50 pt-3">
                          {item.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legal Policies Card */}
        <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm">
          <h4 className="text-[10px] font-black text-[#0a193b]/40 uppercase tracking-[0.2em] mb-4">
            LEGAL
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
            <button
              onClick={() => navigate("/terms-of-service")}
              className="flex items-center gap-3 text-left hover:text-[#0a193b] text-neutral-700 transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#0a193b] transition-colors">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-xs font-bold">Terms & Conditions</span>
            </button>

            <button
              onClick={() => navigate("/privacy-policy")}
              className="flex items-center gap-3 text-left hover:text-[#0a193b] text-neutral-700 transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#0a193b] transition-colors">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-xs font-bold">Privacy Policy</span>
            </button>

            <button
              onClick={() => navigate("/refund-policy")}
              className="flex items-center gap-3 text-left hover:text-[#0a193b] text-neutral-700 transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#0a193b] transition-colors">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-xs font-bold">Refund Policy</span>
            </button>

            <button
              onClick={() => navigate("/return-policy")}
              className="flex items-center gap-3 text-left hover:text-[#0a193b] text-neutral-700 transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#0a193b] transition-colors">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-xs font-bold">Return Policy</span>
            </button>

            <button
              onClick={() => navigate("/shipping-policy")}
              className="flex items-center gap-3 text-left hover:text-[#0a193b] text-neutral-700 transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#0a193b] transition-colors">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-xs font-bold">Shipping Policy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
