import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DocumentHubService } from './document-hub.service.js';
import type { DatabaseService } from '../../database/database.service.js';
import type { DocumentNumberingService } from '../document-numbering/document-numbering.service.js';
import type { ActivityLogService } from '../activity-log/activity-log.service.js';

describe('DocumentHubService', () => {
  let service: DocumentHubService;
  let mockNumberingService: DocumentNumberingService;
  let mockActivityLogService: ActivityLogService;

  beforeEach(() => {
    mockNumberingService = {
      allocateNextNumber: vi.fn().mockResolvedValue({
        documentNumber: 'ORD-RMM/26-27/1',
        sequenceNumber: 1,
        financialYear: '26-27',
        prefix: 'RMM',
      }),
    } as any;

    mockActivityLogService = {
      record: vi.fn().mockResolvedValue(undefined),
    } as any;

    service = new DocumentHubService(
      { isConnected: false, db: null as any } as DatabaseService,
      mockNumberingService,
      mockActivityLogService,
    );
  });

  describe('Master Orders', () => {
    it('should create a Master Order and format proper document number', async () => {
      const order = await service.createMasterOrder(
        'co-rmm-1',
        'RMM',
        {
          orderDate: '2026-11-08',
          buyerPoNumber: 'PO-UAE-101',
          lcNumber: 'LC-EMIRATES-1234',
          issuingBank: 'Emirates NBD',
          totalQuantityMt: 500.0,
        },
        'usr-1',
        'admin',
      );

      expect(order.orderNumber).toBe('ORD-RMM/26-27/1');
      expect(order.totalQuantityMt).toBe('500.000');
      expect(order.status).toBe('ACTIVE');
    });

    it('should reject Master Order if sum of initial lots exceeds total order quantity', async () => {
      await expect(
        service.createMasterOrder(
          'co-rmm-1',
          'RMM',
          {
            orderDate: '2026-11-08',
            totalQuantityMt: 200.0,
            lots: [
              { lotNumber: 1, quantityMt: 120.0 },
              { lotNumber: 2, quantityMt: 100.0 }, // 120 + 100 = 220 > 200!
            ],
          },
          'usr-1',
          'admin',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject adding lot when quantity exceeds unallocated order balance', async () => {
      const mockOrder = {
        id: 'ord-1',
        totalQuantityMt: '200.000',
      };
      const existingLots = [
        { id: 'lot-1', quantityMt: '150.000' }, // 50 MT remaining
      ];

      const mockDb = {
        transaction: vi.fn(async (cb) => {
          const tx = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi
                  .fn()
                  .mockResolvedValueOnce([mockOrder])
                  .mockResolvedValueOnce(existingLots),
              }),
            }),
            insert: vi.fn().mockReturnValue({ values: vi.fn() }),
          };
          return cb(tx);
        }),
      };

      const validatingService = new DocumentHubService(
        { isConnected: true, db: mockDb as any } as any,
        mockNumberingService,
        mockActivityLogService,
      );

      // Attempting to add 60 MT when only 50 MT is available
      await expect(
        validatingService.addLot('co-rmm-1', {
          masterOrderId: 'ord-1',
          lotNumber: 2,
          quantityMt: 60.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Document Status Updates', () => {
    it('should update document verification and status in mock mode', async () => {
      const updated = await service.updateDocumentStatus(
        'co-rmm-1',
        'doc-1',
        {
          status: 'VERIFIED',
          isVerified: true,
          notes: 'Bill of Lading verified with Maersk Line',
        },
        'usr-1',
        'admin',
      );

      expect(updated.status).toBe('VERIFIED');
      expect(updated.isVerified).toBe(true);
      expect(updated.notes).toBe('Bill of Lading verified with Maersk Line');
    });
  });
});
