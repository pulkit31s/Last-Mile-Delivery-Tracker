import { ILocationCoordinates } from '../types';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula in kilometers.
 */
export function calculateHaversineDistance(
  coord1: ILocationCoordinates,
  coord2: ILocationCoordinates
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);

  const lat1 = toRadians(coord1.lat);
  const lat2 = toRadians(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Rounded to 2 decimal places
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Checks whether coordinate data is considered stale based on last update timestamp.
 */
export function isLocationStale(lastUpdated: Date, thresholdMinutes = 15): boolean {
  if (!lastUpdated) return true;
  const now = new Date();
  const diffMs = now.getTime() - new Date(lastUpdated).getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes > thresholdMinutes;
}
