import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../../../assets/logo.png";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsHeaderSolid(scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col pt-[100px] pb-24 md:pb-8">
      {/* Premium Home-Style Fixed Header */}
      <header
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: isHeaderSolid
            ? "#0a193b"
            : "linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.9) 30%, rgba(10, 25, 59, 0.7) 60%, rgba(10, 25, 59, 0.4) 85%, rgba(252, 250, 247, 0) 100%)",
          boxShadow: isHeaderSolid ? "0 12px 24px rgba(0,0,0,0.12)" : "none",
          paddingBottom: "16px",
          borderBottomLeftRadius: isHeaderSolid ? "20px" : "0px",
          borderBottomRightRadius: isHeaderSolid ? "20px" : "0px",
        }}
      >
        <div className="px-5 md:px-10 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all"
              aria-label="Back"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
              Privacy Policy
            </h1>
          </div>

          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <img
              src={logo}
              alt="Healthy Delight"
              className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-105"
            />
          </div>
        </div>
      </header>

      {/* Premium Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8f6f2] to-[#f6f1e6] -z-10" />
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none -z-5"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/natural-paper.png")',
        }}
      ></div>

      {/* Main Content */}
      <div className="px-5 md:px-10 py-6 max-w-3xl mx-auto w-full">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#0a193b] p-8 md:p-12 mb-10 text-center shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_30%_50%,#c5a059_0%,transparent_70%)]"></div>

          <div className="relative z-10">
            <span className="inline-block text-[#c5a059] text-[10px] font-black uppercase tracking-[0.25em] mb-4">
              Security & Trust
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
              Your Privacy Matters
            </h2>
            <div className="h-1 w-12 bg-[#c5a059] mx-auto rounded-full mb-5"></div>
            <p className="text-white/70 text-xs md:text-sm font-medium max-w-xl mx-auto leading-relaxed">
              At Healthy Delight, we are committed to safeguarding your personal information. Read our policy to understand how we collect, protect, and use your data.
            </p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="bg-white rounded-[32px] p-8 md:p-10 border border-[#0a193b]/5 shadow-xl space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              1. Introduction
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Welcome to Healthy Delight. This Privacy Policy describes how we collect, use, process, and disclose your information when you use our website, mobile application, or other online platforms. By using our platform, you consent to the practices described in this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              2. Information We Collect
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed mb-2">
              To provide a seamless, premium farm-fresh dairy delivery experience, we collect:
            </p>
            <ul className="list-disc pl-5 text-neutral-600 text-sm space-y-2">
              <li>
                <strong>Account & Profile Details:</strong> Your name, email address, phone number, and password created during registration.
              </li>
              <li>
                <strong>Delivery Coordinates:</strong> Your precise delivery address, including flat/house number, landmark, city, state, pincode, and GPS coordinates to facilitate our 17-minute premium delivery window.
              </li>
              <li>
                <strong>Transaction Data:</strong> Details of your orders, subscription schedules, wallet balances, payments, and refunds.
              </li>
              <li>
                <strong>Device Information:</strong> Push notification tokens (FCM tokens), IP address, and browser characteristics to deliver real-time order alerts.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              3. How We Use Your Information
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed mb-2">
              The data we collect is strictly used to serve you better, specifically to:
            </p>
            <ul className="list-disc pl-5 text-neutral-600 text-sm space-y-2">
              <li>Process and fulfill your morning and evening doorstep deliveries.</li>
              <li>Route delivery personnel accurately using your precise location.</li>
              <li>Manage your subscriptions, recurring schedules, and wallet transactions.</li>
              <li>Send real-time order updates, promotional announcements, and system alerts via Push Notifications.</li>
              <li>Improve app performance, visual user interfaces, and custom storefront experiences.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              4. Data Protection & Sharing
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              We employ state-of-the-art encryption protocols to store your credentials, profile details, and transactions. We do NOT sell, rent, or trade your personal information with third parties. Your coordinates and order details are only shared with our verified sellers and delivery executives to ensure accurate fulfillment of your organic basket.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              5. Your Rights & Choice
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              You maintain full control over your data. You can access, edit, or remove your profile information directly from your Account Dashboard. You may also disable push notifications or location tracking through your browser settings, though doing so may limit your access to specific localized store selections and live route tracking.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              6. Policy Updates & Support
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              We may periodically revise this policy. For any questions, data deletion requests, or queries regarding your account privacy standards, contact us at:
            </p>
            <div className="bg-[#0a193b]/[0.02] border border-[#0a193b]/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between mt-3">
              <div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Email Support</p>
                <p className="text-sm font-bold text-[#0a193b]">support@healthydelight.com</p>
              </div>
              <div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Privacy Desk</p>
                <p className="text-sm font-bold text-[#0a193b]">privacy@healthydelight.com</p>
              </div>
              <div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Phone Hotline</p>
                <p className="text-sm font-bold text-[#0a193b]">+91 9740234199</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Info */}
        <div className="text-center pt-8">
          <p className="text-[11px] font-bold text-[#0a193b]/40 uppercase tracking-[0.3em] mb-3">
            Effective Date: May 28, 2026
          </p>
          <p className="text-[12px] text-neutral-400 font-medium">
            © {new Date().getFullYear()} Healthy Delight. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
