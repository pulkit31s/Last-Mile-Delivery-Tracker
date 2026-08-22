import { Area } from '../models/Area';
import { Zone } from '../models/Zone';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '../constants';
import { ZoneType } from '../types';

export class ZoneDetectionService {
  /**
   * Resolves a Zone Code from a pincode or area address.
   */
  static async detectZoneByPincode(pincode: string): Promise<{ zoneCode: string; areaName: string }> {
    const cleanPincode = pincode.trim();
    const area = await Area.findOne({ pincode: cleanPincode, status: 'ACTIVE' });

    if (!area) {
      // Check if any zone has this city or pincode directly
      throw new AppError(
        `Service unavailable: No active delivery zone mapped for pincode '${cleanPincode}'.`,
        404,
        ERROR_CODES.ZONE_NOT_FOUND
      );
    }

    // Verify the zone itself is active
    const zone = await Zone.findOne({ code: area.zoneCode, status: 'ACTIVE' });
    if (!zone) {
      throw new AppError(
        `Delivery zone '${area.zoneCode}' mapped to pincode '${cleanPincode}' is currently inactive.`,
        400,
        ERROR_CODES.ZONE_NOT_FOUND
      );
    }

    return {
      zoneCode: area.zoneCode,
      areaName: area.name
    };
  }

  /**
   * Determines whether the shipment is INTRA_ZONE or INTER_ZONE.
   */
  static determineZoneType(pickupZone: string, dropZone: string): ZoneType {
    if (pickupZone.toUpperCase() === dropZone.toUpperCase()) {
      return ZoneType.INTRA_ZONE;
    }
    return ZoneType.INTER_ZONE;
  }
}
