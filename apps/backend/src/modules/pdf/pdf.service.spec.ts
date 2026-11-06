import { describe, it, expect, beforeEach } from 'vitest';
import { PdfService } from './pdf.service.js';

describe('PdfService & Document Engine', () => {
  let service: PdfService;

  beforeEach(() => {
    service = new PdfService();
  });

  it('should generate a valid binary PDF buffer for Commercial Export Invoice with %PDF- header', async () => {
    const buffer = await service.generateCommercialInvoicePdf({
      company: {
        name: 'RMM Agro Exports',
        code: 'RMM',
        address: 'Taraori, Karnal, Haryana, India',
        gstin: '06AABCR1234F1Z5',
        iec: '0505012345',
      },
      buyer: {
        name: 'Al-Barakah General Trading LLC',
        address: 'Dubai, UAE',
        country: 'United Arab Emirates',
      },
      documentNumber: 'RMM/EX/26-27/001',
      documentDate: '2026-11-08',
      financialYear: '26-27',
      buyerPoNumber: 'PO-UAE-9921',
      portOfLoading: 'Mundra Port, India',
      portOfDischarge: 'Jebel Ali, UAE',
      countryOfDestination: 'United Arab Emirates',
      incoterm: 'CIF',
      currency: 'USD',
      items: [
        {
          productName: '1121 Steam Basmati Rice',
          packingDescription: '30 KG Non-Woven Bags',
          quantityMt: 50.0,
          ratePerMt: 1000.0,
          amount: 50000.0,
          specifications: 'Silky Polished, Max 1% Broken',
        },
      ],
      totalFobAmount: 50000.0,
      oceanFreightAmount: 1500.0,
      insuranceAmount: 100.0,
      totalInvoiceAmount: 51600.0,
      amountInWords: 'US Dollars Fifty-One Thousand Six Hundred Only',
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1500);

    // Standard PDF file signature check: "%PDF-"
    const signature = buffer.subarray(0, 5).toString('ascii');
    expect(signature).toBe('%PDF-');
  });

  it('should generate a valid binary PDF buffer for Export Packing List', async () => {
    const buffer = await service.generatePackingListPdf(
      {
        name: 'RMM Agro Exports',
        code: 'RMM',
      },
      'RMM/EX/26-27/001',
      '2026-11-08',
      {
        name: 'Al-Barakah General Trading LLC',
        address: 'Dubai, UAE',
        country: 'United Arab Emirates',
      },
      [
        {
          containerNumber: 'MSCU9876543',
          sealNumber: 'SEAL-001234',
          containerSize: '20FT',
          totalBags: 833,
          grossWeightKg: 25150.0,
          netWeightKg: 25000.0,
        },
      ],
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
