import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getHelpSupport } from '../../../services/api/delivery/deliveryService';
import { useAuth } from '../../../context/AuthContext';
import { DeliveryStatusProvider } from '../context/DeliveryStatusContext';
import { DeliveryUserProvider } from '../context/DeliveryUserContext';

// Icon mapping helper
const getIcon = (iconName: string) => {
  if (iconName === 'phone') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-rose-500 hover:scale-110 transition-transform">
        <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4.03C3.48 3 3 3.45 3 4c0 9.39 7.61 17 17 17c.55 0 1-.48 1-1.03v-3.59c0-.55-.45-1-1-1z" />
      </svg>
    );
  }
  if (iconName === 'email') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-purple-500 hover:scale-110 transition-transform">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5l-8-5V6l8 5l8-5v2z" />
      </svg>
    );
  }
  return 'ℹ️';
};

const defaultFAQs = [
  {
    question: 'How do I accept a new order?',
    answer: 'When you receive a new order notification, tap on it to view order details. Click "Accept Order" to confirm.',
  },
  {
    question: 'What should I do if I cannot deliver an order?',
    answer: 'Contact the customer first. If unable to reach them, contact support.',
  },
  {
    question: 'How are my earnings calculated?',
    answer: 'You earn ₹12 per successful delivery. Additional bonuses may apply for special orders or peak hours.',
  },
  {
    question: 'How do I update my profile information?',
    answer: 'Go to Menu > Profile and tap "Edit Profile" to update your personal details, vehicle information, etc.',
  },
  {
    question: 'What if I have a complaint or issue?',
    answer: 'You can contact our support team through the Help & Support section or call our helpline at +91 9740234199.',
  },
  {
    question: 'What are the delivery timings?',
    answer: 'You can deliver orders between 8 AM and 10 PM. Peak hours are usually during lunch (12-3 PM) and dinner (7-10 PM).',
  }
];

const defaultContacts = [
  { label: 'Call Support', value: '+91 9740234199', icon: 'phone' },
  { label: 'Email Support', value: 'support@healthydelight.com', icon: 'email' },
];

function HelpContentList({ faqs, contacts }: { faqs: any[], contacts: any[] }) {
  return (
    <>
      {/* Contact Options */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-neutral-900 font-semibold">Contact Us</h3>
        </div>
        <div className="divide-y divide-neutral-200">
          {contacts.map((option, index) => {
            const isPhone = option.icon === 'phone';
            const isEmail = option.icon === 'email';
            const href = isPhone ? `tel:${option.value}` : isEmail ? `mailto:${option.value}` : undefined;

            if (href) {
              return (
                <a
                  key={index}
                  href={href}
                  className="p-4 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer decoration-none"
                >
                  <div>
                    <p className="text-neutral-900 text-sm font-medium mb-1">{option.label}</p>
                    <p className="text-neutral-500 text-xs">{option.value}</p>
                  </div>
                  <div className="text-2xl">{getIcon(option.icon)}</div>
                </a>
              );
            }

            return (
              <div key={index} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.label}</p>
                  <p className="text-neutral-500 text-xs">{option.value}</p>
                </div>
                <div className="text-2xl">{getIcon(option.icon)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-neutral-900 font-semibold">Frequently Asked Questions</h3>
        </div>
        <div className="divide-y divide-neutral-200">
          {faqs.map((item, index) => (
            <div key={index} className="p-4">
              <p className="text-neutral-900 text-sm font-medium mb-2">{item.question}</p>
              <p className="text-neutral-500 text-xs leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function DeliveryHelpLoggedIn({ faqs, contacts, navigate }: { faqs: any[], contacts: any[], navigate: any }) {
  return (
    <DeliveryStatusProvider>
      <DeliveryUserProvider>
        <div className="min-h-screen bg-neutral-100 pb-20">
          <DeliveryHeader />
          <div className="px-4 py-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => navigate(-1)}
                className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
                aria-label="Back"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <h2 className="text-neutral-900 text-xl font-semibold">Help & Support</h2>
            </div>
            <HelpContentList faqs={faqs} contacts={contacts} />
          </div>
          <DeliveryBottomNav />
        </div>
      </DeliveryUserProvider>
    </DeliveryStatusProvider>
  );
}

export default function DeliveryHelp() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHelp = async () => {
      if (!isAuthenticated) {
        setFaqs(defaultFAQs);
        setContacts(defaultContacts);
        setLoading(false);
        return;
      }
      try {
        const data = await getHelpSupport();
        setFaqs(data.faqs || defaultFAQs);
        setContacts(data.contact || defaultContacts);
      } catch (error) {
        console.error("Failed to load help data", error);
        setFaqs(defaultFAQs);
        setContacts(defaultContacts);
      } finally {
        setLoading(false);
      }
    };
    fetchHelp();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading help content...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <DeliveryHelpLoggedIn faqs={faqs} contacts={contacts} navigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-between pb-8">
      <div>
        <div className="bg-[#0a193b] px-6 py-6 text-white text-center relative mb-4">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-6 top-6 text-white hover:text-neutral-200 transition-colors p-1.5 bg-white/10 hover:bg-white/20 rounded-full"
            aria-label="Go Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white">Healthy Delight</h1>
          <p className="mt-1 text-xs text-neutral-300 font-medium">Delivery Partner Help & Support</p>
        </div>

        <div className="px-4">
          <HelpContentList faqs={faqs} contacts={contacts} />
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-neutral-400">
        &copy; {new Date().getFullYear()} Healthy Delight. All rights reserved.
      </p>
    </div>
  );
}
