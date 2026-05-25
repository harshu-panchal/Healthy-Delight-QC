import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import { getDeliveryProfile, updateProfile } from '../../../services/api/delivery/deliveryService';

export default function DeliveryProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { userName, setUserName } = useDeliveryUser();
  const [vehicleError, setVehicleError] = useState('');

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicleNumber: '',
    vehicleType: 'Bike',
    joinDate: '',
    totalDeliveries: 0,
    rating: 0,
  });

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getDeliveryProfile();
        setProfileData({
          name: data.name,
          phone: data.mobile,
          email: data.email,
          address: data.address,
          vehicleNumber: data.vehicleNumber || '',
          vehicleType: data.vehicleType || 'Bike',
          joinDate: new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          totalDeliveries: data.totalDeliveredCount || 0, // Assuming backend sends this or we need to fetch dashboard stats
          rating: 4.8, // Mock for now
        });
        setUserName(data.name);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, [setUserName]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Re-fetch or reset to previous state
  };

  const handleSave = async () => {
    const vehNum = profileData.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (vehNum && !/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(vehNum)) {
      setVehicleError('Invalid format. Example: UP32AB1234');
      return;
    }

    try {
      await updateProfile({
        name: profileData.name,
        email: profileData.email,
        address: profileData.address,
        vehicleNumber: vehNum,
        vehicleType: profileData.vehicleType
      });
      setUserName(profileData.name);
      setIsEditing(false);
      setVehicleError('');
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile");
    }
  };

  const handleVehicleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    handleInputChange('vehicleNumber', cleanVal);
    
    if (cleanVal && !/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(cleanVal)) {
      setVehicleError('Invalid format. Example: UP32AB1234');
    } else {
      setVehicleError('');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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
          <h2 className="text-neutral-900 text-xl font-semibold">Profile</h2>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 mb-4">
          <div className="flex flex-col items-center">
            {isEditing ? (
              <div className="w-full max-w-xs space-y-2">
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full text-center text-neutral-900 text-xl font-semibold px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full text-center text-neutral-600 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-neutral-900 text-xl font-semibold mb-1">{profileData.name}</h3>
                <p className="text-neutral-600 text-sm">{profileData.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Personal Information</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Email</p>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.email}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Address</p>
              {isEditing ? (
                <textarea
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.address}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Number</p>
              {isEditing ? (
                <div className="w-full">
                  <input
                    type="text"
                    value={profileData.vehicleNumber}
                    onChange={handleVehicleNumberChange}
                    maxLength={10}
                    placeholder="e.g. UP32AB1234"
                    className={`w-full text-neutral-900 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      vehicleError 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-neutral-300 focus:ring-orange-500'
                    }`}
                  />
                  {vehicleError && (
                    <p className="text-red-500 text-[10px] mt-1 animate-in fade-in duration-200 font-medium">
                      {vehicleError}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleNumber}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Type</p>
              {isEditing ? (
                <select
                  value={profileData.vehicleType}
                  onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Car">Car</option>
                  <option value="Cycle">Cycle</option>
                </select>
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleType}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mt-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-neutral-500 text-xs mb-1">Total Deliveries</p>
              <p className="text-neutral-900 text-2xl font-bold">{profileData.totalDeliveries}</p>
            </div>
            <div className="text-center">
              <p className="text-neutral-500 text-xs mb-1">Joined On</p>
              <p className="text-neutral-900 text-sm font-semibold">{profileData.joinDate}</p>
            </div>
          </div>
        </div>

        {/* Edit/Save/Cancel Buttons */}
        {isEditing ? (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCancel}
              className="flex-1 bg-neutral-200 text-neutral-900 rounded-xl py-3 font-semibold hover:bg-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="w-full mt-4 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

