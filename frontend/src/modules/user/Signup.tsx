import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import Lottie from "lottie-react";
import {
    sendOTP,
    verifyOTP,
} from "../../services/api/auth/customerAuthService";
import { useAuth } from "../../context/AuthContext";
import OTPInput from "../../components/OTPInput";

// Assets
import logoSrc from "../../../assets/logo.png";

export default function Signup() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const handleGoToLogin = () => {
        navigate('/login', {
            state: {
                skipBranding: true,
                showOTP: location.state?.fromShowOTP,
                mobileNumber: location.state?.fromMobileNumber,
                sessionId: location.state?.fromSessionId
            }
        });
    };

    const [formData, setFormData] = useState(() => {
        const saved = sessionStorage.getItem("signup_formData");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                // Ignore error
            }
        }
        return { name: "", mobileNumber: "" };
    });
    const [customerType, setCustomerType] = useState<"retailer" | "wholesaler">(() => {
        const saved = sessionStorage.getItem("signup_customerType");
        return (saved === "retailer" || saved === "wholesaler") ? saved : "retailer";
    });
    const [showOTP, setShowOTP] = useState(() => {
        const saved = sessionStorage.getItem("signup_showOTP");
        return saved === "true";
    });
    const [enteredOTP, setEnteredOTP] = useState(() => {
        return sessionStorage.getItem("signup_enteredOTP") || "";
    });
    const [sessionId, setSessionId] = useState(() => {
        return sessionStorage.getItem("signup_sessionId") || "";
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [animationData, setAnimationData] = useState<any>(null);

    // Sync form state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem("signup_formData", JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        sessionStorage.setItem("signup_customerType", customerType);
    }, [customerType]);

    useEffect(() => {
        sessionStorage.setItem("signup_showOTP", String(showOTP));
    }, [showOTP]);

    useEffect(() => {
        sessionStorage.setItem("signup_enteredOTP", enteredOTP);
    }, [enteredOTP]);

    useEffect(() => {
        sessionStorage.setItem("signup_sessionId", sessionId);
    }, [sessionId]);

    // Load Lottie animation dynamically on mount
    useEffect(() => {
        let active = true;
        import("../../../assets/login/login_screen_animation.json").then((module) => {
            if (active) {
                setAnimationData(module.default);
            }
        });
        return () => {
            active = false;
        };
    }, []);

    const handleContinue = async () => {
        if (formData.mobileNumber.length !== 10) return;
        if (!formData.name.trim()) {
            setError("Please enter your name");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await sendOTP(formData.mobileNumber, 'signup');
            if (response.sessionId) {
                setSessionId(response.sessionId);
            }
            setShowOTP(true);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                "Failed to send OTP. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = useCallback(async (otpToVerify?: string) => {
        const otpValue = otpToVerify || enteredOTP;
        if (otpValue.length !== 4) return;

        setLoading(true);
        setError("");

        try {
            const response = await verifyOTP(
                formData.mobileNumber,
                otpValue,
                sessionId,
                formData.name,
                customerType,
                'signup'
            );
            if (response.success && response.data) {
                // Clear sign up form state from sessionStorage on successful registration
                sessionStorage.removeItem("signup_formData");
                sessionStorage.removeItem("signup_customerType");
                sessionStorage.removeItem("signup_showOTP");
                sessionStorage.removeItem("signup_enteredOTP");
                sessionStorage.removeItem("signup_sessionId");

                login(response.data.token, {
                    id: response.data.user.id,
                    name: response.data.user.name || formData.name,
                    phone: response.data.user.phone,
                    email: response.data.user.email,
                    walletAmount: response.data.user.walletAmount,
                    refCode: response.data.user.refCode,
                    status: response.data.user.status,
                    customerType: response.data.user.customerType || customerType,
                    userType: "Customer",
                });
                navigate("/");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [formData, sessionId, login, navigate, enteredOTP, customerType]);

    const handleOTPComplete = useCallback((otp: string) => {
        setEnteredOTP(otp);
        handleVerifyOTP(otp);
    }, [handleVerifyOTP]);

    return (
        <div className="hd-login-root">
            {/* ── BACK BUTTON ── */}
            <button
                onClick={() => {
                    if (showOTP) {
                        setShowOTP(false);
                        setError('');
                    } else {
                        handleGoToLogin();
                    }
                }}
                className="hd-back-btn"
                aria-label="Go back"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* ── HERO PANEL ── */}
            <div className={`hd-top-panel ${showOTP ? 'hd-otp-focus' : ''}`}>
                <div className="hd-hero-strip hd-hero-in">
                    {animationData && (
                        <Lottie
                            animationData={animationData}
                            loop={true}
                            autoplay={true}
                            rendererSettings={{
                                preserveAspectRatio: 'xMidYMid slice'
                            }}
                            className="hd-lottie-player"
                        />
                    )}
                    <div className="hd-hero-bottom-overlay" />
                </div>

                {/* LOGO BADGE */}
                <div className={`hd-logo-badge hd-logo-in ${showOTP ? 'hd-logo-otp' : ''}`}>
                    <img src={logoSrc} alt="Healthy Delight" className="hd-logo-img" />
                </div>
            </div>

            <div className="hd-bottom-panel hd-bottom-in">
                <div className="hd-form-card">
                    {!showOTP && (
                        <div className="hd-tagline">
                            <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#0a193b] leading-tight font-outfit">
                                Create your account
                            </h1>
                            <p className="text-[12px] sm:text-[13px] text-[#64748b] mt-1 font-medium">
                                Join Healthy Delight for fresh deliveries!
                            </p>
                        </div>
                    )}

                    {showOTP && (
                        <div className="hd-tagline">
                            <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#0a193b] leading-tight font-outfit">
                                Verify your number
                            </h1>
                            <p className="text-[12px] sm:text-[13px] text-[#64748b] mt-1 font-medium">
                                Code sent to +91 {formData.mobileNumber}
                            </p>
                        </div>
                    )}

                    <div className="hd-input-section">
                        {!showOTP ? (
                            <div className="hd-input-group">
                                {/* Name Input */}
                                <div className="hd-field-group">
                                    <label className="hd-field-label">Full Name</label>
                                    <div className="hd-input-row">
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, "") })}
                                            placeholder="Enter your name"
                                            className="hd-text-input"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Account Type Selection */}
                                <div className="hd-field-group">
                                    <label className="hd-field-label">I want to shop as a:</label>
                                    <div className="flex gap-3 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setCustomerType("retailer")}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${customerType === "retailer"
                                                ? "border-[#c5a059] bg-[#c5a059]/5 text-[#0a193b]"
                                                : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                                                }`}
                                        >
                                            <span className="text-[13px] font-bold">Retailer</span>
                                            <span className="text-[9px] opacity-70">Standard Shopping</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomerType("wholesaler")}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${customerType === "wholesaler"
                                                ? "border-[#c5a059] bg-[#c5a059]/5 text-[#0a193b]"
                                                : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                                                }`}
                                        >
                                            <span className="text-[13px] font-bold">Wholesaler</span>
                                            <span className="text-[9px] opacity-70">Bulk & B2B Prices</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile Input */}
                                <div className="hd-field-group">
                                    <label className="hd-field-label">Mobile Number</label>
                                    <div className="hd-phone-row">
                                        <div className="hd-prefix">+91</div>
                                        <input
                                            type="tel"
                                            value={formData.mobileNumber}
                                            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                            placeholder="Enter mobile number"
                                            className="hd-phone-input"
                                            maxLength={10}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {error && <div className="hd-error-msg">{error}</div>}

                                <button
                                    onClick={handleContinue}
                                    disabled={formData.mobileNumber.length !== 10 || !formData.name.trim() || loading}
                                    className={`hd-cta-btn ${formData.mobileNumber.length === 10 && formData.name.trim() && !loading ? 'hd-cta-active' : 'hd-cta-disabled'}`}
                                >
                                    {loading ? (
                                        <span className="hd-spinner-row">
                                            <span className="hd-spinner" />Processing...
                                        </span>
                                    ) : 'Continue'}
                                </button>
                            </div>
                        ) : (
                            <div className="hd-otp-group">
                                <div className="hd-otp-input-wrapper">
                                    <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                                </div>

                                {error && <div className="hd-error-msg">{error}</div>}

                                <button
                                    onClick={() => handleVerifyOTP()}
                                    disabled={enteredOTP.length !== 4 || loading}
                                    className={`hd-cta-btn ${enteredOTP.length === 4 && !loading ? 'hd-cta-active' : 'hd-cta-disabled'}`}
                                >
                                    {loading ? 'Verifying...' : 'Verify'}
                                </button>

                                <div className="hd-otp-actions">
                                    <button onClick={() => { setShowOTP(false); setError(''); }} disabled={loading} className="hd-action-btn">
                                        Change details
                                    </button>
                                    <button onClick={handleContinue} disabled={loading} className="hd-action-btn hd-action-resend">
                                        {loading ? 'Sending...' : 'Resend OTP'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="hd-signup-line text-[#94a3b8]">
                        Already have an account?{' '}
                        <button onClick={handleGoToLogin} className="hd-signup-link text-[#c5a059]">Login</button>
                    </p>

                    {/* Privacy Text */}
                    <p className="text-[10px] text-[#94a3b8] text-center mt-2 leading-tight">
                        By signing up, you agree to our <br />
                        <Link to="/terms-of-service" className="text-[#c5a059] hover:underline font-semibold">Terms</Link> and{" "}
                        <Link to="/privacy-policy" className="text-[#c5a059] hover:underline font-semibold">Privacy Policy</Link>.
                    </p>
                </div>
            </div>

            <style>{`
                .hd-login-root {
                    position: fixed; inset: 0; display: flex; flex-direction: column;
                    background: #f8f6f2; overflow: hidden; font-family: 'Inter', sans-serif;
                }

                .hd-back-btn {
                    position: absolute; top: 18px; left: 18px; z-index: 120;
                    width: 40px; height: 40px; border: none; border-radius: 50%;
                    background: rgba(255,255,255,0.9); backdrop-filter: blur(8px);
                    color: #0a193b; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: all 0.2s;
                }

                .hd-top-panel {
                    position: relative; width: 100%; height: auto; min-height: 240px;
                    overflow: hidden; display: flex; flex-direction: column;
                    align-items: center; background: #f8f6f2;
                    transition: filter 0.5s ease, min-height 0.5s ease;
                }
                .hd-top-panel.hd-otp-focus { filter: brightness(0.9) blur(2px); }

                .hd-hero-strip {
                    position: relative; width: 100%; height: 190px;
                    overflow: hidden; opacity: 1; transform: translateY(0);
                    transition: all 1s cubic-bezier(0.22, 1, 0.36, 1), height 0.5s ease;
                }

                .hd-lottie-player {
                    width: 100%; height: 100%;
                    animation: subtleZoom 8s ease-in-out infinite;
                }

                .hd-hero-bottom-overlay {
                    position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
                    background: linear-gradient(to top, #f8f6f2 15%, transparent);
                    z-index: 5;
                }

                .hd-logo-badge {
                    position: relative; margin-top: -30px; z-index: 10; opacity: 1;
                    transform: scale(1); transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .hd-logo-badge.hd-logo-otp { transform: scale(0.85); margin-top: -20px; }

                .hd-logo-img {
                    width: 140px; height: 70px; border-radius: 12px; object-fit: contain;
                    background: #fff; padding: 10px 14px; box-shadow: 0 10px 30px rgba(10,25,59,0.1);
                }

                .hd-bottom-panel {
                    flex: 1; display: flex; flex-direction: column; align-items: center;
                    background: #f8f6f2; transform: translateY(0); opacity: 1;
                    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease;
                    padding-top: 10px; z-index: 20;
                    overflow-y: auto; width: 100%;
                    scrollbar-width: none;
                }
                .hd-bottom-panel::-webkit-scrollbar {
                    display: none;
                }

                .hd-form-card { width: 100%; max-width: 400px; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
                .hd-tagline { text-align: center; margin-bottom: 4px; }
                .hd-input-section { display: flex; flex-direction: column; gap: 16px; }
                .hd-input-group, .hd-otp-group { display: flex; flex-direction: column; gap: 16px; }
                
                .hd-field-group { display: flex; flex-direction: column; gap: 8px; }
                .hd-field-label { font-size: 13px; font-weight: 600; color: #475569; padding-left: 4px; }
                
                .hd-input-row {
                    display: flex; height: 50px; background: #fff; border-radius: 14px; border: 1.5px solid #e2e8f0; overflow: hidden;
                    transition: border-color 0.2s;
                }
                .hd-input-row:focus-within { border-color: #c5a059; }
                
                .hd-text-input { width: 100%; border: none; outline: none; padding: 0 16px; font-weight: 600; font-size: 15px; }

                .hd-phone-row {
                    display: flex; height: 50px; background: #fff; border-radius: 14px; border: 1.5px solid #e2e8f0; overflow: hidden;
                    transition: border-color 0.2s;
                }
                .hd-phone-row:focus-within { border-color: #c5a059; }
                .hd-prefix { width: 64px; display: flex; align-items: center; justify-content: center; font-weight: 700; background: #f8fafc; border-right: 1.5px solid #e2e8f0; color: #475569; font-size: 14px; }
                .hd-phone-input { flex: 1; border: none; outline: none; padding: 0 16px; font-weight: 600; font-size: 15px; }
                
                .hd-cta-btn { 
                    width: 100%; height: 52px; border-radius: 14px; font-weight: 700; 
                    transition: all 0.3s ease; border: none; cursor: pointer;
                    font-size: 15px; letter-spacing: 0.3px;
                }
                .hd-cta-active { 
                    background: #0a193b; color: #fff; 
                    box-shadow: 0 8px 20px rgba(10,25,59,0.2); 
                }
                .hd-cta-active:hover { transform: translateY(-1px); box-shadow: 0 10px 25px rgba(10,25,59,0.25); }
                .hd-cta-disabled {
                    background: #e2e8f0; color: #94a3b8; cursor: not-allowed;
                }

                .hd-error-msg { font-size: 11px; color: #ef4444; background: #fef2f2; padding: 8px 12px; border-radius: 8px; border: 1px solid #fee2e2; }

                .hd-otp-input-wrapper { margin: 8px 0; }
                .hd-otp-actions { display: flex; justify-content: space-between; padding: 0 4px; }
                .hd-action-btn { 
                    font-weight: 600; font-size: 13px; color: #64748b; background: none; border: none; cursor: pointer; transition: color 0.2s;
                }
                .hd-action-btn:hover { color: #0a193b; }
                .hd-action-resend { color: #c5a059; }

                .hd-signup-line { text-align: center; font-weight: 500; font-size: 13px; }
                .hd-signup-link { font-weight: 600; background: none; border: none; cursor: pointer; }

                .hd-spinner-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
                .hd-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }

                @keyframes subtleZoom {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 1023px) {
                    .hd-top-panel.hd-otp-focus {
                        min-height: 160px !important;
                    }
                    .hd-otp-focus .hd-hero-strip {
                        height: 110px !important;
                        opacity: 1 !important;
                    }
                    .hd-logo-badge.hd-logo-otp {
                        margin-top: -25px !important;
                        transform: scale(0.85);
                    }
                }

                @media (min-width: 1024px) {
                    .hd-login-root { flex-direction: row; }
                    .hd-top-panel { width: 45%; height: 100vh; justify-content: center; }
                    .hd-bottom-panel { width: 55%; height: 100vh; justify-content: center; padding-top: 0; }
                    .hd-hero-strip { height: 260px; }
                    .hd-logo-badge { margin-top: -50px; transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
}
