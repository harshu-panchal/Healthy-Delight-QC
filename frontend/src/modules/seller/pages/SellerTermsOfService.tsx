import { useNavigate } from "react-router-dom";

export default function SellerTermsOfService() {
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
            Seller Terms of Service
          </h1>
          <p className="text-[#7a5ea5] text-sm font-medium">
            Effective Date: May 25, 2026
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 text-sm text-neutral-700 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#e2d1f9] scrollbar-track-transparent">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">1. Introduction</h2>
            <p className="leading-relaxed">
              Welcome to Healthy Delight. By registering as a Seller on our platform, you agree to comply with and be bound by the following Terms of Service. Please review them carefully. These terms govern your access to and use of our seller panel, services, and storefront interfaces.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">2. Seller Eligibility & Registration</h2>
            <p className="leading-relaxed">
              To list and sell products on Healthy Delight, you must be a legally registered business entity or individual authorized to conduct commerce in your local jurisdiction. You represent and warrant that all registration details provided (including PAN Card, tax registration numbers, and banking details) are fully accurate and verifiable.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">3. Product Listings & Quality Standards</h2>
            <p className="leading-relaxed">
              As a merchant specialized in healthy foods, fresh ingredients, and dietary choices, you agree to maintain the highest hygiene, packaging, and product description standards.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All listed items must represent real, legally compliant products with exact descriptions.</li>
              <li>Expiry dates, allergy warnings, and nutritional disclosures must be updated in real-time.</li>
              <li>Products containing prohibited, contaminated, or sub-standard ingredients are strictly forbidden.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">4. Pricing, Platform Commissions & Fees</h2>
            <p className="leading-relaxed">
              You retain absolute freedom to set customer-facing prices for your products. However:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Healthy Delight reserves the right to charge platform service fees or commission percentages (e.g. 10%) on each completed checkout transaction.</li>
              <li>All commission deductions are calculated automatically and reflected clearly in your Seller Ledger.</li>
              <li>Platform charges, payouts, and manual fund transfers are processed securely through our registered banking partners.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">5. Order Fulfillment & Delivery Operations</h2>
            <p className="leading-relaxed">
              Timely order processing is vital to maintain our premium quality assurance. Sellers are required to prepare and hand over ordered foods to designated delivery boys within the standard preparation time limit. Failure to meet preparation SLA targets consistently may lead to temporary suspension of your virtual store.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">6. Cancellations, Refunds & Disputes</h2>
            <p className="leading-relaxed">
              If an order is cancelled or disputed due to incorrect item supply, quality degradation, or out-of-stock discrepancies, the Seller accepts full liability for refund values. Customer refunds will be debited from the Seller's running ledger account balance accordingly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">7. Termination of Account</h2>
            <p className="leading-relaxed">
              Healthy Delight reserves the unilateral right to suspend, terminate, or restrict your merchant dashboard access in the event of continuous policy violations, supply of fraudulent details, customer complaints, or unethical commercial conduct.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#4b3f72]">8. Updates to Terms</h2>
            <p className="leading-relaxed">
              We may revise these Terms of Service periodically. You will be notified of major changes through your seller dashboard or via your registered email address. Continued operation of your seller store after changes go into effect constitutes full acceptance of the updated terms.
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
