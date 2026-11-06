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
});
