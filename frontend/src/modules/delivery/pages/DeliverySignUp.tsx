import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/deliveryAuthService";
import { uploadDocument } from "../../../services/api/uploadService";
import { validateDocumentFile } from "../../../utils/imageUpload";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";

export default function DeliverySignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Calculate maximum date allowed (exactly 18 years ago from today)
  const todayDateObj = new Date();
  const maxDate = new Date(todayDateObj.getFullYear() - 18, todayDateObj.getMonth(), todayDateObj.getDate())
    .toISOString()
    .split("T")[0];

  const defaultFormData = {
    name: "",
    mobile: "",
    email: "",
    dateOfBirth: "",
    password: "delivery123",
    address: "",
    city: "",
    pincode: "",
    drivingLicenseUrl: "",
    nationalIdentityCardUrl: "",
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    bonusType: "",
    vehicleType: "",
    vehicleNumber: "",
  };

  const [formData, setFormData] = useState<typeof defaultFormData>(() => {
    try {
      const saved = localStorage.getItem("deliverySignUpFormData");
      return saved
        ? {
            ...defaultFormData,
            ...JSON.parse(saved),
          }
        : defaultFormData;
    } catch {
      return defaultFormData;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("deliverySignUpFormData", JSON.stringify(formData));
    } catch {
      // Ignore storage errors
    }
  }, [formData]);

  // File state for UI
  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(
    null
  );
  const [nationalIdentityCardFile, setNationalIdentityCardFile] =
    useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCityLoading, setIsCityLoading] = useState(false);



  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else if (name === "name" || name === "city") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^a-zA-Z\s]/g, ""),
      }));
    } else if (name === "ifscCode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11),
      }));
    } else if (name === "pincode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 6),
      }));
    } else if (name === "accountNumber") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 18),
      }));
    } else if (name === "accountName" || name === "bankName") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^a-zA-Z\s]/g, ""),
      }));
    } else if (name === "vehicleNumber") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 10),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const fetchAddressFromLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsCityLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            }`
          );
          const data = await response.json();
          if (data.status === "OK" && data.results[0]) {
            const formattedAddress = data.results[0].formatted_address || "";
            const addressComponents = data.results[0].address_components || [];
            
            const cityComponent = addressComponents.find(
              (c: any) =>
                c.types.includes("locality") ||
                c.types.includes("administrative_area_level_2")
            );
            const pincodeComponent = addressComponents.find(
              (c: any) => c.types.includes("postal_code")
            );
            
            setFormData((prev) => ({
              ...prev,
              ...(formattedAddress ? { address: formattedAddress } : {}),
              ...(cityComponent ? { city: cityComponent.long_name } : {}),
              ...(pincodeComponent ? { pincode: pincodeComponent.long_name } : {}),
            }));
          } else {
            setError("Could not fetch address details from your location");
          }
        } catch (err) {
          setError("Failed to fetch address details");
        } finally {
          setIsCityLoading(false);
        }
      },
      (err) => {
        setError("Location access denied. Please type your address manually.");
        setIsCityLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid document file");
      return;
    }

    if (name === "drivingLicense") {
      setDrivingLicenseFile(file);
    } else if (name === "nationalIdentityCard") {
      setNationalIdentityCardFile(file);
    }
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.name ||
      !formData.mobile ||
      !formData.email ||
      !formData.dateOfBirth ||
      !formData.password ||
      !formData.address ||
      !formData.city ||
      !formData.vehicleType ||
      !formData.vehicleNumber
    ) {
      setError("Please fill all required fields");
      return;
    }

    // Validate age is at least 18 years
    const dob = new Date(formData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      setError("You must be above 18 years of age to apply");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address (e.g., username@domain.com)");
      return;
    }

    if (formData.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(formData.vehicleNumber)) {
      setError("Invalid Vehicle Number format. Example: UP32AB1234");
      return;
    }

    if (
      formData.accountNumber &&
      (formData.accountNumber.length < 9 || formData.accountNumber.length > 18)
    ) {
      setError("Account number must be between 9 and 18 digits");
      return;
    }

    if (
      formData.ifscCode &&
      !/^[A-Z]{4}\d{7}$/.test(formData.ifscCode)
    ) {
      setError("IFSC code must be 4 letters followed by 7 digits");
      return;
    }

    if (!drivingLicenseFile) {
      setError("Please upload your Driving License");
      return;
    }

    if (!nationalIdentityCardFile) {
      setError("Please upload your National Identity Card");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Upload documents if provided
      let drivingLicenseUrl = formData.drivingLicenseUrl;
      let nationalIdentityCardUrl = formData.nationalIdentityCardUrl;

      if (drivingLicenseFile || nationalIdentityCardFile) {
        setUploadingDocs(true);

        if (drivingLicenseFile) {
          const drivingLicenseResult = await uploadDocument(
            drivingLicenseFile,
            "kosil/delivery/documents"
          );
          drivingLicenseUrl = drivingLicenseResult.secureUrl;
        }

        if (nationalIdentityCardFile) {
          const nationalIdResult = await uploadDocument(
            nationalIdentityCardFile,
            "kosil/delivery/documents"
          );
          nationalIdentityCardUrl = nationalIdResult.secureUrl;
        }

        setUploadingDocs(false);
      }

      const response = await register({
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        dateOfBirth: formData.dateOfBirth || undefined,
        password: formData.password,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode || undefined,
        drivingLicense: drivingLicenseUrl || undefined,
        nationalIdentityCard: nationalIdentityCardUrl || undefined,
        accountName: formData.accountName || undefined,
        bankName: formData.bankName || undefined,
        accountNumber: formData.accountNumber || undefined,
        ifscCode: formData.ifscCode || undefined,
        bonusType: formData.bonusType || undefined,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber,
      });

      if (response.success) {
        // Registration successful, now send SMS OTP for verification
        try {
          const otpRes = await sendOTP(formData.mobile);
          if (otpRes.sessionId) setSessionId(otpRes.sessionId);
          try {
            localStorage.removeItem("deliverySignUpFormData");
          } catch {
            // ignore storage errors
          }
          setShowOTP(true);
        } catch (otpErr: any) {
          setError(
            otpErr.response?.data?.message || otpErr.message || "Registration successful but failed to send OTP."
          );
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(formData.mobile, otp, sessionId);
      if (response.success && response.data) {
        // Update auth context
        login(response.data.token, {
          ...response.data.user,
          userType: "Delivery",
        });

        // FCM token registration is handled globally by App.tsx when auth state changes
        // No need to call registerFCMToken here - it would cause duplicate notifications

        navigate("/delivery");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Invalid OTP. Please try again.");
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
      <div className="w-full max-w-sm sm:max-w-md bg-[#f8f6f2] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 relative z-10">
        {/* Header Section */}
        <div className="px-6 py-6 text-center border-b border-[#0a193b]/10 bg-white">
          <h1 className="text-xl sm:text-2xl font-black text-[#0a193b] mb-1">
            Delivery Sign Up
          </h1>
          <p className="text-[#c5a059] text-xs sm:text-sm font-bold tracking-widest uppercase">
            Create your delivery partner account
          </p>
        </div>

        {/* Sign Up Form */}
        <div
          className="p-6 space-y-5 delivery-signup-form"
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
          <style>{`
            .delivery-signup-form::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {!showOTP ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Information */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-[#0a193b]/80 border-b pb-2 uppercase tracking-wider">
                  Personal Information
                </h3>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
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
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    onFocus={() => {
                      if (!formData.dateOfBirth) {
                        setFormData({ ...formData, dateOfBirth: maxDate });
                      }
                    }}
                    max={maxDate}
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                  <p className="text-xs text-neutral-400 font-semibold mt-1">
                    * You must be above 18 years of age to apply
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address"
                      required
                      className="w-full pr-12 px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                      disabled={loading || isCityLoading}
                    />
                    <button
                      type="button"
                      onClick={fetchAddressFromLocation}
                      disabled={isCityLoading || loading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#c5a059] hover:bg-neutral-50 rounded-xl transition-colors disabled:text-neutral-400"
                      title="Fetch current location to auto fill address, city & pincode">
                      {isCityLoading ? (
                        <div className="w-4 h-4 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
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
                    placeholder="Enter your city"
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="Enter pincode"
                    maxLength={6}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Bank Information */}
              <div className="space-y-5 pt-4 border-t border-neutral-200/50">
                <h3 className="text-sm font-bold text-[#0a193b]/80 border-b pb-2 uppercase tracking-wider">
                  Bank Account Information (Optional)
                </h3>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Account holder name"
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Bank name"
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    inputMode="numeric"
                    pattern="[0-9]{9,18}"
                    maxLength={18}
                    title="Account number must be between 9 and 18 digits"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Account number"
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="IFSC code"
                    maxLength={11}                    pattern="[A-Za-z]{4}[0-9]{7}"                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="space-y-5 pt-4 border-t border-neutral-200/50">
                <h3 className="text-sm font-bold text-[#0a193b]/80 border-b pb-2 uppercase tracking-wider">
                  Vehicle Information
                </h3>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all cursor-pointer"
                    disabled={loading}
                  >
                    <option value="">Select vehicle type</option>
                    <option value="Bike">Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Car">Car</option>
                    <option value="Cycle">Cycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. UP32AB1234"
                    maxLength={10}
                    required
                    className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Documents Section */}
              <div className="space-y-5 pt-4 border-t border-neutral-200/50">
                <h3 className="text-sm font-bold text-[#0a193b]/80 border-b pb-2 uppercase tracking-wider">
                  Documents Required
                </h3>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    Driving License <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="drivingLicense"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.pdf"
                      required
                      className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                      disabled={loading || uploadingDocs}
                    />
                    {drivingLicenseFile && (
                      <p className="text-xs text-neutral-500 font-semibold">
                        {drivingLicenseFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                    National Identity Card <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="nationalIdentityCard"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.pdf"
                      required
                      className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 shadow-sm transition-all"
                      disabled={loading || uploadingDocs}
                    />
                    {nationalIdentityCardFile && (
                      <p className="text-xs text-neutral-500 font-semibold">
                        {nationalIdentityCardFile.name}
                      </p>
                    )}
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
                disabled={loading || uploadingDocs}
                className={`w-full h-12 rounded-2xl font-bold text-sm transition-all flex items-center justify-center ${
                  !loading && !uploadingDocs
                    ? "bg-[#0a193b] text-white hover:bg-[#0a193b]/90 shadow-lg shadow-primary-500/10 active:scale-[0.98]"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}>
                {uploadingDocs
                  ? "Uploading Documents..."
                  : loading
                    ? "Creating Account..."
                    : "Sign Up"}
              </button>

              {/* Login Link */}
              <div className="text-center pt-4 border-t border-neutral-200/50">
                <p className="text-xs sm:text-sm font-semibold text-neutral-500">
                  Already have a delivery partner account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/delivery/login")}
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
                  Enter the 4-digit OTP sent via voice call to
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
                      const res = await sendOTP(formData.mobile);
                      if (res.sessionId) setSessionId(res.sessionId);
                    } catch (err: any) {
                      setError(err.response?.data?.message || err.message || "Failed to resend OTP.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs bg-white text-[#c5a059] border-2 border-[#c5a059] hover:bg-[#c5a059] hover:text-white transition-all active:scale-[0.98] shadow-sm">
                  {loading ? "Calling..." : "Resend OTP"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Links */}
      <div className="flex items-center justify-center gap-4 text-xs font-bold text-neutral-400 mt-6 relative z-10">
        <button onClick={() => navigate('/delivery/help')} className="hover:text-[#c5a059] transition-colors">Help & Support</button>
        <span>•</span>
        <button onClick={() => navigate('/delivery/terms')} className="hover:text-[#c5a059] transition-colors">Terms of Service</button>
        <span>•</span>
        <button onClick={() => navigate('/delivery/privacy')} className="hover:text-[#c5a059] transition-colors">Privacy Policy</button>
      </div>
    </div>
  );
}
