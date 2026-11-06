import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { MasterDataService } from './master-data.service.js';
import type { DatabaseService } from '../../database/database.service.js';
import type { ActivityLogService } from '../activity-log/activity-log.service.js';

describe('MasterDataService', () => {
  let service: MasterDataService;
  let mockDbService: DatabaseService;
  let recordSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDbService = {
      isConnected: false,
      db: null as any,
    } as any;

    recordSpy = vi.fn().mockResolvedValue(undefined);
    const mockActivityLogService = {
      record: recordSpy,
    } as unknown as ActivityLogService;

    service = new MasterDataService(mockDbService, mockActivityLogService);
  });

  describe('Customers', () => {
    it('should create a customer with default version 1 and active flags', async () => {
      const companyId = 'co-rmm-1';
      const result = await service.createCustomer(
        companyId,
        {
          name: 'Al-Khaleej Rice Importers LLC',
          country: 'United Arab Emirates',
          address: 'Al-Aweer, Dubai',
          email: 'info@alkhaleej.ae',
        },
        'usr-1',
        'admin',
      );

      expect(result.name).toBe('Al-Khaleej Rice Importers LLC');
      expect(result.country).toBe('United Arab Emirates');
      expect(result.version).toBe(1);
      expect(result.isBuyer).toBe(true);
      expect(result.isConsignee).toBe(true);
      expect(result.deletedAt).toBeNull();
    });

    it('should reject outdated edit when version does not match existing record (Optimistic Concurrency)', async () => {
      // Mock existing customer in DB with version 2
      const existingCustomer = {
        id: 'cust-123',
        companyId: 'co-rmm-1',
        name: 'Al-Khaleej Rice Importers LLC',
        address: 'Al-Aweer, Dubai',
        country: 'United Arab Emirates',
        version: 2, // Database is already at version 2!
        deletedAt: null,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([existingCustomer]),
            }),
          }),
        }),
      };

      const concurrentService = new MasterDataService(
        { isConnected: true, db: mockDb as any } as any,
        { record: vi.fn() } as any,
      );

      // User tries to save using an outdated version 1
      await expect(
        concurrentService.updateCustomer(
          'co-rmm-1',
          'cust-123',
          {
            name: 'Al-Khaleej Updated',
            country: 'United Arab Emirates',
            address: 'Al-Aweer, Dubai',
            version: 1, // Stale version!
          },
          'usr-2',
          'accountant',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should perform soft deletion and record audit trail with reason', async () => {
      const existingCustomer = {
        id: 'cust-123',
        companyId: 'co-rmm-1',
        name: 'Obsolete Buyer',
        address: 'Dubai',
        country: 'UAE',
        version: 1,
        deletedAt: null,
      };

      const updateWhereSpy = vi.fn().mockResolvedValue([{ id: 'cust-123' }]);
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([existingCustomer]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: updateWhereSpy,
          }),
        }),
      };

      const auditRecordSpy = vi.fn().mockResolvedValue(undefined);
      const deleteService = new MasterDataService(
        { isConnected: true, db: mockDb as any } as any,
        { record: auditRecordSpy } as any,
      );

      const deleteResult = await deleteService.deleteCustomer(
        'co-rmm-1',
        'cust-123',
        'usr-1',
        'admin',
        'Customer merged with another account',
      );

      expect(deleteResult.message).toContain('soft-deleted');
      expect(updateWhereSpy).toHaveBeenCalled();
      expect(auditRecordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entityTable: 'customers',
          entityId: 'cust-123',
          deletionReason: 'Customer merged with another account',
        }),
      );
    });
  });

  describe('Products', () => {
    it('should create a product with default HSN 10063020 and specified variety', async () => {
      const product = await service.createProduct(
        'co-rmm-1',
        {
          name: '1121 Golden Sella Basmati Rice',
          variety: '1121',
          processingType: 'SELLA_GOLDEN',
          defaultBrokenPercentage: '1.00',
          grainLengthMm: '8.35',
        },
        'usr-1',
        'admin',
      );

      expect(product.hsnCode).toBe('10063020');
      expect(product.variety).toBe('1121');
      expect(product.processingType).toBe('SELLA_GOLDEN');
      expect(product.version).toBe(1);
    });
  });
});
