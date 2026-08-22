import { calculateHaversineDistance, isLocationStale } from '../src/utils/geo';

describe('Geo Distance & Location Utilities', () => {
  it('should accurately calculate Haversine distance between two coordinates', () => {
    // Delhi Rohini (28.7041, 77.1025) to Connaught Place (28.6328, 77.2197) ~ 13.8 km
    const distance = calculateHaversineDistance(
      { lat: 28.7041, lng: 77.1025 },
      { lat: 28.6328, lng: 77.2197 }
    );
    expect(distance).toBeGreaterThan(12);
    expect(distance).toBeLessThan(16);
  });

  it('should return 0 distance for identical coordinates', () => {
    const distance = calculateHaversineDistance(
      { lat: 28.7041, lng: 77.1025 },
      { lat: 28.7041, lng: 77.1025 }
    );
    expect(distance).toBe(0);
  });

  it('should flag location as stale if timestamp exceeds threshold', () => {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    expect(isLocationStale(twentyMinsAgo, 15)).toBe(true);
    expect(isLocationStale(fiveMinsAgo, 15)).toBe(false);
  });
});
