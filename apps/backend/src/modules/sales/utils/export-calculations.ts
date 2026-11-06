export interface ShippingChargesInput {
  thcCharge?: number;
  blCharge?: number;
  sealCharge?: number;
  mucCharge?: number;
  riskCharge?: number;
  repositionCharge?: number;
  oceanFreightCharge?: number;
  insuranceCharge?: number;
}

export interface ComputedShippingCharges {
  incoterm: 'FOB' | 'CFR' | 'CIF';
  thcCharge: number;
  blCharge: number;
  sealCharge: number;
  mucCharge: number;
  riskCharge: number;
  repositionCharge: number;
  oceanFreightCharge: number;
  insuranceCharge: number;
  totalShippingCharge: number;
}

/**
 * Rule 7: Incoterm-Driven Shipping Charges
 * - FOB includes THC, BL, Seal, MUC, Risk, Reposition
 * - CFR includes FOB charges plus Ocean Freight
 * - CIF includes CFR charges plus Insurance
 */
export function computeShippingCharges(
  incoterm: 'FOB' | 'CFR' | 'CIF',
  input: ShippingChargesInput,
): ComputedShippingCharges {
  const thc = input.thcCharge || 0;
  const bl = input.blCharge || 0;
  const seal = input.sealCharge || 0;
  const muc = input.mucCharge || 0;
  const risk = input.riskCharge || 0;
  const reposition = input.repositionCharge || 0;

  const baseFobTotal = thc + bl + seal + muc + risk + reposition;

  let oceanFreight = 0;
  let insurance = 0;

  if (incoterm === 'CFR' || incoterm === 'CIF') {
    oceanFreight = input.oceanFreightCharge || 0;
  }

  if (incoterm === 'CIF') {
    insurance = input.insuranceCharge || 0;
  }

  const grandTotal = baseFobTotal + oceanFreight + insurance;

  return {
    incoterm,
    thcCharge: round2(thc),
    blCharge: round2(bl),
    sealCharge: round2(seal),
    mucCharge: round2(muc),
    riskCharge: round2(risk),
    repositionCharge: round2(reposition),
    oceanFreightCharge: round2(oceanFreight),
    insuranceCharge: round2(insurance),
    totalShippingCharge: round2(grandTotal),
  };
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertThreeDigits(num: number): string {
  let str = '';
  if (num >= 100) {
    str += `${ONES[Math.floor(num / 100)]} Hundred `;
    num %= 100;
  }
  if (num >= 20) {
    const tens = TENS[Math.floor(num / 10)];
    const ones = num % 10;
    if (ones > 0) {
      str += `${tens}-${ONES[ones]} `;
      num = 0;
    } else {
      str += `${tens} `;
      num = 0;
    }
  }
  if (num > 0) {
    str += `${ONES[num]} `;
  }
  return str.trim();
}

/**
 * Standard International Currency Amount in Words (e.g. "US Dollars Forty-Five Thousand Two Hundred And Cents Fifty Only")
 */
export function convertAmountToWords(
  amount: number,
  currency: string = 'USD',
): string {
  if (amount === 0) {
    return `${currency} Zero Only`;
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let current = integerPart;
  const parts: string[] = [];

  const billions = Math.floor(current / 1_000_000_000);
  if (billions > 0) {
    parts.push(`${convertThreeDigits(billions)} Billion`);
    current %= 1_000_000_000;
  }

  const millions = Math.floor(current / 1_000_000);
  if (millions > 0) {
    parts.push(`${convertThreeDigits(millions)} Million`);
    current %= 1_000_000;
  }

  const thousands = Math.floor(current / 1_000);
  if (thousands > 0) {
    parts.push(`${convertThreeDigits(thousands)} Thousand`);
    current %= 1_000;
  }

  if (current > 0) {
    parts.push(convertThreeDigits(current));
  }

  const currencyName =
    currency.toUpperCase() === 'USD' ? 'US Dollars' : currency.toUpperCase();
  let words = `${currencyName} ${parts.join(' ')}`;

  if (decimalPart > 0) {
    words += ` And Cents ${convertThreeDigits(decimalPart)}`;
  }

  return `${words} Only`;
}
