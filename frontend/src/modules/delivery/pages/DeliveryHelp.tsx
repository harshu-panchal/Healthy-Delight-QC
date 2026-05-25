import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getHelpSupport } from '../../../services/api/delivery/deliveryService';

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

export default function DeliveryHelp() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        const data = await getHelpSupport();
        setFaqs(data.faqs || []);
        setContacts(data.contact || []);
      } catch (error) {
        console.error("Failed to load help data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHelp();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-neutral-500">Loading help content...</p>
        <DeliveryBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
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

      </div>
      <DeliveryBottomNav />
    </div>
  );
}

