import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { OrderAddress } from '../../types/order';
import { getAddresses, addAddress, updateAddress, Address } from '../../services/api/customerAddressService';
import GoogleMapsLocationPicker from '../../components/GoogleMapsLocationPicker';
import LocationPickerMap from '../../components/LocationPickerMap';

type Libraries = ("places" | "drawing" | "geometry" | "visualization")[];
const googleLibraries: Libraries = ['places'];

export default function CheckoutAddress() {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get address from navigation state if editing or cloning for someone else
  const editAddress = (location.state as any)?.editAddress as OrderAddress | undefined;
  const cloneAddress = (location.state as any)?.cloneAddress as OrderAddress | undefined;
  const isOrderingForSomeoneElse = (location.state as any)?.isOrderingForSomeoneElse as boolean | undefined;
  const editAddressId = editAddress ? (editAddress.id || editAddress._id) : 'new';

  const isFirstMount = useRef(true);

  // Load draft if it exists and matches the current edit session
  const draft = (() => {
    try {
      const savedDraftStr = sessionStorage.getItem('checkout_address_draft');
      if (savedDraftStr) {
        const parsedDraft = JSON.parse(savedDraftStr);
        if (parsedDraft.editAddressId === editAddressId) {
          return parsedDraft;
        }
      }
    } catch (e) {
      console.warn("Failed to parse checkout address draft:", e);
    }
    return null;
  })();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [address, setAddress] = useState<OrderAddress>(() => {
    if (draft?.address) return draft.address;
    const sourceAddress = editAddress || cloneAddress;
    return {
      name: isOrderingForSomeoneElse ? '' : (sourceAddress?.name || user?.name || ''),
      phone: isOrderingForSomeoneElse ? '' : (sourceAddress?.phone || user?.phone || ''),
      flat: sourceAddress?.flat || '',
      street: sourceAddress?.street || '',
      city: sourceAddress?.city || '',
      pincode: sourceAddress?.pincode || '',
      state: sourceAddress?.state || '',
      landmark: sourceAddress?.landmark || '',
    };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OrderAddress, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [orderingFor, setOrderingFor] = useState<'myself' | 'someone-else'>(() => {
    if (draft?.orderingFor) return draft.orderingFor;
    if (isOrderingForSomeoneElse) return 'someone-else';
    const userProfileName = user?.name || '';
    const userProfilePhone = user?.phone || '';
    const addressName = editAddress?.name || '';
    const addressPhone = editAddress?.phone || '';

    const isSelfAddress = !editAddress || (
      (userProfileName && addressName.toLowerCase() === userProfileName.toLowerCase()) ||
      (userProfilePhone && addressPhone === userProfilePhone)
    );

    return isSelfAddress ? 'myself' : 'someone-else';
  });
  const [addressType, setAddressType] = useState<'home' | 'work' | 'hotel' | 'other'>(() => {
    return draft?.addressType || 'home';
  });

  // Location picker state
  const [selectedLatitude, setSelectedLatitude] = useState<number>(() => {
    if (draft?.selectedLatitude) return draft.selectedLatitude;
    const sourceAddress = editAddress || cloneAddress;
    return sourceAddress?.latitude || 0;
  });
  const [selectedLongitude, setSelectedLongitude] = useState<number>(() => {
    if (draft?.selectedLongitude) return draft.selectedLongitude;
    const sourceAddress = editAddress || cloneAddress;
    return sourceAddress?.longitude || 0;
  });

  // Save draft to sessionStorage on state changes
  useEffect(() => {
    const draftData = {
      editAddressId,
      address,
      orderingFor,
      addressType,
      selectedLatitude,
      selectedLongitude
    };
    sessionStorage.setItem('checkout_address_draft', JSON.stringify(draftData));
  }, [address, orderingFor, addressType, selectedLatitude, selectedLongitude, editAddressId]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: googleLibraries
  });

  // Get user's current location on mount
  useEffect(() => {
    const sourceAddress = editAddress || cloneAddress;
    if ((draft?.selectedLatitude && draft?.selectedLongitude) || (sourceAddress?.latitude && sourceAddress?.longitude)) {
      return; // Skip geolocation if we already have a loaded draft location
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelectedLatitude(position.coords.latitude);
          setSelectedLongitude(position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation permission or retrieval failed, defaulting to Indore center:", error);
          setSelectedLatitude(22.7196);
          setSelectedLongitude(75.8577);
        }
      );
    } else {
      setSelectedLatitude(22.7196);
      setSelectedLongitude(75.8577);
    }
  }, []);

  const handleLocationSelect = useCallback(async (lat: number, lng: number) => {
    setSelectedLatitude(lat);
    setSelectedLongitude(lng);

    if (isLoaded) {
      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const addressComponents = results[0].address_components;
            
            let streetNumber = '';
            let route = '';
            let sublocality = '';
            let city = '';
            let state = '';
            let pincode = '';

            for (const component of addressComponents) {
              const types = component.types;
              if (types.includes('street_number')) {
                streetNumber = component.long_name;
              }
              if (types.includes('route')) {
                route = component.long_name;
              }
              if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
                sublocality = component.long_name;
              }
              if (types.includes('locality')) {
                city = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                state = component.long_name;
              }
              if (types.includes('postal_code')) {
                pincode = component.long_name;
              }
            }

            const streetArea = [streetNumber, route, sublocality].filter(Boolean).join(', ');

            setAddress(prev => ({
              ...prev,
              street: streetArea || prev.street,
              city: city || prev.city,
              state: state || prev.state,
              pincode: pincode || prev.pincode,
            }));
          }
        });
      } catch (e) {
        console.error("Reverse geocoding error:", e);
      }
    }
  }, [isLoaded]);


  // Fetch all addresses on mount
  useEffect(() => {
    if (isAuthenticated) {
      const fetchAddresses = async () => {
        try {
          const response = await getAddresses();
          if (response.success && Array.isArray(response.data)) {
            setSavedAddresses(response.data);
          }
        } catch (error) {
          console.error('Error fetching addresses:', error);
        }
      };
      fetchAddresses();
    }
  }, [isAuthenticated]);



  // Update address when editAddress or cloneAddress changes
  useEffect(() => {
    const sourceAddress = editAddress || cloneAddress;
    if (sourceAddress && isFirstMount.current && !draft) {
      setAddress({
        name: isOrderingForSomeoneElse ? '' : (sourceAddress.name || ''),
        phone: isOrderingForSomeoneElse ? '' : (sourceAddress.phone || ''),
        flat: sourceAddress.flat || '',
        street: sourceAddress.street || '',
        city: sourceAddress.city || '',
        pincode: sourceAddress.pincode || '',
        state: sourceAddress.state || '',
        landmark: sourceAddress.landmark || '',
      });

      // Try to set address type based on sourceAddress if it has one
      if ((sourceAddress as any).type) {
        setAddressType((sourceAddress as any).type.toLowerCase());
      }

      if (isOrderingForSomeoneElse) {
        setOrderingFor('someone-else');
      } else {
        // Determine if editing an address for someone else
        const userProfileName = user?.name || '';
        const userProfilePhone = user?.phone || '';
        const addressName = sourceAddress.name || '';
        const addressPhone = sourceAddress.phone || '';

        const isSelfAddress = (
          (userProfileName && addressName.toLowerCase() === userProfileName.toLowerCase()) ||
          (userProfilePhone && addressPhone === userProfilePhone)
        );
        setOrderingFor(isSelfAddress ? 'myself' : 'someone-else');
      }
    }
    isFirstMount.current = false;
  }, [editAddress, cloneAddress, user]);



  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof OrderAddress, string>> = {};

    if (!address.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!address.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (address.phone.length < 10) {
      newErrors.phone = 'Phone must be at least 10 digits';
    }
    if (!address.flat.trim()) {
      newErrors.flat = 'Flat/House No. is required';
    }
    if (!address.street.trim()) {
      newErrors.street = 'Street/Area is required';
    }
    if (!address.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!address.state?.trim()) {
        newErrors.state = 'State is required';
    }
    if (!address.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (address.pincode.length < 6) {
      newErrors.pincode = 'Pincode must be at least 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof OrderAddress, value: string) => {
    let filteredValue = value;
    if (field === 'name' || field === 'city') {
      filteredValue = value.replace(/[^a-zA-Z\s]/g, "");
    }
    setAddress((prev) => ({ ...prev, [field]: filteredValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveAddress = async () => {
    if (!isAuthenticated) {
      showToast('Please login to save your address', 'info');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      let finalLat = selectedLatitude || 0;
      let finalLng = selectedLongitude || 0;

      // Try to geocode if map wasn't used but we have text address
      if (isLoaded && (!finalLat || !finalLng)) {
        const fullAddress = `${address.flat}, ${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: fullAddress }, (results, status) => {
              if (status === 'OK' && results && results.length > 0) {
                resolve(results);
              } else {
                reject(status);
              }
            });
          });

          if (result && result[0] && result[0].geometry && result[0].geometry.location) {
            finalLat = result[0].geometry.location.lat();
            finalLng = result[0].geometry.location.lng();
            console.log("Geocoded address to:", finalLat, finalLng);
          }
        } catch (e) {
          console.warn("Geocoding failed, proceeding with 0,0", e);
        }
      }

      const payload = {
        fullName: address.name,
        phone: address.phone,
        flat: address.flat,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        type: addressType.charAt(0).toUpperCase() + addressType.slice(1) as 'Home' | 'Work' | 'Hotel' | 'Other', // Capitalize
        isDefault: true, // Auto set as default for now
        address: `${address.flat}, ${address.street}`, // Fallback combined string
        latitude: finalLat,
        longitude: finalLng,
      };

      // If editing an address:
      // - If ordering for myself: we update the existing address.
      // - If ordering for someone else:
      //   - If the address being edited was already for someone else (editAddress name/phone !== user name/phone), we can update it.
      //   - If the address being edited was for myself (editAddress name/phone === user name/phone), we must add it as a new address to avoid overwriting!
      const userProfileName = user?.name || '';
      const userProfilePhone = user?.phone || '';
      const addressName = editAddress?.name || '';
      const addressPhone = editAddress?.phone || '';

      const isEditingSelfAddress = editAddress && (
        (userProfileName && addressName.toLowerCase() === userProfileName.toLowerCase()) ||
        (userProfilePhone && addressPhone === userProfilePhone)
      );
      const shouldCreateNew = orderingFor === 'someone-else' && isEditingSelfAddress;

      if (editAddress && (editAddress.id || editAddress._id) && !shouldCreateNew) {
        const addressId = editAddress.id || editAddress._id;
        await updateAddress(addressId!, payload);
      } else {
        await addAddress(payload);
      }

      // Show success feedback logic if needed or just navigate
      setTimeout(() => {
        setIsSaving(false);
        sessionStorage.removeItem('checkout_address_draft');
        if ((location.state as any)?.fromAddressBook) {
          navigate(-1);
        } else {
          navigate('/address-book', { replace: true });
        }
      }, 500);
    } catch (error) {
      console.error('Error saving address:', error);
      setIsSaving(false);
      // Show error toast
    }
  };

  const isFormValid = address.name.trim() !== '' &&
    address.phone.trim().length >= 10 &&
    address.flat.trim() !== '' &&
    address.street.trim() !== '' &&
    address.city.trim() !== '' &&
    (address.state?.trim() || '') !== '' &&
    address.pincode.trim().length >= 6;

  return (
    <div className="pb-24 bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors mr-2"
              aria-label="Go back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-neutral-900">Enter complete address</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-neutral-200">
        <label className="block text-xs font-medium text-neutral-700 mb-2">
           Delivery Address Details
        </label>
      </div>

      {/* Live Map Location Picker */}
      <div className="p-4 bg-neutral-50 border-b border-neutral-200">
        <p className="text-xs font-bold text-[#0a193b] mb-2 uppercase tracking-wider flex items-center gap-1.5">
          📍 Locate your address on the map
        </p>
        <div className="h-[220px] w-full rounded-2xl overflow-hidden shadow-sm border border-neutral-200">
          <LocationPickerMap
            initialLat={selectedLatitude}
            initialLng={selectedLongitude}
            onLocationSelect={handleLocationSelect}
            height="100%"
          />
        </div>
        <p className="text-[10px] text-neutral-400 mt-1.5 font-medium">
          Drag the map to place the red pin precisely on your delivery location. Address fields below will auto-fill.
        </p>
      </div>

      {/* Who you are ordering for? */}
      <div className="px-4 py-2.5 border-b border-neutral-200">
        <p className="text-xs font-medium text-neutral-700 mb-2">Who you are ordering for?</p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="orderingFor"
              value="myself"
              checked={orderingFor === 'myself'}
              onChange={(e) => setOrderingFor(e.target.value as 'myself' | 'someone-else')}
              className="w-4 h-4 appearance-none border-2 border-neutral-300 rounded-full bg-white checked:bg-white checked:border-[#0a193b] focus:ring-2 focus:ring-[#0a193b] focus:ring-offset-0"
              style={{
                backgroundImage: orderingFor === 'myself'
                  ? 'radial-gradient(circle, rgb(10, 25, 59) 35%, transparent 40%)'
                  : 'none',
                backgroundSize: '40%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className="text-xs text-neutral-700">Myself</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="orderingFor"
              value="someone-else"
              checked={orderingFor === 'someone-else'}
              onChange={(e) => setOrderingFor(e.target.value as 'myself' | 'someone-else')}
              className="w-4 h-4 appearance-none border-2 border-neutral-300 rounded-full bg-white checked:bg-white checked:border-[#0a193b] focus:ring-2 focus:ring-[#0a193b] focus:ring-offset-0"
              style={{
                backgroundImage: orderingFor === 'someone-else'
                  ? 'radial-gradient(circle, rgb(10, 25, 59) 35%, transparent 40%)'
                  : 'none',
                backgroundSize: '40%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className="text-xs text-neutral-700">Someone else</span>
          </label>
        </div>
      </div>

      {/* Save address as - Only show when ordering for myself */}
      {orderingFor === 'myself' && (
        <div className="px-4 py-2.5 border-b border-neutral-200">
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Save address as <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'work', label: 'Work', icon: '🏢' },
              { id: 'hotel', label: 'Hotel', icon: '🏨' },
              { id: 'other', label: 'Other', icon: '📍' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setAddressType(type.id as typeof addressType)}
                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors flex items-center gap-1.5 ${addressType === type.id
                  ? 'border-[#0a193b] bg-blue-50/50 text-[#0a193b]'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                  }`}
              >
                <span className="text-sm">{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Address Form */}
      <div className="px-4 py-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0a193b] focus:border-[#0a193b] transition-colors ${errors.name ? 'border-red-500' : 'border-neutral-200'
              }`}
            placeholder="Enter your name"
          />
          {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={address.phone}
            onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0a193b] focus:border-[#0a193b] transition-colors ${errors.phone ? 'border-red-500' : 'border-neutral-200'
              }`}
            placeholder="Enter mobile number"
            maxLength={10}
          />
          {errors.phone && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Flat / House No. <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.flat}
            onChange={(e) => handleInputChange('flat', e.target.value)}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0a193b] focus:border-[#0a193b] transition-colors ${errors.flat ? 'border-red-500' : 'border-neutral-200'
              }`}
            placeholder="Flat/House No."
          />
          {errors.flat && <p className="text-[10px] text-red-500 mt-0.5">{errors.flat}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Street / Area <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.street}
            onChange={(e) => handleInputChange('street', e.target.value)}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0a193b] focus:border-[#0a193b] transition-colors ${errors.street ? 'border-red-500' : 'border-neutral-200'
              }`}
            placeholder="Street/Area"
          />
          {errors.street && <p className="text-[10px] text-red-500 mt-0.5">{errors.street}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0a193b] focus:border-[#0a193b] transition-colors ${errors.city ? 'border-red-500' : 'border-neutral-200'
              }`}
            placeholder="City"
          />
          {errors.city && <p className="text-[10px] text-red-500 mt-0.5">{errors.city}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.state || ''}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0a193b] focus:border-[#0a193b] transition-colors ${errors.state ? 'border-red-500' : 'border-neutral-200'
              }`}
            placeholder="State"
          />
          {errors.state && <p className="text-[10px] text-red-500 mt-0.5">{errors.state}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.pincode}
            onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0a193b] focus:border-[#0a193b] transition-colors ${errors.pincode ? 'border-red-500' : 'border-neutral-200'
              }`}
            placeholder="Pincode"
            maxLength={6}
          />
          {errors.pincode && <p className="text-[10px] text-red-500 mt-0.5">{errors.pincode}</p>}
        </div>
      </div>



      {/* Save Address Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-[60] shadow-lg">
        <button
          onClick={handleSaveAddress}
          disabled={!isFormValid || isSaving}
          className={`w-full py-3 px-4 font-semibold text-sm transition-colors ${isFormValid && !isSaving
            ? 'bg-[#0a193b] text-white hover:bg-[#0a193b]/90'
            : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            }`}
        >
          {isSaving ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </div>
  );
}
