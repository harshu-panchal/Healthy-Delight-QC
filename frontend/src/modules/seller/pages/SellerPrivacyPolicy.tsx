import { useNavigate } from "react-router-dom";

export default function SellerPrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdfcfb] via-[#e2d1f9] to-[#fef6e4] flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors"
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Container */}
      <div className="w-full max-w-3xl bg-white/95 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border border-violet-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-8 sm:px-8 sm:py-10 text-center border-b border-violet-100 bg-white">
          <div className="mb-4">
            <img
              src="/assets/logo.png"
              alt="Healthy Delight"
              className="h-16 sm:h-20 w-auto mx-auto object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4b3f72] mb-2">
            Seller Privacy Policy
          </h1>
          <p className="text-[#7a5ea5] text-sm font-medium">
            Effective Date: May 25, 2026
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 text-sm text-neutral-700 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#e2d1f9] scrollbar-track-transparent">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">1. Information We Collect</h2>
            <p className="leading-relaxed">
              When you apply, register, or manage a seller store on Healthy Delight, we collect key commercial, personal, and administrative identifiers:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Profile Information:</strong> Your name, store name, commercial email, and contact phone number.</li>
              <li><strong>Identity Verification:</strong> Permanent Account Number (PAN), Tax registration names, and certificate numbers.</li>
              <li><strong>Financial Details:</strong> Bank names, account numbers, branch details, and IFSC codes to facilitate safe payouts.</li>
              <li><strong>Geographic Location Data:</strong> Precise GPS coordinates (latitude and longitude) of your storefront location to match you with nearby customers.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">2. How We Use Your Information</h2>
            <p className="leading-relaxed">
              We process your details exclusively to deliver a fully operational, safe, and legal commercial storefront ecosystem:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create, verify, and maintain your registered seller account.</li>
              <li>To route and match customer orders with your store based on geo-location proximity.</li>
              <li>To calculate and settle payouts, commissions, and manual ledger adjustments.</li>
              <li>To send vital real-time push notifications regarding incoming orders and status alerts.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">3. Information Sharing & Third Parties</h2>
            <p className="leading-relaxed">
              Your trust is our priority. We share your information only in these specific scenarios:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Designated Delivery Personnel:</strong> Selected delivery riders receive your store name, pickup address, and phone number to execute orders.</li>
              <li><strong>Payment Partners:</strong> Bank and payout details are shared with verified, PCI-compliant payment gateways to complete transactions.</li>
              <li><strong>Legal Compliance:</strong> When required by tax regulations, legal notices, or governmental audits.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">4. Data Security</h2>
            <p className="leading-relaxed">
              Healthy Delight incorporates robust encryption and industry-standard security safeguards. Your tax document details, PAN card references, and bank account numbers are stored in secure cloud systems with access limited strictly to certified administrators.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">5. Your Privacy Choices & Data Deletion</h2>
            <p className="leading-relaxed">
              You can access, modify, or update your registered store profile information directly through the seller panel. If you choose to close your merchant store and request complete erasure of your platform data, you may reach out to our admin support team. We will comply after settling all active ledger balances and meeting statutory tax-retention periods.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">6. Contact Us</h2>
            <p className="leading-relaxed">
              For any questions regarding your account data, privacy standards, or location coordinates, please contact our Merchant Support Desk at <a href="mailto:privacy@healthydelight.com" className="text-primary hover:underline">privacy@healthydelight.com</a>.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-violet-50 text-center text-xs text-neutral-500">
          Copyright © {new Date().getFullYear()} Healthy Delight. All rights reserved.
        </div>
      </div>
    </div>
  );
}
