import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api/config';

export default function DeliveryPrivacy() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await api.get('/settings/public');
        if (response.data && response.data.success && response.data.data) {
          setContent(response.data.data.deliveryPrivacyPolicy || '');
        }
      } catch (error) {
        console.error('Failed to fetch public delivery privacy policy', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const defaultPrivacy = `Healthy Delight Delivery Partner Privacy Policy

Last Updated: May 2026

We at Healthy Delight respect your privacy and are committed to protecting the personal data of our delivery partners. This Privacy Policy describes how we collect, use, and share your information when you apply to be and operate as a delivery partner for Healthy Delight.

1. Information We Collect
   - Personal Identification: Full name, date of birth, contact details (phone number, email, address).
   - Professional Credentials: Driving license, national identity card details, vehicle registration, and background verification records.
   - Financial Data: Bank details, account number, IFSC code, and tax identification for weekly transfers.
   - Location Data: Real-time GPS location of your mobile device when the app is active, to facilitate assignment of nearby orders and precise tracking for customers.
   - Device and Usage Details: IP address, mobile operating system version, and system event logs.

2. How We Use Your Information
   - Operational Efficiency: Processing your application, onboarding, order assignment, routing, and calculating mileage-based delivery charges.
   - Financial Audit: Disbursing payouts, tracking earnings history, and auditing manual wallet adjustments.
   - Security and Compliance: Verification of driving status, background safety checks, and anti-fraud monitoring.
   - Customer Support: Assisting you with support tickets and customer delivery queries.

3. Sharing of Information
   - Customers: Your first name, profile photo, real-time vehicle location, and telephone contact link will be visible to customers to coordinate delivery.
   - Sellers: Selected order processing details may be visible to sellers for preparation and dispatch.
   - Law Enforcement & Safety: We share data when requested by authorized agencies for safety compliance or legal investigation.

4. Data Retention
   We retain your partner records for as long as your account is active or as legally required for financial audits and safety histories.

5. Your Rights and Choices
   - Access and Edit: You can view and update key details in your partner profile at any time.
   - Location Access: You can toggle off location permissions in your system settings, though this will prevent receiving any active delivery assignments.

For any questions, please contact partner-support@healthydelight.com.`;

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-3xl mx-auto w-full bg-white rounded-2xl shadow-md border border-neutral-200 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-teal-600 px-6 py-8 text-white relative">
          <button
            onClick={() => navigate('/delivery/signup')}
            className="absolute left-6 top-8 text-white hover:text-neutral-200 transition-colors p-1 bg-teal-700/50 hover:bg-teal-700/80 rounded-full"
            aria-label="Go Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Healthy Delight</h1>
            <p className="mt-2 text-sm text-teal-100 font-medium">Delivery Partner Privacy Policy</p>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="p-6 sm:p-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-neutral-500 font-medium">Loading Privacy Policy...</p>
            </div>
          ) : (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 bg-neutral-50 p-6 rounded-xl border border-neutral-200 shadow-inner max-h-[600px] overflow-y-auto font-sans">
                {content || defaultPrivacy}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-neutral-200 flex justify-center">
            <button
              onClick={() => navigate('/delivery/signup')}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all hover:shadow active:scale-95"
            >
              Back to Sign Up
            </button>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-center text-xs text-neutral-400">
        &copy; {new Date().getFullYear()} Healthy Delight. All rights reserved.
      </p>
    </div>
  );
}
