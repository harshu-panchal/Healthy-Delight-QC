import { useNavigate } from 'react-router-dom';
import { useDeliveryStatus } from '../context/DeliveryStatusContext';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import logo from '@assets/logo.png';

interface DeliveryHeaderProps {
  title?: string;
  userName?: string;
  onBack?: () => void;
}

export default function DeliveryHeader({ title, userName, onBack }: DeliveryHeaderProps) {
  const navigate = useNavigate();
  const { isOnline, setIsOnline, riderStatus } = useDeliveryStatus();
  const { userName: contextUserName } = useDeliveryUser();
  const displayName = userName || contextUserName;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // If a title is provided, render the custom page header style (like the user panel)
  if (title) {
    return (
      <div className="w-full select-none">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="px-4 py-2 bg-neutral-500 text-white text-xs font-medium text-center relative z-10">
            Offline
          </div>
        )}
        
        <div 
          className="w-full transition-all duration-300"
          style={{
            background: "linear-gradient(180deg, #0a193b 0%, rgba(10, 25, 59, 0.9) 30%, rgba(10, 25, 59, 0.7) 60%, rgba(10, 25, 59, 0.4) 85%, rgba(252, 250, 247, 0) 100%)",
            paddingBottom: "24px",
          }}
        >
          <div className="px-5 pt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all focus:outline-none"
                aria-label="Back"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18L9 12L15 6" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                {title}
              </h1>
            </div>
            
            <div className="cursor-pointer" onClick={() => navigate('/delivery')}>
              <img 
                src={logo} 
                alt="Healthy Delight" 
                className="h-8 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-105" 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise render the default home header
  return (
    <div className="bg-white shadow-sm">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="px-4 py-2 bg-neutral-500 text-white text-xs font-medium text-center">
          Offline
        </div>
      )}
      
      {/* Header Content */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Left Side: Greeting */}
        <div className="flex flex-col min-w-[80px]">
          <span className="text-neutral-500 text-[10px] uppercase tracking-wider font-bold">Hello</span>
          <span className="text-neutral-800 text-sm font-extrabold truncate max-w-[120px]">{displayName}</span>
        </div>

        {/* Middle: App Logo */}
        <div className="flex-1 flex justify-center">
          <img src={logo} alt="Healthy Delight" className="h-[52px] sm:h-[55px] w-auto object-contain" />
        </div>
        
        {/* Right Side: Toggle Switch */}
        <div className="flex justify-end items-center min-w-[80px]">
          <button
            onClick={() => setIsOnline(!isOnline)}
            disabled={riderStatus !== 'Active'}
            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
              isOnline ? 'bg-blue-600' : 'bg-neutral-300'
            } ${riderStatus !== 'Active' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={riderStatus !== 'Active' ? 'Your application must be approved to go online' : ''}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isOnline ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}




