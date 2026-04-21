import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getHomeContent } from "../../services/api/customerHomeService";
import { useLocation } from "../../hooks/useLocation";
import { motion } from "framer-motion";
import logo from "../../../assets/logo.png";

export default function AllStores() {
    const navigate = useNavigate();
    const { location } = useLocation();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
        const fetchShops = async () => {
            try {
                const response = await getHomeContent(
                    "all",
                    location?.latitude,
                    location?.longitude
                );
                if (response.success && response.data?.shops) {
                    setShops(response.data.shops);
                }
            } catch (error) {
                console.error("Failed to fetch stores:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
    }, [location]);

    const locationDisplayText = (location as any)?.address ||
        ((location as any)?.city && (location as any)?.state ? `${(location as any).city}, ${(location as any).state}` :
            ((location as any)?.city || ""));

    return (
        <div className="min-h-screen bg-transparent pb-10 relative pt-[140px] md:pt-[5px]">
            {/* Premium Home-Style Fixed Header (MOBILE ONLY) */}
            <header
                className="md:hidden fixed top-0 left-0 w-full z-50 transition-all duration-300"
                style={{
                    background: isHeaderSolid ? '#0a193b' : 'linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.94) 100%)',
                    boxShadow: isHeaderSolid ? "0 12px 24px rgba(0,0,0,0.12)" : "none",
                    paddingBottom: isHeaderSolid ? '8px' : '20px',
                }}
            >
                <div className="px-5 md:px-10 pt-5 pb-3">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-8 flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group" onClick={() => navigate('/')}>
                                <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105" />
                            </div>

                            {locationDisplayText && (
                                <div onClick={() => navigate('/account')} className="flex items-center gap-2 cursor-pointer max-w-[200px] md:max-w-md group">
                                    <div className="p-1.5 rounded-full bg-white/10 text-white/90 border border-white/20">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 leading-none mb-0.5">Delivery to</span>
                                        <span className="text-sm font-bold text-white/95 truncate">{locationDisplayText}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => navigate('/account')}
                            className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Improved Search Bar */}
                <div className="px-5 md:px-10 py-3">
                    <div className="w-full md:max-w-2xl md:mx-auto h-12 bg-white rounded-2xl flex items-center gap-4 px-5 shadow-lg border border-neutral-100">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a193b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search among all stores..."
                            className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-neutral-800"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') navigate(`/search?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                            }}
                        />
                    </div>
                </div>
            </header>

            {/* Cinematic Hero Header (Desktop Optimized) */}
            <div className="px-5 pt-8 pb-4 md:px-10 md:pt-0 md:pb-8">
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#0a193b]/5 text-[#0a193b] hover:bg-[#0a193b]/10 transition-all active:scale-95 shadow-sm"
                        title="Go back"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl md:text-[36px] font-bold text-[#0a193b] tracking-tighter leading-tight">
                            All Stores
                        </h1>
                        <p className="text-[11px] md:text-sm text-neutral-400 font-medium mt-0.5">
                            {shops.length} marketplace stores available
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-4 py-2 md:px-10">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                    </div>
                ) : shops.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-10 lg:gap-8">
                        {shops.map((shop) => (
                            <motion.div
                                key={shop.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    const storeSlug = shop.slug || shop.id.replace("-store", "");
                                    navigate(`/store/${storeSlug}`);
                                }}
                                className="hover-lift tap-scale group flex flex-col cursor-pointer bg-white rounded-[20px] border border-black/[0.04] shadow-card transition-all duration-300 p-3"
                            >
                                {/* Store Image Container */}
                                <div className="relative aspect-square rounded-[14px] overflow-hidden mb-3 flex items-center justify-center bg-transparent">
                                    {(shop.image || (shop.productImages && shop.productImages[0])) ? (
                                        <img
                                            src={shop.image || (shop.productImages ? shop.productImages[0] : "")}
                                            alt={shop.name}
                                            className="w-[90%] h-[90%] object-contain drop-shadow-sm transform transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="text-4xl text-[#0a193b] font-bold opacity-20 capitalize">
                                            {shop.name.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                {/* Store Name - Clean Navy Typography */}
                                <div className="text-center">
                                    <span className="block text-[12px] md:text-[14px] font-medium text-[#0a193b] capitalize line-clamp-1 leading-tight mb-1">
                                        {shop.name.toLowerCase()}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-neutral-500">
                        <p className="text-lg">No stores found near your location.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
