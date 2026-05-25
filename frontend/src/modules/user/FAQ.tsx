import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCustomerFAQs, CustomerFAQ } from "../../services/api/customerService";

export default function FAQ() {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [faqs, setFaqs] = useState<CustomerFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFAQs = async () => {
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
          setError("Please login to view FAQs.");
        } else {
          setError(err?.response?.data?.message || "Failed to load FAQs.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, []);

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
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      <div className="bg-gradient-to-b from-[#0a193b] via-[#0a193b]/30 to-white pb-6 md:pb-8 pt-4 md:pt-6">
        <div className="px-4 md:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-white"
            aria-label="Back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex flex-col items-center mb-4 md:mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white flex items-center justify-center mb-3 md:mb-4 border-2 border-white shadow-sm">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                className="text-[#0a193b] md:w-12 md:h-12">
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
              Frequently Asked Questions
            </h1>
            <p className="text-sm md:text-base text-neutral-600 text-center px-4">
              Find answers to common questions about our services
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          {loading && (
            <div className="text-center py-10 text-neutral-600">Loading FAQs...</div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              {error.includes("login") && (
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 rounded-lg bg-[#0a193b] text-white font-semibold">
                  Go to Login
                </button>
              )}
            </div>
          )}

          {!loading && !error && faqs.length === 0 && (
            <div className="text-center py-10 text-neutral-500">
              No FAQs available right now.
            </div>
          )}

          {!loading && !error && faqs.length > 0 && (
            <div className="space-y-3">
              {faqs.map((item) => {
                const isOpen = openItems.has(item._id);
                return (
                  <div
                    key={item._id}
                    className="bg-white rounded-lg border border-neutral-200 overflow-hidden transition-all">
                    <button
                      onClick={() => toggleItem(item._id)}
                      className="w-full flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors text-left">
                      <span className="text-sm md:text-base font-semibold text-neutral-900 pr-4">
                        {item.question}
                      </span>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`flex-shrink-0 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""
                          }`}>
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-0">
                        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
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
      </div>
    </div>
  );
}
