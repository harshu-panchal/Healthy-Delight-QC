import { useCallback, useEffect, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

interface GoogleMapsAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number, placeName: string, components?: { city?: string; state?: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

type Libraries = ("places" | "drawing" | "geometry" | "visualization")[];
const libraries: Libraries = ['places'];

// Clean address by removing Plus Codes and unwanted identifiers
const cleanAddress = (address: string): string => {
  if (!address) return address;

  const cleaned = address
    .replace(/^[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}([,\s]+)?/i, '')
    .replace(/([,\s]+)?[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}$/i, '')
    .replace(/([,\s]+)[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}([,\s]+)/gi, (_match, before, after) => {
      return before.includes(',') || after.includes(',') ? ', ' : ' ';
    })
    .replace(/\s+[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}\s+/gi, ' ')
    .replace(/\b[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}\b/gi, '')
    .replace(/,\s*,+/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

  return cleaned;
};

export default function GoogleMapsAutocomplete({
  value,
  onChange,
  placeholder = 'Search location...',
  className = '',
  disabled = false,
  required = false,
}: GoogleMapsAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteService = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placesService = useRef<any>(null);

  const [error, setError] = useState<string>('');
  const [inputValue, setInputValue] = useState(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

  // Use the same loader configuration as LocationPickerMap
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  // Update local input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (loadError) {
      setError(`Failed to load Google Maps API: ${loadError.message}`);
    }
  }, [loadError]);

  useEffect(() => {
    if (isLoaded && !autocompleteService.current && window.google?.maps?.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
  }, [isLoaded]);

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteService.current) return;
    
    if (!input.trim()) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      autocompleteService.current.getPlacePredictions({
        input,
        componentRestrictions: { country: 'in' },
        types: ['establishment', 'geocode'],
      }, (results: any, status: any) => {
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && results) {
          setPredictions(results);
          setShowPredictions(true);
        } else {
          setPredictions([]);
          setShowPredictions(false);
        }
      });
    } catch (err: unknown) {
      console.error('Autocomplete prediction error:', err);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = useCallback((prediction: any) => {
    if (!placesService.current) return;

    setInputValue(prediction.description);
    setShowPredictions(false);

    try {
      placesService.current.getDetails({
        placeId: prediction.place_id,
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
      }, (place: any, status: any) => {
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && place) {
          if (!place.geometry || !place.geometry.location) {
            setError('No location details found for this place');
            return;
          }

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const rawAddress = place.formatted_address || place.name || prediction.description || '';
          const address = cleanAddress(rawAddress);
          const placeName = place.name || address;

          let city = '';
          let state = '';

          if (place.address_components) {
            for (const component of place.address_components) {
              if (component.types.includes('locality')) {
                city = component.long_name;
              } else if (component.types.includes('administrative_area_level_3') && !city) {
                city = component.long_name;
              } else if (component.types.includes('administrative_area_level_1')) {
                state = component.long_name;
              }
            }
          }

          setInputValue(address);
          onChange(address, lat, lng, placeName, { city, state });
          setError('');
        } else {
          setError('Failed to get location details from Google Maps.');
        }
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Place details error:', err);
      setError(`Failed to retrieve place details: ${errorMessage}`);
    }
  }, [onChange]);

  // Handle click outside to close predictions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full relative" ref={containerRef}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          const val = e.target.value;
          setInputValue(val);
          fetchPredictions(val);
          onChange(val, 0, 0, val);
        }}
        onFocus={() => {
          if (predictions.length > 0) {
            setShowPredictions(true);
          }
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-neutral-300 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 bg-white ${className}`}
        disabled={disabled || !isLoaded}
        required={required}
        autoComplete="off"
      />
      
      {showPredictions && predictions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((p) => (
            <li 
              key={p.place_id} 
              onClick={() => handleSelect(p)}
              className="px-4 py-3 hover:bg-neutral-50 cursor-pointer text-sm border-b border-neutral-100 last:border-0"
            >
              <div className="flex flex-col">
                <span className="font-medium text-neutral-800">
                  {p.structured_formatting?.main_text || p.description}
                </span>
                {p.structured_formatting?.secondary_text && (
                  <span className="text-xs text-neutral-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {p.structured_formatting.secondary_text}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {!isLoaded && !error && (
        <p className="mt-1 text-xs text-neutral-500">Loading location services...</p>
      )}
    </div>
  );
}
