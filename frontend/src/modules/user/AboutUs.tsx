import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../../../assets/logo.png";

export default function AboutUs() {
  const navigate = useNavigate();
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);

  // Scroll Listener for Dynamic Header
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
              About Us
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
      <div className="px-5 md:px-10 py-6 max-w-4xl mx-auto w-full">
        {/* Brand Reveal Section */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#0a193b] p-8 md:p-12 mb-10 text-center shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_30%_50%,#c5a059_0%,transparent_70%)]"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white p-5 mb-6 shadow-xl transform hover:rotate-3 transition-transform">
              <img src={logo} alt="Healthy Delight" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
              Healthy Delight
            </h2>
            <div className="h-1.5 w-16 bg-[#c5a059] mx-auto rounded-full mb-6"></div>
            <p className="text-white/80 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed italic">
              "Purity in every drop, freshness in every bite. Bridging the gap between the farm and your family."
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-[24px] p-8 border border-[#0a193b]/5 shadow-[0_10px_40px_rgba(0,0,0,0.03)] group hover:shadow-[0_15px_50px_rgba(0,0,0,0.06)] transition-all">
            <div className="w-12 h-12 bg-[#0a193b]/5 rounded-2xl flex items-center justify-center text-[#c5a059] mb-6 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#0a193b] mb-4">Our Mission</h3>
            <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
              To empower families with the highest quality, farm-fresh organic products. We believe that health starts at the source, and our goal is to eliminate middlemen, ensuring that what reaches your table is nothing short of pure.
            </p>
          </div>

          <div className="bg-white rounded-[24px] p-8 border border-[#0a193b]/5 shadow-[0_10px_40px_rgba(0,0,0,0.03)] group hover:shadow-[0_15px_50px_rgba(0,0,0,0.06)] transition-all">
            <div className="w-12 h-12 bg-[#0a193b]/5 rounded-2xl flex items-center justify-center text-[#c5a059] mb-6 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#0a193b] mb-4">What We Do</h3>
            <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
              Healthy Delight is more than a delivery app; it's a commitment to your wellbeing. We source premium organic milk, vegetables, and staples directly from local farmers and deliver them to you within hours of harvest.
            </p>
          </div>
        </div>

        {/* Stats Section with Glassmorphism */}
        <div className="bg-[#0a193b]/5 rounded-[32px] p-8 md:p-10 mb-12 border border-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-[#0a193b] mb-1">25+</div>
              <div className="text-[10px] md:text-xs font-black text-[#c5a059] uppercase tracking-widest">Organic Farms</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-[#0a193b] mb-1">100%</div>
              <div className="text-[10px] md:text-xs font-black text-[#c5a059] uppercase tracking-widest">Pure & Fresh</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-[#0a193b] mb-1">10K+</div>
              <div className="text-[10px] md:text-xs font-black text-[#c5a059] uppercase tracking-widest">Happy Homes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-[#0a193b] mb-1">24h</div>
              <div className="text-[10px] md:text-xs font-black text-[#c5a059] uppercase tracking-widest">Farm-to-Door</div>
            </div>
          </div>
        </div>

        {/* Contact Unit */}
        <div className="bg-white rounded-[32px] p-10 border border-[#0a193b]/5 shadow-2xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <h3 className="text-2xl font-bold text-[#0a193b] mb-8 text-center">Get in Touch</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0a193b]/[0.02] border border-neutral-100 hover:border-[#c5a059]/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#0a193b] text-white flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="text-sm font-bold text-[#0a193b] mb-1">Email Us</div>
              <div className="text-xs text-neutral-500">support@healthydelight.com</div>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0a193b]/[0.02] border border-neutral-100 hover:border-[#c5a059]/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#0a193b] text-white flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div className="text-sm font-bold text-[#0a193b] mb-1">Call Support</div>
              <div className="text-xs text-neutral-500">+91 1800-419-5566</div>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#0a193b]/[0.02] border border-neutral-100 hover:border-[#c5a059]/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#0a193b] text-white flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="text-sm font-bold text-[#0a193b] mb-1">Headquarters</div>
              <div className="text-xs text-neutral-500">Ahmedabad, Gujarat</div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center pt-4">
          <p className="text-[11px] font-bold text-[#0a193b]/40 uppercase tracking-[0.3em] mb-4">
            Version 2.1.0 • Premium Portal
          </p>
          <p className="text-[12px] text-neutral-400 font-medium">
            © {new Date().getFullYear()} Healthy Delight. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
