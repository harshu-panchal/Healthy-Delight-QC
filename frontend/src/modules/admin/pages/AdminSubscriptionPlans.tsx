import { useState, useEffect, useRef } from 'react';
import {
  getAdminSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  SubscriptionPlan,
  SubscriptionPlanFormData,
} from '../../../services/api/admin/adminSubscriptionService';
import {
  getCategories,
  getProducts,
  Category,
  Product,
} from '../../../services/api/admin/adminProductService';

const defaultCategories = ['Cow Milk', 'Buffalo Milk', 'Curd', 'Ghee', 'All'];

const initialFormData: SubscriptionPlanFormData = {
  name: '',
  durationInDays: 30,
  price: 499,
  freeDays: 0,
  bottlesPerDay: 1,
  packageType: 'Bottle',
  unit: '1 Litre',
  productCategory: 'Cow Milk',
  deliveryFrequency: 'daily',
  productId: '',
  description: '',
  isActive: true,
};

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<SubscriptionPlanFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Searchable Dropdowns state
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminSubscriptionPlans();
      setPlans(data || []);
    } catch (err: any) {
      console.error('Error fetching subscription plans:', err);
      setError(err.response?.data?.message || 'Failed to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogData = async () => {
    try {
      const [catRes, prodRes] = await Promise.allSettled([
        getCategories(),
        getProducts({ limit: 1000 }),
      ]);
      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        setCategories(catRes.value.data);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        setProducts(prodRes.value.data);
      }
    } catch (err) {
      console.error('Error loading categories and products:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchCatalogData();
  }, []);

  // Handle clicking outside custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenAddModal = () => {
    setEditingPlan(null);
    setFormData(initialFormData);
    setIsProductDropdownOpen(false);
    setProductSearchQuery('');
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
    setIsModalOpen(true);
  };

  const getCategoryVisual = (catName: string, sizeClass = 'w-4 h-4') => {
    const catObj = categories.find(
      (c) => c.name.toLowerCase() === (catName || '').toLowerCase()
    );
    if (catObj?.image) {
      return (
        <img
          src={catObj.image}
          alt={catName}
          className={`${sizeClass} rounded object-cover border border-neutral-200 shrink-0`}
        />
      );
    }
    return null;
  };

  const getProductCategoryName = (prod: Product | undefined): string => {
    if (!prod || !prod.category) return '';
    if (typeof prod.category === 'object' && (prod.category as any).name) {
      return (prod.category as any).name;
    }
    if (typeof prod.category === 'string') {
      const foundCat = categories.find(
        (c) => c._id === prod.category || c.name.toLowerCase() === (prod.category as string).toLowerCase()
      );
      if (foundCat) return foundCat.name;
      return prod.category;
    }
    return '';
  };

  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    const prodId =
      plan.productId && typeof plan.productId === 'object'
        ? plan.productId._id
        : plan.productId || '';

    let matchedCategory = plan.productCategory || 'Cow Milk';
    if (prodId) {
      const prod = products.find((p) => p._id === prodId);
      if (prod) {
        const exactCat = getProductCategoryName(prod);
        if (exactCat) matchedCategory = exactCat;
      }
    }

    setFormData({
      name: plan.name,
      durationInDays: plan.durationInDays,
      price: plan.price,
      freeDays: plan.freeDays || 0,
      bottlesPerDay: plan.bottlesPerDay || 1,
      packageType: plan.packageType || 'Bottle',
      unit: plan.unit || '1 Litre',
      productCategory: matchedCategory,
      deliveryFrequency: plan.deliveryFrequency || 'daily',
      productId: prodId,
      description: plan.description || '',
      isActive: plan.isActive,
    });
    setIsProductDropdownOpen(false);
    setProductSearchQuery('');
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
    setIsModalOpen(true);
  };

  const handleProductSelect = (selectedId: string) => {
    if (!selectedId) {
      setFormData((prev) => ({ ...prev, productId: '' }));
      return;
    }

    const prod = products.find((p) => p._id === selectedId);
    if (!prod) {
      setFormData((prev) => ({ ...prev, productId: selectedId }));
      return;
    }

    // Auto-match category
    let matchedCategory = getProductCategoryName(prod) || formData.productCategory || 'Cow Milk';

    // Auto-suggest packaging type and unit based on product title/category
    const lowerName = (prod.productName || '').toLowerCase();
    const lowerCat = matchedCategory.toLowerCase();
    let suggestedPackageType = formData.packageType || 'Bottle';
    let suggestedUnit = formData.unit || '1 Litre';

    if (lowerName.includes('bar') || lowerCat.includes('bar') || lowerName.includes('pudding') || lowerCat.includes('pudding')) {
      suggestedPackageType = 'Bar';
      const matchG = lowerName.match(/\b\d+\s*(?:g|gm|gram|grams)\b/i);
      suggestedUnit = matchG ? matchG[0] : '30g';
    } else if (lowerName.includes('ghee') || lowerCat.includes('ghee')) {
      suggestedPackageType = 'Jar';
      const matchSize = lowerName.match(/\b\d+\s*(?:ml|l|litre|litres|kg|g|gm)\b/i);
      suggestedUnit = matchSize ? matchSize[0] : '500 ml';
    } else if (lowerName.includes('curd') || lowerCat.includes('curd') || lowerName.includes('paneer') || lowerCat.includes('paneer') || lowerCat.includes('cheese')) {
      suggestedPackageType = 'Pack';
      const matchSize = lowerName.match(/\b\d+\s*(?:ml|l|litre|kg|g|gm)\b/i);
      suggestedUnit = matchSize ? matchSize[0] : '200g';
    } else if (lowerName.includes('pouch') || lowerCat.includes('pouch')) {
      suggestedPackageType = 'Pouch';
      const matchSize = lowerName.match(/\b\d+\s*(?:ml|l|litre)\b/i);
      suggestedUnit = matchSize ? matchSize[0] : '500 ml';
    } else if (lowerCat.includes('milk')) {
      suggestedPackageType = 'Bottle';
      const matchSize = lowerName.match(/\b\d+\s*(?:ml|l|litre)\b/i);
      suggestedUnit = matchSize ? matchSize[0] : '1 Litre';
    }

    setFormData((prev) => ({
      ...prev,
      productId: prod._id,
      name: prev.name.trim() === '' ? `${prod.productName} Subscription` : prev.name,
      productCategory: matchedCategory,
      packageType: suggestedPackageType,
      unit: suggestedUnit,
    }));
    setIsCategoryDropdownOpen(false);
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      if (plan.isActive) {
        await deleteSubscriptionPlan(plan._id);
        setSuccessMessage(`Plan "${plan.name}" deactivated`);
      } else {
        await updateSubscriptionPlan(plan._id, { isActive: true });
        setSuccessMessage(`Plan "${plan.name}" activated`);
      }
      fetchPlans();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error toggling plan status:', err);
      setError('Failed to update plan status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');

      const submissionData = { ...formData };
      if (submissionData.productId) {
        const prod = products.find((p) => p._id === submissionData.productId);
        if (prod) {
          const exactCat = getProductCategoryName(prod);
          if (exactCat) {
            submissionData.productCategory = exactCat;
          }
        }
      }

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan._id, submissionData);
        setSuccessMessage('Subscription plan updated successfully!');
      } else {
        await createSubscriptionPlan(submissionData);
        setSuccessMessage('Subscription plan created successfully!');
      }

      setIsModalOpen(false);
      fetchPlans();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error saving subscription plan:', err);
      setError(err.response?.data?.message || 'Failed to save subscription plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">Milk Subscription Plans</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage subscription plans, durations, prices, and daily milk quota settings.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all duration-200 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Plan
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Plans Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading subscription plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            No subscription plans found. Click "Add New Plan" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Duration & Frequency</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Free Days</th>
                  <th className="py-3.5 px-4">Quota</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {plans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-neutral-800">
                      {plan.name}
                      {plan.description && (
                        <p className="text-xs font-normal text-neutral-500 line-clamp-1 mt-0.5">{plan.description}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                        {getCategoryVisual(plan.productCategory || 'Cow Milk', 'w-4 h-4')}
                        <span>
                          {plan.productCategory === 'Buffalo Milk' ? '🐃 Buffalo Milk' :
                           plan.productCategory === 'Curd' ? '🥣 Fresh Curd' :
                           plan.productCategory === 'Ghee' ? '🧈 Desi Ghee' :
                           plan.productCategory === 'All' ? '🌟 All Products' :
                           plan.productCategory === 'Cow Milk' ? '🥛 Cow Milk' :
                           `🏷️ ${plan.productCategory || 'Cow Milk'}`}
                        </span>
                      </span>
                      {plan.productId && typeof plan.productId === 'object' && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-neutral-600 bg-neutral-100/80 px-2 py-0.5 rounded-md w-fit">
                          {plan.productId.mainImage && (
                            <img src={plan.productId.mainImage} alt="" className="w-4 h-4 rounded object-cover" />
                          )}
                          <span className="truncate max-w-[130px] font-medium text-emerald-800">
                            🔗 {plan.productId.productName}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-neutral-600">
                      <span className="font-semibold text-neutral-800">{plan.durationInDays} Days</span>
                      <span className="block text-xs text-neutral-400 capitalize">{plan.deliveryFrequency || 'daily'}</span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-emerald-700">₹{plan.price}</td>
                    <td className="py-4 px-4 text-neutral-600">
                      {plan.freeDays > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                          +{plan.freeDays} Days Free
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-4 px-4 text-neutral-600 font-medium">
                      <span className="font-semibold text-neutral-800">
                        {plan.bottlesPerDay} {plan.packageType || 'Item'}{plan.bottlesPerDay > 1 ? 's' : ''}
                      </span>
                      {plan.unit && plan.unit.toLowerCase() !== (plan.packageType || '').toLowerCase() && (
                        <span className="block text-xs text-neutral-400">({plan.unit})</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          plan.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(plan)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          plan.isActive
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (() => {
        const selectedProduct = products.find((p) => p._id === formData.productId);
        const isProductLinked = Boolean(formData.productId && selectedProduct);
        const filteredProducts = products.filter((prod) =>
          prod.productName.toLowerCase().includes(productSearchQuery.toLowerCase())
        );

        const dbCategoryNames = categories.map((c) => c.name).filter(Boolean);
        const allCategories = Array.from(new Set([...defaultCategories, ...dbCategoryNames]));
        if (formData.productCategory && !allCategories.includes(formData.productCategory)) {
          allCategories.push(formData.productCategory);
        }
        const filteredCategories = allCategories.filter((cat) =>
          cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-neutral-100 my-8 relative overflow-visible">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
                <h2 className="text-lg font-bold text-neutral-800">
                  {editingPlan ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Link to Specific Product (Searchable Dropdown) */}
                <div ref={productDropdownRef} className="relative">
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">
                    Link to Specific Product <span className="text-neutral-400 font-normal">(Optional Hybrid Link)</span>
                  </label>
                  
                  {/* Trigger Button */}
                  <div
                    onClick={() => {
                      setIsProductDropdownOpen(!isProductDropdownOpen);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white cursor-pointer flex items-center justify-between hover:border-neutral-400 transition-colors focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {selectedProduct ? (
                        <>
                          {selectedProduct.mainImage ? (
                            <img
                              src={selectedProduct.mainImage}
                              alt=""
                              className="w-5 h-5 rounded object-cover border border-neutral-200 shrink-0"
                            />
                          ) : (
                            <span className="text-xs shrink-0">📦</span>
                          )}
                          <span className="font-semibold text-neutral-800 truncate">
                            {selectedProduct.productName}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                            ₹{selectedProduct.price}
                          </span>
                        </>
                      ) : (
                        <span className="text-neutral-500 font-normal">-- None (Broad Category Plan) --</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductSelect('');
                          }}
                          className="text-neutral-400 hover:text-rose-500 p-0.5 rounded hover:bg-neutral-100 transition-colors"
                          title="Clear product selection"
                        >
                          ✕
                        </button>
                      )}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-neutral-400 transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>

                  {/* Dropdown Menu - Always opens downwards */}
                  {isProductDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
                      {/* Search Bar inside Dropdown */}
                      <div className="p-2 border-b border-neutral-100 bg-neutral-50">
                        <div className="relative">
                          <svg
                            className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                          </svg>
                          <input
                            type="text"
                            autoFocus
                            placeholder="Type to search product by name..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Scrollable list */}
                      <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100">
                        <button
                          type="button"
                          onClick={() => {
                            handleProductSelect('');
                            setIsProductDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                            !formData.productId ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-neutral-600'
                          }`}
                        >
                          <span>-- None (Broad Category Plan) --</span>
                          {!formData.productId && <span className="text-emerald-600 font-bold">✓</span>}
                        </button>

                        {filteredProducts.map((prod) => {
                          const isSelected = formData.productId === prod._id;
                          return (
                            <button
                              key={prod._id}
                              type="button"
                              onClick={() => {
                                handleProductSelect(prod._id);
                                setIsProductDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                                isSelected ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-neutral-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {prod.mainImage ? (
                                  <img
                                    src={prod.mainImage}
                                    alt=""
                                    className="w-6 h-6 rounded object-cover shrink-0 border border-neutral-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-xs shrink-0">
                                    📦
                                  </div>
                                )}
                                <span className="truncate">{prod.productName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="font-semibold text-neutral-600">₹{prod.price}</span>
                                {isSelected && <span className="text-emerald-600 font-bold">✓</span>}
                              </div>
                            </button>
                          );
                        })}

                        {filteredProducts.length === 0 && (
                          <div className="p-4 text-center text-xs text-neutral-400">
                            No products found matching "{productSearchQuery}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Search and pick a catalog product to automatically inherit its category and details.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Trial"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 2. Product Category (Searchable Dropdown, auto-locked when a product is linked) */}
                  <div ref={categoryDropdownRef} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-neutral-600">Product Category *</label>
                      {isProductLinked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-xs">
                          🔒 Auto-locked
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isProductLinked}
                      onClick={() => {
                        if (isProductLinked) return;
                        setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                        setIsProductDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-medium flex items-center justify-between outline-none text-left transition-colors ${
                        isProductLinked
                          ? 'bg-neutral-100/90 border-neutral-300 text-neutral-600 cursor-not-allowed select-none'
                          : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                      title={
                        isProductLinked
                          ? `Locked to linked product's category (${formData.productCategory}). Clear linked product above to unlock.`
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                        {getCategoryVisual(formData.productCategory || 'Cow Milk', 'w-5 h-5')}
                        <span className="truncate">
                          {formData.productCategory === 'Buffalo Milk' ? '🐃 Buffalo Milk' :
                           formData.productCategory === 'Curd' ? '🥣 Fresh Curd' :
                           formData.productCategory === 'Ghee' ? '🧈 Desi Ghee' :
                           formData.productCategory === 'All' ? '🌟 All Products' :
                           formData.productCategory === 'Cow Milk' ? '🥛 Cow Milk' :
                           `🏷️ ${formData.productCategory || 'Cow Milk'}`}
                        </span>
                      </div>
                      {isProductLinked ? (
                        <span className="text-xs text-neutral-400 shrink-0 ml-1 select-none" title="Category locked">
                          🔒
                        </span>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`text-neutral-400 shrink-0 ml-1 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      )}
                    </button>

                    {isProductLinked && (
                      <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                        <span>🔒</span>
                        <span>Auto-locked to <strong>{formData.productCategory}</strong>. Clear product above to unlock.</span>
                      </p>
                    )}

                    {/* Category Dropdown Menu - Always opens downwards (only when not locked) */}
                    {!isProductLinked && isCategoryDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
                        {/* Search input inside category dropdown */}
                        <div className="p-2 border-b border-neutral-100 bg-neutral-50">
                          <div className="relative">
                            <svg
                              className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search categories..."
                              value={categorySearchQuery}
                              onChange={(e) => setCategorySearchQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Scrollable categories list */}
                        <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100">
                          {filteredCategories.map((cat) => {
                            const isSelected = (formData.productCategory || 'Cow Milk').toLowerCase() === cat.toLowerCase();
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, productCategory: cat });
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                                  isSelected ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-neutral-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {getCategoryVisual(cat, 'w-5 h-5')}
                                  <span className="truncate">
                                    {cat === 'Cow Milk' ? '🥛 Cow Milk' :
                                     cat === 'Buffalo Milk' ? '🐃 Buffalo Milk' :
                                     cat === 'Curd' ? '🥣 Fresh Curd' :
                                     cat === 'Ghee' ? '🧈 Desi Ghee' :
                                     cat === 'All' ? '🌟 All Products' :
                                     `🏷️ ${cat}`}
                                  </span>
                                </div>
                                {isSelected && <span className="text-emerald-600 font-bold">✓</span>}
                              </button>
                            );
                          })}
                          {filteredCategories.length === 0 && (
                            <div className="p-3 text-center text-xs text-neutral-400">
                              No categories found matching "{categorySearchQuery}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Delivery Frequency *</label>
                  <select
                    value={formData.deliveryFrequency || 'daily'}
                    onChange={(e) => setFormData({ ...formData, deliveryFrequency: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white font-medium text-neutral-800 capitalize"
                  >
                    <option value="daily">Daily (Every Day)</option>
                    <option value="alternate">Alternate Days</option>
                    <option value="weekly">Weekly Once</option>
                    <option value="monthly">Monthly Once</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Duration (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.durationInDays}
                    onChange={(e) => setFormData({ ...formData, durationInDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Free Days</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.freeDays}
                    onChange={(e) => setFormData({ ...formData, freeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Daily Quota & Custom Packaging Controls */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Daily Delivery Quota & Packaging
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Fully customizable per plan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Daily Quantity (previously Bottles/Day) */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Daily Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.bottlesPerDay}
                      onChange={(e) => setFormData({ ...formData, bottlesPerDay: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      placeholder="e.g. 1"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">Number of items delivered per day</p>
                  </div>

                  {/* 2. Packaging Type */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Packaging Type *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bottle, Pack, Jar, Bar"
                      value={formData.packageType || ''}
                      onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Bottle', 'Pack', 'Jar', 'Pouch', 'Bar', 'Piece', 'Box', 'Tin'].map((pkg) => (
                        <button
                          key={pkg}
                          type="button"
                          onClick={() => setFormData({ ...formData, packageType: pkg })}
                          className={`px-1.5 py-0.5 text-[10px] rounded font-medium border transition-colors ${
                            (formData.packageType || '').toLowerCase() === pkg.toLowerCase()
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                              : 'bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                          }`}
                        >
                          {pkg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Item Size / Unit */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Item Size / Unit *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1 Litre, 500 ml, 200g, 30g"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['1 Litre', '500 ml', '1 kg', '500g', '200g', '30g'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setFormData({ ...formData, unit: sz })}
                          className={`px-1.5 py-0.5 text-[10px] rounded font-medium border transition-colors ${
                            (formData.unit || '').toLowerCase() === sz.toLowerCase()
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                              : 'bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 flex items-center justify-between">
                  <span>Customer Card Preview:</span>
                  <strong className="font-bold">
                    {formData.bottlesPerDay} {formData.packageType || 'Bottle'}{formData.bottlesPerDay > 1 ? (formData.packageType?.endsWith('s') ? '' : (formData.packageType?.endsWith('x') || formData.packageType?.endsWith('ch') ? 'es' : 's')) : ''} ({formData.unit || '1 Litre'} each) — fresh {formData.productCategory ? formData.productCategory.toLowerCase() : 'item'} daily quota
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or perks of this plan"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 select-none">
                  Active (Visible to customers)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
