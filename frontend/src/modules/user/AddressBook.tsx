import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Address,
  deleteAddress,
  getAddresses,
  updateAddress,
} from "../../services/api/customerAddressService";

const iconStyle = "w-5 h-5 text-amber-600 flex-shrink-0";

function buildAddressLine(address: Address) {
  const parts = [
    address.address,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function AddressBook() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAddresses();
      if (res.success && Array.isArray(res.data)) {
        setAddresses(res.data as Address[]);
      } else {
        setError(res.message || "Failed to load addresses");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load addresses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleShare = async (address: Address) => {
    const text = `${address.fullName || "Address"}\n${buildAddressLine(
      address
    )}\nPhone: ${address.phone}`;
    
    const shareData = {
      title: `${address.type || "Saved Address"}`,
      text: text,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        setSelectedAddress(address);
        setShowShareSheet(true);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error sharing with native sheet:", error);
        setSelectedAddress(address);
        setShowShareSheet(true);
      }
    }
  };

  const handleShareOption = async (option: 'whatsapp' | 'telegram' | 'sms' | 'email' | 'copy') => {
    if (!selectedAddress) return;
    const text = `${selectedAddress.fullName || "Address"}\n${buildAddressLine(
      selectedAddress
    )}\nPhone: ${selectedAddress.phone}`;

    switch (option) {
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'sms':
        window.location.href = `sms:?body=${encodeURIComponent(text)}`;
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(`${selectedAddress.type || "Saved Address"} - Healthy Delight`)}&body=${encodeURIComponent(text)}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy address:", err);
        }
        break;
    }
    setShowShareSheet(false);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Remove this address?")) return;
    try {
      setBusyId(id);
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a._id !== id));
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to delete address"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMakeDefault = async (id?: string) => {
    if (!id) return;
    try {
      setBusyId(id);
      await updateAddress(id, { isDefault: true });
      // Optimistically mark default locally
      setAddresses((prev) =>
        prev.map((addr) => ({ ...addr, isDefault: addr._id === id }))
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to mark as default"
      );
    } finally {
      setBusyId(null);
    }
  };

  const defaultBadge = useMemo(
    () => (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full">
        Default
      </span>
    ),
    []
  );

  return (
    <div className="min-h-screen bg-white md:bg-neutral-50 pb-24 md:pb-10">
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-neutral-500">Your saved addresses</p>
          <h1 className="text-base font-semibold text-neutral-900">
            Address book
          </h1>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => navigate("/checkout/address", { state: { fromAddressBook: true } })}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-full hover:bg-teal-700"
          >
            Add new
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-4 text-sm">
            {error}
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-lg p-6 text-center">
            <p className="text-neutral-700 font-semibold mb-1">
              No addresses yet
            </p>
            <p className="text-sm text-neutral-500 mb-3">
              Save an address to checkout faster next time.
            </p>
            <button
              onClick={() => navigate("/checkout/address", { state: { fromAddressBook: true } })}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-full hover:bg-teal-700"
            >
              Add address
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => {
              const isBusy = busyId === addr._id;
              return (
                <div
                  key={addr._id || addr.phone}
                  className="bg-white border border-neutral-200 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-3 transition hover:shadow-md"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <svg
                        viewBox="0 0 24 24"
                        className={iconStyle}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 9.5 12 3l9 6.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                        <path d="M9 21V12h6v9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-1">
                        <span className="text-sm font-semibold text-neutral-900">
                          {addr.type || "Home"}
                        </span>
                        {addr.isDefault && defaultBadge}
                      </div>
                      <p className="text-xs text-green-700 font-semibold mt-0.5">
                        Saved address
                      </p>
                      <p className="text-sm text-neutral-800 leading-relaxed mt-2">
                        {buildAddressLine(addr)}
                      </p>
                      <p className="text-sm text-neutral-700 mt-1">
                        Phone number: {addr.phone || "Not added"}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-teal-700">
                        <button
                          onClick={() => handleShare(addr)}
                          className="flex items-center gap-1 text-sm font-semibold hover:text-teal-800"
                          disabled={isBusy}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <path d="m8.59 13.51 6.83 3.98" />
                            <path d="m15.41 6.51-6.82 3.98" />
                          </svg>
                          Share
                        </button>
                        <button
                          onClick={() => handleMakeDefault(addr._id)}
                          className="flex items-center gap-1 text-sm font-semibold hover:text-teal-800 disabled:text-neutral-400"
                          disabled={isBusy || addr.isDefault}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m9 11 3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          {addr.isDefault ? "Default" : "Set default"}
                        </button>
                        <button
                          onClick={() => handleDelete(addr._id)}
                          className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 disabled:text-neutral-400"
                          disabled={isBusy}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                            <path d="M10 11h4" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Bottom Share Sheet Fallback */}
      <AnimatePresence>
        {showShareSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowShareSheet(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl border-t border-slate-100/80 z-10 overflow-hidden">
              
              {/* Drag indicator handle */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

              <h2 className="text-xl font-black text-slate-800 text-center tracking-tight mb-1">
                Share Saved Address
              </h2>
              <p className="text-xs font-semibold text-slate-400 text-center mb-6">
                Share address details via available apps
              </p>

              {/* Share Apps Grid */}
              <div className="grid grid-cols-5 gap-3 mb-6 px-2">
                {/* WhatsApp */}
                <button
                  onClick={() => handleShareOption('whatsapp')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-11.758c.241.678.898 2.5 1.018 2.741.12.242.196.417.12.567-.075.15-.376.301-.527.452-.15.15-.327.316-.48.452-.178.158-.363.33-.157.678.206.348.916 1.507 1.963 2.438 1.35 1.198 2.486 1.568 2.837 1.719.351.15.556.12.766-.12.21-.24.902-1.053 1.143-1.413.241-.36.481-.3.812-.18.331.12 2.102 1.053 2.463 1.233.36.18.601.27.69.421.09.15.09.87-.27 1.23-.36.36-2.102 2.102-2.823 2.102-.72 0-1.652-.27-4.63-1.472-3.626-1.458-5.962-5.185-6.143-5.426-.18-.241-1.442-1.923-1.442-3.67 0-1.747.902-2.607 1.222-2.952.32-.345.702-.435.932-.435.23 0 .461.002.662.012.21.01.491-.037.766.632z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={() => handleShareOption('telegram')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500 hover:bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.917-1.123 6.452-1.603 8.981-.203 1.071-.628 1.43-1.011 1.465-.831.077-1.461-.548-2.266-1.075-1.258-.826-1.968-1.341-3.19-2.146-1.411-.931-.497-1.442.308-2.278.211-.219 3.882-3.563 3.957-3.88.009-.04-.002-.187-.079-.255-.078-.068-.192-.045-.275-.026-.118.027-2.001 1.272-5.642 3.731-.533.366-1.017.545-1.451.535-.479-.01-1.401-.271-2.086-.493-.84-.272-1.507-.416-1.449-.878.03-.241.362-.488.997-.74 3.9-1.696 6.5-2.818 7.8-3.363 3.711-1.554 4.48-1.825 4.982-1.834.11-.002.356.025.516.155.134.109.171.256.183.359.012.096.015.289.006.398z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Telegram</span>
                </button>

                {/* SMS */}
                <button
                  onClick={() => handleShareOption('sms')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">SMS</span>
                </button>

                {/* Email */}
                <button
                  onClick={() => handleShareOption('email')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Email</span>
                </button>

                {/* Copy text */}
                <button
                  onClick={() => handleShareOption('copy')}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none">
                  <div className="w-12 h-12 rounded-2xl bg-slate-600 hover:bg-slate-700 flex items-center justify-center shadow-lg shadow-slate-600/20 group-hover:scale-105 transition-all">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Copy Text</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copied Toast Banner */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-full shadow-xl border border-white/10 flex items-center gap-2">
            <span className="text-emerald-400 text-sm">✓</span>
            <span>Address copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

