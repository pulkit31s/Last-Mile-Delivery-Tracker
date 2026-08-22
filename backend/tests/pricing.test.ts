import { PricingService } from '../src/services/pricingService';
import { CustomerType, PaymentType, ZoneType, CODSurchargeType } from '../src/types';
import { VOLUMETRIC_DIVISOR } from '../src/constants';

describe('Pricing Engine & Volumetric Calculation', () => {
  describe('Volumetric Weight Calculation', () => {
    it('should correctly calculate volumetric weight with formula (L*B*H)/5000', () => {
      // 50 x 40 x 30 = 60,000 / 5000 = 12 kg
      const volWeight = PricingService.calculateVolumetricWeight({
        length: 50,
        breadth: 40,
        height: 30
      });
      expect(volWeight).toBe(12);
    });

    it('should round volumetric weight to 2 decimal places', () => {
      // 25 x 25 x 25 = 15,625 / 5000 = 3.125 -> 3.13 kg
      const volWeight = PricingService.calculateVolumetricWeight({
        length: 25,
        breadth: 25,
        height: 25
      });
      expect(volWeight).toBe(3.13);
    });

    it('should throw an error for non-positive dimensions', () => {
      expect(() => {
        PricingService.calculateVolumetricWeight({
          length: -10,
          breadth: 20,
          height: 10
        });
      }).toThrow();

      expect(() => {
        PricingService.calculateVolumetricWeight({
          length: 10,
          breadth: 0,
          height: 10
        });
      }).toThrow();
    });
  });

  describe('Chargeable Weight Determination', () => {
    it('should select actual weight when actual weight > volumetric weight', () => {
      const actual = 10;
      const vol = 4.5;
      const chargeable = PricingService.calculateChargeableWeight(actual, vol);
      expect(chargeable).toBe(10);
    });

    it('should select volumetric weight when volumetric weight > actual weight', () => {
      const actual = 2.5;
      const vol = 8.2;
      const chargeable = PricingService.calculateChargeableWeight(actual, vol);
      expect(chargeable).toBe(8.2);
    });

    it('should throw an error when actual weight is <= 0', () => {
      expect(() => {
        PricingService.calculateChargeableWeight(0, 5);
      }).toThrow();
    });
  });

  describe('COD Surcharge Rules', () => {
    it('should return 0 surcharge for PREPAID payment type', async () => {
      const result = await PricingService.calculateCODSurcharge(
        CustomerType.B2C,
        PaymentType.PREPAID,
        250
      );
      expect(result.surcharge).toBe(0);
    });
  });
});
