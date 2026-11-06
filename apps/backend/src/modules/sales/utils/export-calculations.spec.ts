import { describe, it, expect } from 'vitest';
import {
  computeShippingCharges,
  convertAmountToWords,
} from './export-calculations.js';

describe('Export Calculations & Rule 7 Verification', () => {
  const sampleCharges = {
    thcCharge: 150.0,
    blCharge: 50.0,
    sealCharge: 15.0,
    mucCharge: 25.0,
    riskCharge: 10.0,
    repositionCharge: 100.0,
    oceanFreightCharge: 1200.0,
    insuranceCharge: 85.0,
  };

  it('FOB should include only local port & vessel charges (THC, BL, Seal, MUC, Risk, Reposition)', () => {
    const result = computeShippingCharges('FOB', sampleCharges);
    // 150 + 50 + 15 + 25 + 10 + 100 = 350
    expect(result.totalShippingCharge).toBe(350.0);
    expect(result.oceanFreightCharge).toBe(0);
    expect(result.insuranceCharge).toBe(0);
  });

  it('CFR should include FOB charges plus Ocean Freight, but exclude Insurance', () => {
    const result = computeShippingCharges('CFR', sampleCharges);
    // 350 + 1200 = 1550
    expect(result.totalShippingCharge).toBe(1550.0);
    expect(result.oceanFreightCharge).toBe(1200.0);
    expect(result.insuranceCharge).toBe(0);
  });

  it('CIF should include FOB charges plus Ocean Freight and Insurance', () => {
    const result = computeShippingCharges('CIF', sampleCharges);
    // 350 + 1200 + 85 = 1635
    expect(result.totalShippingCharge).toBe(1635.0);
    expect(result.oceanFreightCharge).toBe(1200.0);
    expect(result.insuranceCharge).toBe(85.0);
  });

  describe('convertAmountToWords', () => {
    it('should accurately convert standard USD amounts to words', () => {
      const words = convertAmountToWords(45200.5, 'USD');
      expect(words).toBe(
        'US Dollars Forty-Five Thousand Two Hundred And Cents Fifty Only',
      );
    });

    it('should convert whole amounts without cents', () => {
      const words = convertAmountToWords(1000000, 'USD');
      expect(words).toBe('US Dollars One Million Only');
    });

    it('should convert zero', () => {
      expect(convertAmountToWords(0, 'USD')).toBe('USD Zero Only');
    });
  });
});
