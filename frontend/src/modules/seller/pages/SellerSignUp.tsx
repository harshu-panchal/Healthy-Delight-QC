import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/sellerAuthService";
import OTPInput from "../../../components/OTPInput";
import GoogleMapsAutocomplete from "../../../components/GoogleMapsAutocomplete";
import { useAuth } from "../../../context/AuthContext";
import LocationPickerMap from "../../../components/LocationPickerMap";
import { useEffect } from "react";

export default function SellerSignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    sellerName: "",
    mobile: "",
    email: "",
    storeName: "",
    category: "",
    categories: [] as string[],
    address: "",
    city: "",
    panCard: "",
    taxName: "",
    taxNumber: "",
    searchLocation: "",
    latitude: "",
    longitude: "",
    serviceRadiusKm: "10", // Default 10km
    accountName: "",
    bankName: "",
    branch: "",
    accountNumber: "",
    ifsc: "",
  });
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else if (name === "sellerName" || name === "city" || name === "taxName") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^a-zA-Z\s]/g, ""),
      }));
    } else if (name === "panCard" || name === "ifsc" || name === "taxNumber") {
      let maxLen = 10;
      if (name === "ifsc") maxLen = 11;
      else if (name === "taxNumber") maxLen = 15;

      setFormData((prev) => ({
        ...prev,
        [name]: value
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase()
          .slice(0, maxLen),
      }));
    } else if (name === "serviceRadiusKm") {
      // Allow only numbers and a single decimal point
      const cleanedValue = value.replace(/[^0-9.]/g, "");
      // Ensure only one decimal point
      const parts = cleanedValue.split(".");
      const finalValue =
        parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleanedValue;

      setFormData((prev) => ({
        ...prev,
        [name]: finalValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields (password removed - not needed during signup)
    if (!formData.sellerName) {
      setError("Full Name cannot be empty");
      return;
    }
    if (!formData.mobile) {
      setError("Mobile Number cannot be empty");
      return;
    }
    if (!formData.email) {
      setError("Email Address cannot be empty");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address (e.g., username@domain.com)");
      return;
    }
    if (!formData.storeName) {
      setError("Store Name cannot be empty");
      return;
    }
    if (!formData.panCard) {
      setError("PAN Card cannot be empty");
      return;
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(formData.panCard.toUpperCase())) {
      setError("Invalid PAN Card format. Must be 5 letters, 4 numbers, followed by 1 letter (e.g., ABCDE1234F)");
      return;
    }
    if (!formData.taxName) {
      setError("Name as per GST/PAN cannot be empty");
      return;
    }
    if (!formData.taxNumber) {
      setError("GSTIN cannot be empty");
      return;
    }
    if (formData.taxNumber.length !== 15) {
      setError("GSTIN must be exactly 15 characters");
      return;
    }
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(formData.taxNumber.toUpperCase())) {
      setError("Invalid GSTIN format. Enforce standard 15-character GSTIN format (e.g., 27AAAAA1111A1Z1)");
      return;
    }
    if (!formData.ifsc) {
      setError("IFSC Code cannot be empty");
      return;
    }
    if (formData.ifsc.length !== 11) {
      setError("IFSC Code must be exactly 11 characters");
      return;
    }
    const ifscRegex = /^[A-Z]{4}[0-9]{7}$/;
    if (!ifscRegex.test(formData.ifsc.toUpperCase())) {
      setError("Invalid IFSC Code format. Must be 4 letters followed by 7 digits (e.g., ABCD1234567)");
      return;
    }
    if (!formData.address && !formData.searchLocation) {
      setError("Store Location cannot be empty");
      return;
    }
    if (!formData.city) {
      setError("City cannot be empty");
      return;
    }

    if (formData.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate location is selected
      if (
        !formData.searchLocation ||
        !formData.latitude ||
        !formData.longitude
      ) {
        setError("Please select your store location using the location search");
        return;
      }

      // Validate service radius
      if (!formData.serviceRadiusKm) {
        setError("Service Radius cannot be empty");
        return;
      }
      const radius = parseFloat(formData.serviceRadiusKm);
      if (isNaN(radius) || radius < 0.1 || radius > 100) {
        setError("Service radius must be between 0.1 and 100 kilometers");
        return;
      }

      const response = await register({
        sellerName: formData.sellerName,
        mobile: formData.mobile,
        email: formData.email,
        storeName: formData.storeName,
        address: formData.address || formData.searchLocation,
        city: formData.city,
        panCard: formData.panCard,
        taxName: formData.taxName,
        taxNumber: formData.taxNumber,
        ifsc: formData.ifsc,
        searchLocation: formData.searchLocation,
        latitude: formData.latitude,
        longitude: formData.longitude,
        serviceRadiusKm: formData.serviceRadiusKm,
      });

      if (response.success) {
        // Clear token from registration (we'll get it after OTP verification)
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        // Registration successful, now send OTP for verification
        try {
          await sendOTP(formData.mobile);
          setShowOTP(true);
        } catch (otpErr: any) {
          setError(
            otpErr.response?.data?.message ||
              "Registration successful but failed to send OTP."
          );
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(formData.mobile, otp);
      if (response.success && response.data) {
        // Update auth context with seller data
        login(response.data.token, {
          id: response.data.user.id,
          name: response.data.user.sellerName,
          email: response.data.user.email,
          phone: response.data.user.mobile,
          userType: "Seller",
          storeName: response.data.user.storeName,
          status: response.data.user.status,
          address: response.data.user.address,
          city: response.data.user.city,
        });
        // Navigate to seller dashboard
        navigate("/seller", { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a193b] via-[#0d214f] to-[#050e24] flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden font-outfit">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#c5a059]/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#c5a059]/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95 shadow-lg backdrop-blur-sm"
        aria-label="Back">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Sign Up Card */}
      <div className="w-full max-w-md bg-[#f8f6f2] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 relative z-10">
        {/* Header Section */}
        <div className="px-6 py-6 text-center border-b border-[#0a193b]/10 bg-white">
          <h1 className="text-xl sm:text-2xl font-black text-[#0a193b] mb-1">
            Seller Sign Up
          </h1>
          <p className="text-[#c5a059] text-xs sm:text-sm font-bold tracking-widest uppercase">
            Create your seller account
          </p>
        </div>

        {/* Sign Up Form */}
        <div
          className="p-6 space-y-5 seller-signup-form"
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
          <style>{`
            .seller-signup-form::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {!showOTP ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Required Fields Section */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Seller Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="sellerName"
                    value={formData.sellerName}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center bg-white border border-neutral-200 rounded-2xl overflow-hidden focus-within:border-[#c5a059] focus-within:ring-2 focus-within:ring-[#c5a059]/20 h-12 shadow-sm transition-all">
                    <div className="px-4 py-2 text-sm font-bold text-neutral-600 border-r border-neutral-100 bg-[#f8f6f2] h-full flex items-center">
                      +91
                    </div>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter mobile number"
                      required
                      maxLength={10}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-neutral-800 placeholder:text-neutral-400 focus:outline-none bg-white"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    placeholder="Enter store name"
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Store Location <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <GoogleMapsAutocomplete
                        value={formData.searchLocation}
                        onChange={(
                          address: string,
                          lat: number,
                          lng: number,
                          placeName: string,
                          components?: { city?: string; state?: string }
                        ) => {
                          setFormData((prev) => ({
                            ...prev,
                            searchLocation: address,
                            latitude: lat.toString(),
                            longitude: lng.toString(),
                            address: address,
                            city: components?.city || prev.city,
                          }));
                        }}
                        placeholder="Search your store location..."
                        disabled={loading}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          setLoading(true);
                           navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const lat = position.coords.latitude;
                              const lng = position.coords.longitude;
                              
                              const googleMaps = (window as any).google?.maps;
                              if (googleMaps && googleMaps.Geocoder) {
                                const geocoder = new googleMaps.Geocoder();
                                geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
                                  if (status === "OK" && results && results[0]) {
                                    const address = results[0].formatted_address;
                                    
                                    // Parse city/locality
                                    let city = "";
                                    for (const component of results[0].address_components) {
                                      if (component.types.includes("locality")) {
                                        city = component.long_name;
                                        break;
                                      } else if (component.types.includes("administrative_area_level_2")) {
                                        city = component.long_name;
                                      }
                                    }
 
                                    setFormData((prev) => ({
                                      ...prev,
                                      latitude: lat.toString(),
                                      longitude: lng.toString(),
                                      searchLocation: address,
                                      address: address,
                                      city: city || prev.city,
                                    }));
                                  } else {
                                    const locationStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                                    setFormData((prev) => ({
                                      ...prev,
                                      latitude: lat.toString(),
                                      longitude: lng.toString(),
                                      searchLocation: locationStr,
                                      address: locationStr,
                                    }));
                                  }
                                  setLoading(false);
                                });
                              } else {
                                const locationStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                                setFormData((prev) => ({
                                  ...prev,
                                  latitude: lat.toString(),
                                  longitude: lng.toString(),
                                  searchLocation: locationStr,
                                  address: locationStr,
                                }));
                                setLoading(false);
                              }
                            },
                            (error) => {
                              console.error(error);
                              setError("Unable to retrieve your location");
                              setLoading(false);
                            }
                          );
                        } else {
                          setError(
                            "Geolocation is not supported by your browser"
                          );
                        }
                      }}
                      className="p-2.5 bg-white text-[#c5a059] rounded-2xl border border-neutral-200 hover:bg-neutral-50 transition-all flex items-center justify-center shadow-sm"
                      title="Use Current Location">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6z" />
                        <path d="M12 8v8" />
                        <path d="M8 12h8" />
                      </svg>
                    </button>
                  </div>

                  {formData.latitude && formData.longitude ? (
                    <div className="mt-4 animate-fadeIn">
                      <p className="text-sm font-semibold text-neutral-700 mb-2">
                        Exact Location{" "}
                        <span className="text-[#c5a059] text-xs font-semibold">
                          (Move the map to place the pin on your store's
                          entrance)
                        </span>
                      </p>
                      <LocationPickerMap
                        initialLat={parseFloat(formData.latitude)}
                        initialLng={parseFloat(formData.longitude)}
                        onLocationSelect={(lat, lng) => {
                          const googleMaps = (window as any).google?.maps;
                          if (googleMaps && googleMaps.Geocoder) {
                            const geocoder = new googleMaps.Geocoder();
                            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
                              if (status === "OK" && results && results[0]) {
                                const address = results[0].formatted_address;
                                let city = "";
                                for (const component of results[0].address_components) {
                                  if (component.types.includes("locality")) {
                                    city = component.long_name;
                                    break;
                                  } else if (component.types.includes("administrative_area_level_2")) {
                                    city = component.long_name;
                                  }
                                }
                                setFormData((prev) => ({
                                  ...prev,
                                  latitude: lat.toString(),
                                  longitude: lng.toString(),
                                  searchLocation: address,
                                  address: address,
                                  city: city || prev.city,
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  latitude: lat.toString(),
                                  longitude: lng.toString(),
                                }));
                              }
                            });
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              latitude: lat.toString(),
                              longitude: lng.toString(),
                            }));
                          }
                        }}
                      />
                      <p className="mt-1 text-xs text-neutral-500 text-center font-semibold">
                        Selected Coordinates: {formData.latitude},{" "}
                        {formData.longitude}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-neutral-500 bg-neutral-50 p-3 rounded-2xl border border-neutral-100 text-center font-medium">
                      Search for a location or use the location button to view
                      the map and set exact coordinates.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Delivery/Service Radius (KM){" "}
                    <span className="text-red-500">*</span>
                    <span className="text-xs font-semibold text-neutral-400 normal-case tracking-normal ml-1">
                      (Distance you can deliver)
                    </span>
                  </label>
                  <input
                    type="number"
                    name="serviceRadiusKm"
                    value={formData.serviceRadiusKm}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Enter service radius in KM (e.g. 10)"
                    required
                    min="0.1"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-neutral-400 font-semibold">
                    Only customers within this radius can see and order your
                    products
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                {/* Hidden fields for coordinates */}
                <input
                  type="hidden"
                  name="latitude"
                  value={formData.latitude}
                />
                <input
                  type="hidden"
                  name="longitude"
                  value={formData.longitude}
                />
              </div>

              {/* Optional Fields Section */}
              <div className="space-y-5 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                      PAN Card <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="panCard"
                      value={formData.panCard}
                      onChange={handleInputChange}
                      placeholder="e.g. ABCDE1234F"
                      required
                      maxLength={10}
                      pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}"
                      title="Enforce standard PAN format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)"
                      className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                      Name as per GST/PAN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="taxName"
                      value={formData.taxName}
                      onChange={handleInputChange}
                      placeholder="Name as per GST/PAN"
                      required
                      pattern="[A-Za-z\s]+"
                      title="Name can only contain alphabetical letters and spaces"
                      className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                      GSTIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="taxNumber"
                      value={formData.taxNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      required
                      maxLength={15}
                      minLength={15}
                      pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}Z[0-9A-Za-z]{1}"
                      title="Enforce 15-character alphanumeric GSTIN format (e.g. 27AAAAA1111A1Z1)"
                      className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                      IFSC Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="ifsc"
                      value={formData.ifsc}
                      onChange={handleInputChange}
                      placeholder="IFSC Code"
                      required
                      maxLength={11}
                      pattern="[A-Za-z]{4}[0-9]{7}"
                      title="IFSC Code must be 4 letters followed by 7 digits (e.g., ABCD1234567)"
                      className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full h-12 rounded-2xl font-bold text-sm transition-all flex items-center justify-center ${
                  !loading
                    ? "bg-[#0a193b] text-white hover:bg-[#0a193b]/90 shadow-lg shadow-primary-500/10 active:scale-[0.98]"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}>
                {loading ? "Creating Account..." : "Sign Up"}
              </button>

              {/* Login Link */}
              <div className="text-center pt-4 border-t border-neutral-200/50">
                <p className="text-xs sm:text-sm font-semibold text-neutral-500">
                  Already have a seller account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/seller/login")}
                    className="text-[#c5a059] hover:text-[#b48d48] font-bold transition-colors">
                    Login
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Enter the 4-digit OTP sent to
                </p>
                <p className="text-base font-bold text-[#0a193b]">
                  +91 {formData.mobile}
                </p>
              </div>

              <OTPInput onComplete={handleOTPComplete} disabled={loading} />

              {error && (
                <div className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 transition-all active:scale-[0.98]">
                  Back
                </button>
                <button
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      await sendOTP(formData.mobile);
                    } catch (err: any) {
                      setError(
                        err.response?.data?.message || "Failed to resend OTP."
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs bg-white text-[#c5a059] border-2 border-[#c5a059] hover:bg-[#c5a059] hover:text-white transition-all active:scale-[0.98] shadow-sm">
                  {loading ? "Resending..." : "Resend OTP"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Text */}
      <p className="mt-6 text-xs font-semibold text-neutral-400 text-center max-w-md relative z-10">
        By continuing, you agree to Healthy Delight's{" "}
        <span
          onClick={() => navigate('/seller/terms-of-service')}
          className="text-[#c5a059] hover:text-[#b48d48] font-bold cursor-pointer transition-colors"
        >
          Terms of Service
        </span>{" "}
        and{" "}
        <span
          onClick={() => navigate('/seller/privacy-policy')}
          className="text-[#c5a059] hover:text-[#b48d48] font-bold cursor-pointer transition-colors"
        >
          Privacy Policy
        </span>
      </p>
    </div>
  );
}
