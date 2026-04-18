import { useState, useEffect, useCallback } from "react";
import { useLocation } from "../hooks/useLocation";
import GoogleMapsAutocomplete from "./GoogleMapsAutocomplete";

interface LocationPermissionRequestProps {
  onLocationGranted: () => void;
  skipable?: boolean;
  title?: string;
  description?: string;
}

export default function LocationPermissionRequest({
  onLocationGranted,
  skipable = false,
  title = "Location Access Required",
  description = "We need your location to show you products available near you and enable delivery services.",
}: LocationPermissionRequestProps) {
  const {
    requestLocation,
    updateLocation,
    isLocationEnabled,
    isLocationLoading,
    locationError,
    locationPermissionStatus,
    clearLocation,
  } = useLocation();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLat, setManualLat] = useState(0);
  const [manualLng, setManualLng] = useState(0);

  // Auto-grant if already enabled or session permission exists
  useEffect(() => {
    if (isLocationEnabled) {
      console.log(
        "[LocationPermissionRequest] Location is enabled, notifying parent.",
      );
      onLocationGranted();
    }
  }, [isLocationEnabled, onLocationGranted]);

  const handleAllowLocation = async () => {
    // Clear any previous errors before retrying
    setManualAddress("");
    setManualLat(0);
    setManualLng(0);
    setShowManualInput(false);

    try {
      // ONLY call location API when user explicitly clicks the button
      // This ensures we don't auto-request location on app load
      await requestLocation();
      // If requestLocation succeeds, locationError will be cleared in the context
      // and isLocationEnabled will be set to true, which will trigger onLocationGranted
    } catch (error) {
      // Error is handled by context and displayed in the error box
      // Location will remain disabled, modal will stay visible
      // User can retry or use manual location entry
    }
  };

  const handleManualLocationSelect = useCallback(
    (address: string, lat: number, lng: number, _placeName: string) => {
      setManualAddress(address);
      setManualLat(lat);
      setManualLng(lng);
      // placeName is available but not stored separately as we use address
    },
    [],
  );

  const handleSaveManualLocation = async () => {
    if (!manualAddress || manualLat === 0 || manualLng === 0) {
      return;
    }

    try {
      // Save manual location - this will set isLocationEnabled to true
      await updateLocation({
        latitude: manualLat,
        longitude: manualLng,
        address: manualAddress,
      });
      // Modal will automatically hide when isLocationEnabled becomes true
      onLocationGranted();
    } catch (error) {
      console.error("Failed to save manual location:", error);
    }
  };

  if (isLocationEnabled) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-5">
      <div className="bg-white rounded-[32px] shadow-card max-w-md w-full p-8 relative overflow-hidden">
        {/* Subtle Decorative Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c5a059]/30 to-transparent" />

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#fcfaf7] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-1 ring-black/[0.03]">
            <svg
              className="w-10 h-10 text-[#0a193b]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#0a193b] mb-3 tracking-tight font-outfit">
            {title}
          </h2>
          <p className="text-base text-neutral-500 leading-relaxed max-w-[280px] mx-auto">
            {description}
          </p>
        </div>

        {!showManualInput ? (
          <>
            {locationError && (
              <div className="mb-8 p-4 bg-red-50/50 border border-red-100 rounded-2xl animate-fadeIn">
                <p className="text-sm text-red-600 mb-1.5 font-bold">
                  {locationError}
                </p>
                <p className="text-[13px] text-red-500/80 leading-snug">
                  {locationError.includes("timeout")
                    ? "Please ensure your GPS is enabled and try again, or enter location manually."
                    : "You can try again or enter your location manually below."}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleAllowLocation}
                disabled={isLocationLoading}
                className="w-full py-4 bg-[#0a193b] text-white rounded-full font-bold text-base shadow-lg shadow-[#0a193b]/20 hover:bg-[#0a193b]/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
                {isLocationLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Requesting...</span>
                  </>
                ) : locationError ? (
                  "Retry Location Access"
                ) : (
                  "Allow Location Access"
                )}
              </button>

              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-4 bg-neutral-50 text-neutral-700 rounded-full font-bold text-base hover:bg-neutral-100 transition-all active:scale-95">
                Enter Location Manually
              </button>

              {skipable && (
                <button
                  onClick={onLocationGranted}
                  className="w-full pt-2 pb-0 text-sm font-semibold text-neutral-400 hover:text-[#0a193b] transition-colors">
                  Skip for now
                </button>
              )}

              {locationPermissionStatus === "session_granted" &&
                !isLocationEnabled && (
                  <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
                    <p className="text-[12px] text-neutral-400 mb-2">
                      Permission granted, but data is missing.
                    </p>
                    <button
                      onClick={clearLocation}
                      className="text-xs text-[#c5a059] font-bold uppercase tracking-widest hover:underline">
                      Reset permission
                    </button>
                  </div>
                )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="animate-fadeIn">
              <label className="block text-sm font-bold text-[#0a193b] mb-3 ml-1">
                Search your location
              </label>
              <GoogleMapsAutocomplete
                value={manualAddress}
                onChange={handleManualLocationSelect}
                placeholder="Type your address..."
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowManualInput(false)}
                className="flex-1 py-4 bg-neutral-50 text-neutral-700 rounded-full font-bold text-base hover:bg-neutral-100 transition-all active:scale-95">
                Back
              </button>
              <button
                onClick={handleSaveManualLocation}
                disabled={!manualAddress || manualLat === 0}
                className="flex-1 py-4 bg-[#0a193b] text-white rounded-full font-bold text-base shadow-lg shadow-[#0a193b]/20 hover:bg-[#0a193b]/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100">
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
