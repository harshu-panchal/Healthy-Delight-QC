import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendOTP,
  verifyOTP,
} from "../../services/api/auth/customerAuthService";
import { useAuth } from "../../context/AuthContext";
import OTPInput from "../../components/OTPInput";
import Lottie from "lottie-react";
import cowAnimation from "@assets/animation/cow_drink.json";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError("");

    try {
      const response = await sendOTP(mobileNumber);
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
      setShowOTP(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Failed to initiate call. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(mobileNumber, otp, sessionId);
      if (response.success && response.data) {
        login(response.data.token, {
          id: response.data.user.id,
          name: response.data.user.name,
          phone: response.data.user.phone,
          email: response.data.user.email,
          walletAmount: response.data.user.walletAmount,
          refCode: response.data.user.refCode,
          status: response.data.user.status,
        });

        navigate("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fefcf3] via-[#fff4d6] to-[#ffe4c4] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-8 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors"
        aria-label="Back"
      >
        <svg
          width="18"
          height="18"
          className="sm:w-5 sm:h-5"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Login Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-amber-100">
        {/* Header with logo + animation */}
        <div className="px-5 py-3 sm:px-6 sm:py-4 border-b bg-gradient-to-b from-amber-50 to-white border-amber-200 text-center flex flex-col items-center">
          <img
            src="/assets/kosil1.png"
            alt="Healthy Delight"
            className="h-20 sm:h-24 w-auto object-contain mb-2"
          />
          <div className="w-56 h-56 sm:w-72 sm:h-72 -my-8 sm:-my-12">
            <Lottie
              animationData={cowAnimation}
              loop
              className="w-full h-full"
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-amber-900">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-amber-800 opacity-90">
              Fresh dairy & groceries delivered in minutes.
            </p>
          </div>
        </div>

        {/* Login Section */}
        <div className="bg-white flex flex-col items-center px-5 py-5 sm:p-6 space-y-3">
          {!showOTP ? (
            <>
              {/* Mobile Number Input */}
              <div className="w-full mb-1.5 sm:mb-2.5 relative z-10">
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex items-center bg-white border border-neutral-300 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-colors">
                  <div className="px-3 py-2 text-xs sm:text-sm font-medium text-neutral-500 border-r border-neutral-300 bg-neutral-50">
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
                    className="flex-1 px-3 py-2 sm:py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none bg-white text-neutral-800"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="w-full mb-1 relative z-10 text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
                  {error}
                </div>
              )}

              {/* Continue Button */}
              <div className="w-full mb-1 relative z-10">
                <button
                  onClick={handleContinue}
                  disabled={mobileNumber.length !== 10 || loading}
                  className={`w-full py-2.5 sm:py-3 rounded-xl font-semibold text-sm transition-colors border px-3 ${mobileNumber.length === 10 && !loading
                    ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-md"
                    : "bg-neutral-300 text-neutral-500 cursor-not-allowed border-neutral-300"
                    }`}
                >
                  {loading ? "Calling..." : "Continue"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* OTP Verification */}
              <div className="w-full mb-2 relative z-10 text-center">
                <p className="text-xs text-neutral-600 mb-2">
                  Enter the 4-digit OTP sent via voice call to
                </p>
                <p className="text-xs font-semibold text-neutral-800">
                  +91 {mobileNumber}
                </p>
              </div>
              <div className="w-full mb-2 relative z-10 flex justify-center">
                <OTPInput onComplete={handleOTPComplete} disabled={loading} />
              </div>
              {error && (
                <div className="w-full mb-1 relative z-10 text-xs text-red-600 bg-red-50 p-2 rounded text-center border border-red-100">
                  {error}
                </div>
              )}
              <div className="w-full mb-1 relative z-10 flex gap-2">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors border border-neutral-300"
                >
                  Change Number
                </button>
                <button
                  onClick={handleContinue}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 transition-colors"
                >
                  {loading ? "Verifying..." : "Resend OTP"}
                </button>
              </div>
            </>
          )}

          {/* Signup Link */}
          <div className="text-center pt-2 mb-2">
            <p className="text-xs sm:text-sm text-neutral-600">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                Sign Up
              </button>
            </p>
          </div>

          {/* Privacy Text */}
          <p className="text-[9px] sm:text-[10px] text-neutral-500 text-center max-w-sm leading-tight px-4 relative z-10 pb-1">
            Access your saved addresses from Healthy Delight automatically!
          </p>
        </div>
      </div>
    </div>
  );
}
