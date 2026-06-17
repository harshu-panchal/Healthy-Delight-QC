import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../../../assets/logo.png";

export default function ShippingPolicy() {
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
      {/* Premium Fixed Header */}
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
              Shipping & Delivery
            </h1>
          </div>

          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Healthy Delight" className="h-8 md:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-105" />
          </div>
        </div>
      </header>

      {/* Premium Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f8f6f2] to-[#f6f1e6] -z-10" />
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none -z-5" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }} />

      {/* Main Content */}
      <div className="px-5 md:px-10 py-6 max-w-3xl mx-auto w-full">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#0a193b] p-8 md:p-12 mb-10 text-center shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_30%_50%,#c5a059_0%,transparent_70%)]" />
          <div className="relative z-10">
            <span className="inline-block text-[#c5a059] text-[10px] font-black uppercase tracking-[0.25em] mb-4">
              Cold-Chain Logistics
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
              Shipping & Delivery Policy
            </h2>
            <div className="h-1 w-12 bg-[#c5a059] mx-auto rounded-full mb-5" />
            <p className="text-white/70 text-xs md:text-sm font-medium max-w-xl mx-auto leading-relaxed">
              We ensure temperature-controlled daily doorstep dispatch for your healthy orders and active subscriptions.
            </p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="bg-white rounded-[32px] p-8 md:p-10 border border-[#0a193b]/5 shadow-xl space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              1. Delivery Options & Zones
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Healthy Delight provides temperature-monitored fulfillment inside select geographical locations in Bengaluru, Karnataka. We support two primary dispatch modes:
            </p>
            <ul className="list-disc pl-5 text-neutral-600 text-sm space-y-2">
              <li>
                <strong>Instant Delivery:</strong> Orders are processed and dispatched immediately with a target window of <strong>17 minutes</strong> to selected zones.
              </li>
              <li>
                <strong>Scheduled Delivery:</strong> Morning or Evening doorstep slots, ideal for recurring subscription essentials.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              2. Scheduled Time Slots
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Our active scheduled delivery slots are split into:
            </p>
            <ul className="list-disc pl-5 text-neutral-600 text-sm space-y-2">
              <li><strong>Morning Slot:</strong> 6:00 AM to 9:00 AM (Orders must be confirmed or changes completed before midnight).</li>
              <li><strong>Evening Slot:</strong> 5:00 PM to 8:00 PM (Orders/changes must be confirmed by 2:00 PM on the same day).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              3. Delivery Charges
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Delivery charges vary depending on order configurations and distance:
            </p>
            <ul className="list-disc pl-5 text-neutral-600 text-sm space-y-2">
              <li><strong>Active Subscription Plans:</strong> Free delivery for all scheduled morning or evening subscription items.</li>
              <li><strong>One-off / Instant Orders:</strong> Nominal shipping rates apply, calculated dynamically at checkout.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              4. Doorstep Drop & Guidelines
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              To guarantee that milk and perishables do not spoil, our delivery partners are trained to ring doorbells or coordinate drop locations. In gated complexes, please ensure gate permission is set up on your building manager application to allow seamless entry.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0a193b] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5a059] rounded-full" />
              5. Contact Shipping Help
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              If you have queries regarding a delayed package or routing, contact:
            </p>
            <div className="bg-[#0a193b]/[0.02] border border-[#0a193b]/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between mt-3">
              <div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Email Support</p>
                <p className="text-sm font-bold text-[#0a193b]">support@healthydelight.com</p>
              </div>
              <div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Hotline Support</p>
                <p className="text-sm font-bold text-[#0a193b]">+91 9740234199</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Info */}
        <div className="text-center pt-8">
          <p className="text-[11px] font-bold text-[#0a193b]/40 uppercase tracking-[0.3em] mb-3">
            Effective Date: June 17, 2026
          </p>
          <p className="text-[12px] text-neutral-400 font-medium">
            © {new Date().getFullYear()} Healthy Delight. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
