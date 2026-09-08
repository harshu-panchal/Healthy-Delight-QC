import { useState, useEffect } from "react";
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  Banner,
  BannerFormData,
} from "../../../services/api/admin/adminBannerService";
import BannerFormModal from "../components/BannerFormModal";

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await getBanners();
      setBanners(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching banners:", err);
      setError("Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode("create");
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  const handleEdit = (banner: Banner) => {
    setModalMode("edit");
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;

    try {
      await deleteBanner(id);
      setBanners(banners.filter((b) => b._id !== id));
    } catch (err) {
      console.error("Error deleting banner:", err);
      alert("Failed to delete banner");
    }
  };

  const handleSubmit = async (data: BannerFormData) => {
    try {
      if (modalMode === "create") {
        const newBanner = await createBanner(data);
        setBanners([...banners, newBanner].sort((a, b) => a.order - b.order));
      } else if (editingBanner) {
        const updatedBanner = await updateBanner(editingBanner._id, data);
        setBanners(
          banners
            .map((b) => (b._id === editingBanner._id ? updatedBanner : b))
            .sort((a, b) => a.order - b.order)
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving banner:", err);
      throw err;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Home Banners</h1>
          <p className="text-gray-500 mt-1">Manage promotional banners for the homepage carousel</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 shadow-lg shadow-black/5 transition-all active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add New Banner
        </button>
      </div>

      {/* Festival Banner Guide & Sample Showcase */}
      <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 border border-amber-200/80 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
              🪔
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-amber-950">
                  Festival Banner Guidelines & Sample
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Design Guide
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-1 max-w-2xl leading-relaxed">
                Festive campaigns drive up to 3× higher milk, ghee, and curd subscriptions. Ensure your banners follow our standard responsive aspect ratios:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-3 text-xs text-amber-900 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span><strong>Desktop Carousel:</strong> 3:1 ratio (1800 × 600 px)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span><strong>Mobile Carousel:</strong> 16:9 ratio (1280 × 720 px)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={handleCreate}
              className="w-full lg:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Create Festive Banner</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
          {error}
          <button onClick={fetchBanners} className="ml-4 underline font-semibold">Retry</button>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Banners Found</h3>
          <p className="text-gray-500 mb-6">Create your first banner to show on the homepage</p>
          <button
            onClick={handleCreate}
            className="px-6 py-2.5 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition-all"
          >
            Create Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all">
              <div className="aspect-[21/9] relative overflow-hidden bg-gray-100">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {!banner.isActive && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="px-3 py-1 bg-white/90 text-gray-900 text-xs font-bold rounded-full shadow-sm">
                      INACTIVE
                    </span>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-sm transition-all hover:text-primary-dark"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(banner._id)}
                    className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-sm transition-all hover:text-red-600"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1">{banner.title}</h3>
                    {banner.link && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                        </svg>
                        {banner.link}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-md">
                      #{banner.order}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BannerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        banner={editingBanner}
        mode={modalMode}
      />
    </div>
  );
}
