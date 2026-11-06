import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service.js';
import type { DatabaseService } from '../../database/database.service.js';
import type { DocumentNumberingService } from '../document-numbering/document-numbering.service.js';
import type { ActivityLogService } from '../activity-log/activity-log.service.js';

describe('SalesService & Core Business Rules', () => {
  let service: SalesService;
  let mockNumberingService: DocumentNumberingService;
  let mockActivityLogService: ActivityLogService;

  beforeEach(() => {
    mockNumberingService = {
      allocateNextNumber: vi.fn().mockImplementation((_cid, _code, type) => {
        if (type === 'PROFORMA') {
          return Promise.resolve({
            documentNumber: 'PI-RMM/AM/1',
            sequenceNumber: 1,
            financialYear: 'PERPETUAL',
            prefix: 'RMM',
          });
        }
        return Promise.resolve({
          documentNumber: 'RMM/1',
          sequenceNumber: 1,
          financialYear: 'PERPETUAL',
          prefix: 'RMM',
        });
      }),
    } as any;

    mockActivityLogService = {
      record: vi.fn().mockResolvedValue(undefined),
    } as any;

    service = new SalesService(
      { isConnected: false, db: null as any } as DatabaseService,
      mockNumberingService,
      mockActivityLogService,
    );
  });

  describe('Proforma Invoice Creation', () => {
    it('should create Proforma Invoice and calculate exact authoritative total quantity and amount', async () => {
      const result = await service.createProformaInvoice(
        'co-rmm-1',
        'RMM',
        {
          documentDate: '2026-11-06',
          customerId: 'cust-consignee-uuid',
          consigneeId: 'cust-buyer-uuid',
          incoterm: 'CIF',
          currency: 'USD',
          portOfLoading: 'Mundra',
          portOfDischarge: 'Jebel Ali',
          finalDestination: 'Dubai',
          paymentTerms: '100% LC at sight',
          items: [
            {
              productId: 'prod-1121',
              packingTypeId: 'pack-30kg',
              quantityMt: 250.0,
              ratePerMt: 980.0,
            },
            {
              productId: 'prod-1509',
              packingTypeId: 'pack-50kg',
              quantityMt: 100.0,
              ratePerMt: 850.0,
            },
          ],
        },
        'usr-1',
        'admin',
      );

      expect(result.documentNumber).toBe('PI-RMM/AM/1');
      // 250 + 100 = 350.000 MT
      expect(result.totalQuantityMt).toBe('350.000');
      // (250 * 980) + (100 * 850) = 245000 + 85000 = 330000.00
      expect(result.totalAmount).toBe('330000.00');
      // Rule 10: Preserved party mapping
      expect(result.customerId).toBe('cust-consignee-uuid');
      expect(result.consigneeId).toBe('cust-buyer-uuid');
    });
  });

  describe('Rule 8: Remaining-Quantity Checks on Production Orders', () => {
    it('should reject Production Order when requested quantity exceeds unallocated proforma item balance', async () => {
      // Mock existing proforma item with 100 MT total, already 80 MT allocated -> 20 MT remaining
      const mockPiItem = {
        id: 'pi-item-1',
        quantityMt: '100.000',
        allocatedProductionMt: '80.000', // Only 20 MT remains!
      };

      const mockDb = {
        transaction: vi.fn(async (cb) => {
          const tx = {
            select: () => ({
              from: () => ({
                where: () => ({
                  for: vi.fn().mockResolvedValue([mockPiItem]),
                }),
              }),
            }),
            update: () => ({ set: () => ({ where: vi.fn() }) }),
            insert: () => ({ values: () => ({ returning: vi.fn() }) }),
          };
          return cb(tx);
        }),
      };

      const validatingService = new SalesService(
        { isConnected: true, db: mockDb as any } as any,
        mockNumberingService,
        mockActivityLogService,
      );

      // User attempts to allocate 25 MT (exceeds the 20 MT remaining balance!)
      await expect(
        validatingService.createProductionOrder(
          'co-rmm-1',
          'RMM',
          {
            documentDate: '2026-11-06',
            proformaInvoiceId: 'pi-1',
            items: [
              {
                proformaItemId: 'pi-item-1',
                productId: 'prod-1',
                packingTypeId: 'pack-1',
                quantityMt: 25.0, // Exceeds remaining 20 MT!
              },
            ],
          },
          'usr-1',
          'admin',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed when requested quantity is within remaining proforma item balance', async () => {
      const mockPiItem = {
        id: 'pi-item-1',
        quantityMt: '100.000',
        allocatedProductionMt: '50.000', // 50 MT remaining
      };

      const mockPo = {
        id: 'po-1',
        documentNumber: 'RMM/1',
        totalQuantityMt: '30.000',
      };

      const mockDb = {
        transaction: vi.fn(async (cb) => {
          const tx = {
            select: () => ({
              from: () => ({
                where: () => ({
                  for: vi.fn().mockResolvedValue([mockPiItem]),
                }),
              }),
            }),
            update: () => ({ set: () => ({ where: vi.fn().mockResolvedValue([]) }) }),
            insert: () => ({
              values: () => ({
                returning: vi.fn().mockResolvedValue([mockPo]),
              }),
            }),
          };
          return cb(tx);
        }),
      };

      const validatingService = new SalesService(
        { isConnected: true, db: mockDb as any } as any,
        mockNumberingService,
        mockActivityLogService,
      );

      // Allocating 30 MT (less than 50 MT remaining) -> must succeed!
      const po = await validatingService.createProductionOrder(
        'co-rmm-1',
        'RMM',
        {
          documentDate: '2026-11-06',
          proformaInvoiceId: 'pi-1',
          items: [
            {
              proformaItemId: 'pi-item-1',
              productId: 'prod-1',
              packingTypeId: 'pack-1',
              quantityMt: 30.0,
            },
          ],
        },
        'usr-1',
        'admin',
      );

      expect(po.documentNumber).toBe('RMM/1');
    });
  });

  describe('Commercial Invoice & Packing List Creation', () => {
    it('should calculate CIF total including freight, insurance, and amount in words', async () => {
      const result = await service.createCommercialInvoice(
        'co-rmm-1',
        'RMM',
        {
          documentDate: '2026-11-08',
          customerId: 'cust-1',
          portOfLoading: 'Mundra Port, India',
          portOfDischarge: 'Jebel Ali, UAE',
          countryOfDestination: 'United Arab Emirates',
          incoterm: 'CIF',
          currency: 'USD',
          items: [
            {
              productId: 'prod-1',
              packingTypeId: 'pack-1',
              quantityMt: 50.0,
              ratePerMt: 1000.0, // FOB: $50,000.00
            },
          ],
          shippingCharges: {
            thcCharge: 200.0,
            blCharge: 50.0,
            sealCharge: 15.0,
            mucCharge: 25.0,
            riskCharge: 10.0,
            repositionCharge: 100.0,
            oceanFreightCharge: 1500.0,
            insuranceCharge: 100.0,
          },
          containers: [
            {
              containerNumber: 'MSCU9876543',
              sealNumber: 'SEAL1234',
              containerSize: '20FT',
              totalBags: 1000,
              grossWeightKg: 25150.0,
              netWeightKg: 25000.0,
            },
          ],
        },
        'usr-1',
        'admin',
      );

      // FOB = 50,000.00
      expect(result.totalFobAmount).toBe('50000.00');
      // Ocean freight = 1500.00
      expect(result.oceanFreightAmount).toBe('1500.00');
      // Insurance = 100.00
      expect(result.insuranceAmount).toBe('100.00');
      // Total = 50000 + 1500 + 100 = 51600.00
      expect(result.totalInvoiceAmount).toBe('51600.00');
      // Amount in words
      expect(result.amountInWords).toContain('Fifty-One Thousand Six Hundred Only');
    });

    it('should reject Commercial Invoice if total quantity exceeds production order balance', async () => {
      const mockPo = {
        id: 'po-1',
        totalQuantityMt: '50.000',
        allocatedInvoiceMt: '40.000', // 10 MT remaining
      };

      const mockDb = {
        transaction: vi.fn(async (cb) => {
          const tx = {
            select: () => ({
              from: () => ({
                where: () => ({
                  for: vi.fn().mockResolvedValue([mockPo]),
                }),
              }),
            }),
            update: () => ({ set: () => ({ where: vi.fn() }) }),
            insert: () => ({ values: () => ({ returning: vi.fn() }) }),
          };
          return cb(tx);
        }),
      };

      const validatingService = new SalesService(
        { isConnected: true, db: mockDb as any } as any,
        mockNumberingService,
        mockActivityLogService,
      );

      // Attempting to invoice 15 MT when only 10 MT remains on the PO
      await expect(
        validatingService.createCommercialInvoice(
          'co-rmm-1',
          'RMM',
          {
            documentDate: '2026-11-08',
            productionOrderId: 'po-1',
            customerId: 'cust-1',
            portOfLoading: 'Mundra',
            portOfDischarge: 'Jebel Ali',
            countryOfDestination: 'UAE',
            incoterm: 'FOB',
            items: [
              {
                productId: 'prod-1',
                packingTypeId: 'pack-1',
                quantityMt: 15.0, // Exceeds remaining 10 MT!
                ratePerMt: 950.0,
              },
            ],
          },
          'usr-1',
          'admin',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payment Receipts', () => {
    it('should create payment receipt against commercial invoice in mock mode', async () => {
      const result = await service.createReceipt(
        'co-rmm-1',
        'RMM',
        {
          receiptDate: '2026-11-10',
          commercialInvoiceId: 'inv-1',
          customerId: 'cust-1',
          amountReceived: 51600.0,
          currency: 'USD',
          paymentMode: 'WIRE_TRANSFER',
          referenceNumber: 'SWIFT-998877',
        },
        'usr-1',
        'admin',
      );

      expect(result.amountReceived).toBe('51600.00');
      expect(result.currency).toBe('USD');
      expect(result.paymentMode).toBe('WIRE_TRANSFER');
      expect(result.referenceNumber).toBe('SWIFT-998877');
    });
  });
});
