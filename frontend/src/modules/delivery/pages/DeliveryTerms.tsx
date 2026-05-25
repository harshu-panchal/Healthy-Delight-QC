import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api/config';

export default function DeliveryTerms() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await api.get('/settings/public');
        if (response.data && response.data.success && response.data.data) {
          setContent(response.data.data.deliveryAppPolicy || '');
        }
      } catch (error) {
        console.error('Failed to fetch public delivery policy', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const defaultTerms = `Welcome to Healthy Delight Delivery Partner Program!

By using our delivery app, you agree to the following terms and conditions:

1. Delivery Partner Registration
   - You must provide accurate and complete information during registration
   - You must have a valid driver's license and vehicle registration
   - Background checks may be required before approval
   - You are responsible for maintaining the confidentiality of your account credentials

2. Delivery Responsibilities
   - You must accept and complete deliveries in a timely manner
   - You must handle all orders with care and ensure product integrity
   - You must follow the delivery route provided by the app
   - You must obtain customer signature or confirmation upon delivery

3. Vehicle and Equipment Requirements
   - You must maintain a valid driver's license and vehicle insurance
   - Your vehicle must be in good working condition
   - You must have a smartphone with GPS capabilities
   - You must maintain proper delivery equipment (bags, containers, etc.)

4. Payment and Earnings
   - Delivery fees are calculated based on distance and order value
   - Earnings are credited to your account after successful delivery
   - Payment is processed weekly via your registered payment method
   - You are responsible for reporting your earnings for tax purposes

5. Code of Conduct
   - You must treat customers with respect and professionalism
   - You must maintain a clean and presentable appearance
   - You must not engage in any illegal activities
   - You must follow all traffic laws and regulations

6. Safety Requirements
   - You must prioritize safety at all times
   - You must not use your phone while driving
   - You must wear appropriate safety gear when required
   - You must report any accidents or incidents immediately

7. Availability and Scheduling
   - You can set your own availability through the app
   - You must honor accepted delivery assignments
   - Cancellation of accepted orders may result in penalties
   - You must maintain a minimum acceptance rate to remain active

8. Ratings and Reviews
   - Customers may rate your service after delivery
   - Low ratings may affect your access to delivery opportunities
   - You can view and respond to customer feedback
   - Maintaining high ratings is important for continued partnership

9. Termination
   - We reserve the right to suspend or terminate your account for violations
   - Violations include but are not limited to: fraud, theft, unprofessional conduct
   - You may terminate your partnership at any time with proper notice

10. Privacy and Data
    - We respect your privacy and handle your data in accordance with our Privacy Policy
    - Your location data is used only for delivery purposes
    - Your personal information will not be shared with customers

11. Limitation of Liability
    - You are an independent contractor, not an employee
    - You are responsible for your own taxes and insurance
    - We are not liable for accidents or incidents during deliveries

12. Changes to Terms
    - We reserve the right to modify these terms at any time
    - Continued use of the app constitutes acceptance of modified terms
    - You will be notified of significant changes via the app or email

For any questions or concerns, please contact our delivery partner support team.

Last Updated: May 2026`;

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
            <p className="mt-2 text-sm text-teal-100 font-medium">Delivery Partner Terms of Service</p>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="p-6 sm:p-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-neutral-500 font-medium">Loading Terms of Service...</p>
            </div>
          ) : (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 bg-neutral-50 p-6 rounded-xl border border-neutral-200 shadow-inner max-h-[600px] overflow-y-auto font-sans">
                {content || defaultTerms}
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
