import { useState, useEffect } from 'react';

interface Location {
  city: string;
  country: string;
}

export const useUserLocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    const successHandler = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      try {
        // Using OpenStreetMap's free Nominatim reverse geocoding service
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (!response.ok) {
          throw new Error('Failed to fetch location details.');
        }
        const data = await response.json();
        const { address } = data;
        const city = address.city || address.town || address.village || address.county || 'Unknown Area';
        const country = address.country || 'Unknown Country';
        setLocation({ city, country });
      } catch (e) {
        setError('Could not retrieve location name.');
      } finally {
        setLoading(false);
      }
    };

    const errorHandler = (error: GeolocationPositionError) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setError("Location access denied.");
          break;
        case error.POSITION_UNAVAILABLE:
          setError("Location information is unavailable.");
          break;
        case error.TIMEOUT:
          setError("The request to get user location timed out.");
          break;
        default:
          setError("An unknown error occurred.");
          break;
      }
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
  }, []);

  return { location, error, loading };
};
