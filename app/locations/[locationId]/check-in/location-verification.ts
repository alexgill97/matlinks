// Location verification utilities
import { createClient } from '@/app/lib/supabase/client'

export type LocationCoordinates = {
  latitude: number;
  longitude: number;
}

export type GymLocation = {
  id: number;
  name: string;
  coordinates: LocationCoordinates | null;
  radius: number; // Radius in meters
}

// Fetch location coordinates from the database
export async function fetchLocationCoordinates(locationId: number): Promise<GymLocation | null> {
  if (!locationId || isNaN(locationId)) return null;
  
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, latitude, longitude, geofence_radius')
      .eq('id', locationId)
      .single();
    
    if (error || !data) {
      console.error('Error fetching location coordinates:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      coordinates: data.latitude && data.longitude ? {
        latitude: data.latitude,
        longitude: data.longitude
      } : null,
      radius: data.geofence_radius || 100 // Default to 100m if not set
    };
  } catch (err) {
    console.error('Error fetching location:', err);
    return null;
  }
}

// Check if user's current position is within the location's radius
export function isWithinLocationRadius(
  userCoordinates: LocationCoordinates,
  locationCoordinates: LocationCoordinates,
  radiusInMeters = 100
): boolean {
  if (!userCoordinates || !locationCoordinates) return false;
  
  // Calculate distance using Haversine formula
  const distance = calculateHaversineDistance(
    userCoordinates.latitude,
    userCoordinates.longitude,
    locationCoordinates.latitude,
    locationCoordinates.longitude
  );
  
  return distance <= radiusInMeters;
}

// Calculate distance between two points on Earth using Haversine formula
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth's radius in meters
  const R = 6371000;
  
  // Convert degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  // Haversine formula
  const a = 
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

// Get current user location (returns a promise)
export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

// Perform location verification
export async function verifyUserLocation(locationId: number): Promise<{
  success: boolean;
  message?: string;
  distance?: number;
  locationName?: string;
}> {
  try {
    // First, check if geolocation is available
    if (!navigator.geolocation) {
      return { 
        success: true, // Default to success if geolocation not available
        message: 'Location verification not available on this device' 
      };
    }
    
    // Fetch gym location coordinates
    const gymLocation = await fetchLocationCoordinates(locationId);
    
    // If the gym doesn't have coordinates set, skip verification
    if (!gymLocation || !gymLocation.coordinates) {
      return { 
        success: true,
        message: 'Location verification not configured for this gym',
        locationName: gymLocation?.name
      };
    }
    
    // Get user's current position
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
    
    const userCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    
    // Calculate distance
    const distance = calculateHaversineDistance(
      userCoordinates.latitude,
      userCoordinates.longitude,
      gymLocation.coordinates.latitude,
      gymLocation.coordinates.longitude
    );
    
    // Check if user is within the gym's radius
    const isWithin = distance <= gymLocation.radius;
    
    return {
      success: isWithin,
      message: isWithin 
        ? `You are at ${gymLocation.name}`
        : `You appear to be ${Math.round(distance)} meters away from ${gymLocation.name}`,
      distance: Math.round(distance),
      locationName: gymLocation.name
    };
  } catch (error) {
    console.error('Location verification error:', error);
    
    // If user denied permission or other error
    if (error instanceof GeolocationPositionError) {
      if (error.code === error.PERMISSION_DENIED) {
        return {
          success: true, // Default to success if permission denied
          message: 'Location access denied. Verification skipped.'
        };
      }
    }
    
    return {
      success: true, // Default to success on errors
      message: 'Unable to verify location. Proceeding anyway.'
    };
  }
} 