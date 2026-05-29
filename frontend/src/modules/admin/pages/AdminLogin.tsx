import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/adminAuthService";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMobileLogin = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError("");

    try {
      await sendOTP(mobileNumber);
      setShowOTP(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(mobileNumber, otp);
      if (response.success && response.data) {
        // Update AuthContext with token and user data
        login(response.data.token, {
          ...response.data.user,
          userType: "Admin",
        });

        // FCM token registration is handled globally by App.tsx when auth state changes
        // No need to call registerFCMToken here - it would cause duplicate notifications

        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKosilLogin = () => {
    // Handle legacy Kosil login logic here
    navigate("/admin");
  };

  const handleSellerLogin = () => {
    // Navigate to seller login page
    navigate("/seller/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a193b] via-[#0d214f] to-[#050e24] flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden font-outfit">
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

      {/* Login Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-[#f8f6f2] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 relative z-10">
        {/* Header Section */}
        <div className="px-6 py-6 sm:px-8 sm:py-8 text-center border-b border-[#0a193b]/10 bg-white">
          <div className="py-2 mb-2">
            <img
              src="/assets/logo.png"
              alt="Healthy Delight"
              className="h-16 sm:h-20 w-auto mx-auto object-contain transition-transform hover:scale-105"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0a193b] mb-1">
            Admin Login
          </h1>
          <p className="text-[#c5a059] text-xs sm:text-sm font-bold tracking-widest uppercase">
            Access your admin dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="px-6 py-6 sm:p-8 space-y-5">
          {!showOTP ? (
            /* Mobile Login Form */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#0a193b]/70 uppercase tracking-widest mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center bg-white border border-neutral-200 rounded-2xl overflow-hidden focus-within:border-[#c5a059] focus-within:ring-2 focus-within:ring-[#c5a059]/20 transition-all h-12 shadow-sm">
                  <div className="px-4 py-2 text-sm font-bold text-neutral-600 border-r border-neutral-100 bg-[#f8f6f2] h-full flex items-center">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="Enter mobile number"
                    className="flex-1 px-4 py-2 text-sm font-semibold text-neutral-800 placeholder:text-neutral-400 focus:outline-none bg-white"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs sm:text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleMobileLogin}
                disabled={mobileNumber.length !== 10 || loading}
                className={`w-full h-12 rounded-2xl font-bold text-sm transition-all flex items-center justify-center ${
                  mobileNumber.length === 10 && !loading
                    ? "bg-[#0a193b] text-white hover:bg-[#0a193b]/90 shadow-lg shadow-primary-500/10 active:scale-[0.98]"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}>
                {loading ? "Sending OTP..." : "Continue"}
              </button>
            </div>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Enter the 4-digit OTP sent to
                </p>
                <p className="text-base font-bold text-[#0a193b]">
                  +91 {mobileNumber}
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
                  Change Number
                </button>
                <button
                  onClick={handleMobileLogin}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs bg-white text-[#c5a059] border-2 border-[#c5a059] hover:bg-[#c5a059] hover:text-white transition-all active:scale-[0.98] shadow-sm">
                  {loading ? "Verifying..." : "Resend OTP"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
