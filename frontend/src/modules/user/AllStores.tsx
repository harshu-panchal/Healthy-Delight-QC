import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getHomeContent } from "../../services/api/customerHomeService";
import { useLocation } from "../../hooks/useLocation";
import { motion } from "framer-motion";

export default function AllStores() {
    const navigate = useNavigate();
    const { location } = useLocation();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="min-h-screen bg-transparent pb-10 relative">
            {/* Header */}
            {/* Modern Header with Blur */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black/[0.04] px-5 py-5 flex items-center gap-4">
                <button
                    onClick={() => navigate("/")}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M15 18L9 12L15 6"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
                <h1 className="text-xl font-bold text-neutral-900">All Stores</h1>
            </div>

            <div className="px-4 py-6 md:px-8">
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
                                    { (shop.image || (shop.productImages && shop.productImages[0])) ? (
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
