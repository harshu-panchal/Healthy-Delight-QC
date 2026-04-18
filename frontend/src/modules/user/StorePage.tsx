import { useNavigate, useParams, Link } from 'react-router-dom';
import { Product } from '../../types/domain';
import { useEffect, useState } from 'react';
import { getStoreProducts } from '../../services/api/customerHomeService';
import { useLocation } from '../../hooks/useLocation';
import ProductCard from './components/ProductCard';

export default function StorePage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { location } = useLocation();
    const [products, setProducts] = useState<Product[]>([]);
    const [shopData, setShopData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!slug) return;
            try {
                setLoading(true);

                // Fetch shop data and products using the shop API endpoint
                const response = await getStoreProducts(
                    slug,
                    location?.latitude,
                    location?.longitude
                );
                console.log(`[StorePage] Response for slug "${slug}":`, {
                    success: response.success,
                    productsCount: response.data?.length || 0,
                    shop: response.shop ? { name: response.shop.name, image: response.shop.image } : null,
                    message: response.message
                });
                if (response.success) {
                    setProducts(response.data || []);
                    setShopData(response.shop || null);
                } else {
                    setProducts([]);
                    setShopData(null);
                }
            } catch (error: any) {
                console.error('Failed to fetch store data:', error);
                console.error('Error details:', error.response?.data || error.message);
                setProducts([]);
                setShopData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, location]);

    const storeName = shopData?.name || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' ') : 'Store');
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    // Determine banner image source
    useEffect(() => {
        if (shopData?.image) {
            setBannerImage(shopData.image);
            setImageError(false);
        } else if (slug) {
            // Try multiple possible image paths
            const possiblePaths = [
                `/assets/shopbystore/${slug}/${slug}header.png`,
                `/assets/shopbystore/${slug}/header.png`,
                `/assets/shopbystore/${slug}.png`,
                `/assets/shopbystore/${slug}.jpg`,
            ];
            setBannerImage(possiblePaths[0]);
            setImageError(false);
        } else {
            setBannerImage(null);
            setImageError(true);
        }
    }, [shopData, slug]);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        const currentSrc = target.src;

        // Try fallback paths if current one fails
        if (slug && currentSrc.includes('/assets/shopbystore/')) {
            const fallbackPaths = [
                `/assets/shopbystore/${slug}/header.png`,
                `/assets/shopbystore/${slug}.png`,
                `/assets/shopbystore/${slug}.jpg`,
            ];
            const currentIndex = fallbackPaths.findIndex(path => currentSrc.includes(path));

            if (currentIndex < fallbackPaths.length - 1) {
                // Try next fallback path
                target.src = fallbackPaths[currentIndex + 1];
                return;
            }
        }

        // If all paths failed, show fallback
        setImageError(true);
        target.style.display = 'none';
    };

    return (
        <div className="min-h-screen bg-[#f8f6f2]">
            {/* Premium Sticky Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black/[0.04] px-4 py-4 flex items-center justify-between gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 border border-black/[0.04] hover:bg-white shadow-sm transition-all active:scale-95"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div className="flex-1 flex justify-center">
                    <h1 className="text-lg font-bold text-[#0a193b] tracking-tight truncate max-w-[200px]">{storeName}</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/search')}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 border border-black/[0.04] hover:bg-white shadow-sm transition-all active:scale-95"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="8" stroke="#000000" strokeWidth="2.5" />
                            <path d="m21 21-4.35-4.35" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Immersive Store Hero */}
            <div className="relative w-full aspect-[16/10] bg-neutral-100 overflow-hidden">
                {bannerImage && !imageError ? (
                    <img
                        src={bannerImage}
                        alt={storeName}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                        loading="eager"
                    />
                ) : (
                    <div className="banner-fallback w-full h-full bg-gradient-to-br from-[#f8f6f2] to-[#e3d1ae]/30 flex items-center justify-center">
                        <div className="text-5xl font-bold text-[#c5a059]/30 italic opacity-20">
                            {storeName}
                        </div>
                    </div>
                )}
                {/* Subtle Image Overlay for Depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/[0.05] via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Content Section with Curved Overlap */}
            <div className="relative -mt-12 pt-10 pb-20 px-4 bg-[#f8f6f2] rounded-t-[40px] shadow-[0_-12px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02] z-10">
                <div className="max-w-screen-xl mx-auto">
                    {/* Centered Curated Header */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-12 h-1 bg-[#c5a059]/30 rounded-full mb-4 md:mb-6"></div>
                        <h2 className="text-2xl md:text-3xl font-bold text-[#0a193b] tracking-tight">Top picks</h2>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-3 gap-3 md:gap-6 animate-pulse">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="aspect-[4/5] bg-white rounded-2xl shadow-sm"></div>
                            ))}
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 lg:gap-8">
                            {products.map((product) => (
                                <ProductCard
                                    key={product._id || product.id}
                                    product={product}
                                    categoryStyle={true}
                                    showBadge={true}
                                    showPackBadge={false}
                                    showStockInfo={false}
                                    storeStyle={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="text-4xl mb-4 opacity-20">🛒</div>
                            <p className="text-neutral-500 font-medium">No products found in this store yet.</p>
                            <Link to="/" className="text-[#c5a059] font-bold mt-4 inline-block hover:underline">Explore other categories</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
