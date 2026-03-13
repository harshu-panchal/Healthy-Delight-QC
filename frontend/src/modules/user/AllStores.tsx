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
        <div className="min-h-screen bg-neutral-50 pb-10">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b border-neutral-200 px-4 py-4 flex items-center gap-4">
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
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-6">
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
                                className="group flex flex-col cursor-pointer"
                            >
                                <div className="relative aspect-[4/5] bg-white rounded-t-full overflow-hidden border border-neutral-200 shadow-sm group-hover:shadow-md transition-all">
                                    <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 to-transparent" />
                                    <div className="w-full h-full p-2 flex items-center justify-center">
                                        {(shop.image || (shop.productImages && shop.productImages[0])) ? (
                                            <img
                                                src={shop.image || shop.productImages[0]}
                                                alt={shop.name}
                                                className="w-[85%] h-[85%] object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="text-3xl text-sky-200 font-bold">
                                                {shop.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    {/* Label */}
                                    <div className="absolute bottom-0 left-0 right-0 p-1">
                                        <div className="bg-amber-400 py-1.5 px-1 rounded-xl shadow-sm">
                                            <span className="block text-[8px] md:text-[10px] font-black text-amber-900 text-center uppercase tracking-tight line-clamp-1">
                                                {shop.name}
                                            </span>
                                        </div>
                                    </div>
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
