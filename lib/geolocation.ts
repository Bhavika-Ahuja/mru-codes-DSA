/**
 * Geolocation utilities for checking if user is within campus boundaries
 * Manav Rachna University coordinates: 28.4569° N, 77.3083° E
 */

// Campus center coordinates (Manav Rachna University, Faridabad)
const CAMPUS_LATITUDE = 28.4569;
const CAMPUS_LONGITUDE = 77.3083;

// Campus radius in meters
// Increased to 1500m (~1.5 km) so students slightly outside
// the immediate campus boundary are still allowed
const CAMPUS_RADIUS_METERS = 2500;

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if the given coordinates are within the campus boundaries
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @returns true if user is within campus, false otherwise
 */
export function isWithinCampus(
  latitude: number,
  longitude: number
): boolean {
  const distance = calculateDistance(
    CAMPUS_LATITUDE,
    CAMPUS_LONGITUDE,
    latitude,
    longitude
  );

  return distance <= CAMPUS_RADIUS_METERS;
}

/**
 * Get the distance from campus in meters
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @returns Distance in meters
 */
export function getDistanceFromCampus(
  latitude: number,
  longitude: number
): number {
  return calculateDistance(
    CAMPUS_LATITUDE,
    CAMPUS_LONGITUDE,
    latitude,
    longitude
  );
}

/**
 * Get campus center coordinates
 */
export function getCampusCoordinates() {
  return {
    latitude: CAMPUS_LATITUDE,
    longitude: CAMPUS_LONGITUDE,
    radius: CAMPUS_RADIUS_METERS,
  };
}
