import { useDeliveryStatus } from '../context/DeliveryStatusContext';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import logo from '@assets/logo.png';

interface DeliveryHeaderProps {
  userName?: string;
}

export default function DeliveryHeader({ userName }: DeliveryHeaderProps) {
  const { isOnline, setIsOnline, riderStatus } = useDeliveryStatus();
  const { userName: contextUserName } = useDeliveryUser();
  const displayName = userName || contextUserName;

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
          <img src={logo} alt="Healthy Delight" className="h-8 sm:h-9 w-auto object-contain" />
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




