import { RateCard, IRateCard } from '../models/RateCard';
import { CODConfiguration } from '../models/CODConfiguration';
import { ZoneDetectionService } from './zoneDetectionService';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES, VOLUMETRIC_DIVISOR } from '../constants';
import {
  CustomerType,
  PaymentType,
  ZoneType,
  CODSurchargeType,
  IPackageDimensions,
  IPricingQuoteInput,
  IPricingQuoteResult
} from '../types';

export class PricingService {
  /**
   * Calculates volumetric weight in kilograms.
   * Formula: (Length * Breadth * Height) / 5000 (where dimensions are in cm)
   */
  static calculateVolumetricWeight(dimensions: IPackageDimensions): number {
    const { length, breadth, height } = dimensions;

    if (length <= 0 || breadth <= 0 || height <= 0) {
      throw new AppError(
        'Package dimensions (length, breadth, height) must all be greater than 0 cm.',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const volWeight = (length * breadth * height) / VOLUMETRIC_DIVISOR;
    return Math.round(volWeight * 100) / 100;
  }

  /**
   * Determines chargeable weight as MAX(actual weight, volumetric weight).
   */
  static calculateChargeableWeight(actualWeight: number, volumetricWeight: number): number {
    if (actualWeight <= 0) {
      throw new AppError(
        'Actual weight must be greater than 0 kg.',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const chargeable = Math.max(actualWeight, volumetricWeight);
    return Math.round(chargeable * 100) / 100;
  }

  /**
   * Retrieves matching active rate card for customerType, zoneType, and weight.
   */
  static async findRateCard(
    customerType: CustomerType,
    zoneType: ZoneType,
    chargeableWeight: number
  ): Promise<IRateCard> {
    const now = new Date();

    // Query active rate cards matching customerType and zoneType
    const rateCards = await RateCard.find({
      customerType,
      zoneType,
      active: true,
      effectiveFrom: { $lte: now },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: now } }]
    }).sort({ weightFrom: 1 });

    if (!rateCards || rateCards.length === 0) {
      throw new AppError(
        `No active rate card configured for ${customerType} ${zoneType} shipments.`,
        404,
        ERROR_CODES.RATE_CARD_NOT_FOUND
      );
    }

    // Find slab that contains chargeableWeight: weightFrom <= weight <= weightTo
    const matchingCard = rateCards.find(
      card => chargeableWeight >= card.weightFrom && chargeableWeight <= card.weightTo
    );

    if (matchingCard) {
      return matchingCard;
    }

    // If chargeableWeight exceeds the highest slab, use the highest slab's base + incremental rate
    const highestCard = rateCards[rateCards.length - 1];
    if (chargeableWeight > highestCard.weightTo) {
      return highestCard;
    }

    // If below lowest slab, use lowest
    return rateCards[0];
  }

  /**
   * Calculates COD Surcharge if payment type is COD.
   */
  static async calculateCODSurcharge(
    customerType: CustomerType,
    paymentType: PaymentType,
    baseCharge: number,
    declaredValue = 0
  ): Promise<{ surcharge: number; config?: any }> {
    if (paymentType === PaymentType.PREPAID) {
      return { surcharge: 0 };
    }

    const config = await CODConfiguration.findOne({
      customerType,
      active: true
    });

    if (!config) {
      // Default flat COD charge if none configured
      const defaultFlat = 30;
      return {
        surcharge: defaultFlat,
        config: { surchargeType: CODSurchargeType.FLAT, surchargeValue: defaultFlat }
      };
    }

    let calculated = 0;
    if (config.surchargeType === CODSurchargeType.FLAT) {
      calculated = config.surchargeValue;
    } else if (config.surchargeType === CODSurchargeType.PERCENTAGE) {
      const basis = declaredValue > 0 ? declaredValue : baseCharge;
      calculated = (basis * config.surchargeValue) / 100;
    }

    // Apply minimum and maximum bounds
    calculated = Math.max(calculated, config.minimumCharge);
    calculated = Math.min(calculated, config.maximumCharge);

    return {
      surcharge: Math.round(calculated * 100) / 100,
      config
    };
  }

  /**
   * Computes a full end-to-end pricing quote with detailed breakdown.
   */
  static async calculateQuote(input: IPricingQuoteInput): Promise<IPricingQuoteResult> {
    // 1. Zone resolution
    const pickupRes = await ZoneDetectionService.detectZoneByPincode(input.pickupPincode);
    const dropRes = await ZoneDetectionService.detectZoneByPincode(input.dropPincode);
    const zoneType = ZoneDetectionService.determineZoneType(pickupRes.zoneCode, dropRes.zoneCode);

    // 2. Weights
    const volumetricWeight = this.calculateVolumetricWeight(input.dimensions);
    const chargeableWeight = this.calculateChargeableWeight(input.actualWeight, volumetricWeight);

    // 3. Rate Card Lookup
    const rateCard = await this.findRateCard(input.customerType, zoneType, chargeableWeight);

    // 4. Base Charge Calculation
    // Base rate covers up to weightFrom; excess weight is multiplied by incremental rate
    const billableIncrementalWeight = Math.max(0, chargeableWeight - rateCard.weightFrom);
    const baseCharge = Math.round((rateCard.baseRate + billableIncrementalWeight * rateCard.incrementalRate) * 100) / 100;

    // 5. COD Surcharge
    const codResult = await this.calculateCODSurcharge(
      input.customerType,
      input.paymentType,
      baseCharge,
      input.declaredValue
    );

    const totalCharge = Math.round((baseCharge + codResult.surcharge) * 100) / 100;

    return {
      actualWeight: input.actualWeight,
      volumetricWeight,
      chargeableWeight,
      pickupZone: pickupRes.zoneCode,
      dropZone: dropRes.zoneCode,
      zoneType,
      customerType: input.customerType,
      paymentType: input.paymentType,
      rateCardId: (rateCard._id as any).toString(),
      baseCharge,
      codSurcharge: codResult.surcharge,
      totalCharge,
      currency: 'INR',
      breakdown: {
        baseRate: rateCard.baseRate,
        incrementalRate: rateCard.incrementalRate,
        weightSlab: `${rateCard.weightFrom} kg - ${rateCard.weightTo} kg`,
        volumetricFormula: `(${input.dimensions.length} x ${input.dimensions.breadth} x ${input.dimensions.height}) / 5000 = ${volumetricWeight} kg`,
        roundingRule: 'Rounded to 2 decimal places; Chargeable = MAX(Actual, Volumetric)',
        codType: codResult.config?.surchargeType,
        codValue: codResult.config?.surchargeValue
      }
    };
  }
}
