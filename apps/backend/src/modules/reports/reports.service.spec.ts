import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from './reports.service.js';
import type { DatabaseService } from '../../database/database.service.js';

describe('ReportsService & Financial Registers', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService({
      isConnected: false,
      db: null as any,
    } as DatabaseService);
  });

  describe('Report Mock Fallbacks', () => {
    it('should return sales order register with remaining MT calculation', async () => {
      const rows = await service.getSalesOrderRegister('co-rmm-1');
      expect(rows).toHaveLength(1);
      expect(rows[0]!.documentNumber).toBe('RMM/1');
      expect(rows[0]!.remainingMt).toBe(70.0);
    });

    it('should return invoice register with CIF charge breakdown', async () => {
      const rows = await service.getInvoiceRegister('co-rmm-1');
      expect(rows).toHaveLength(1);
      expect(rows[0]!.documentNumber).toBe('RMM/EX/26-27/1');
      expect(rows[0]!.totalInvoiceAmount).toBe(51600.0);
      expect(rows[0]!.oceanFreightAmount).toBe(1500.0);
    });

    it('should return pending payments dues with exact balance due', async () => {
      const dues = await service.getPendingPayments('co-rmm-1');
      expect(dues).toHaveLength(1);
      expect(dues[0]!.balanceDue).toBe(31600.0);
      expect(dues[0]!.totalInvoiceAmount).toBe(51600.0);
      expect(dues[0]!.totalReceivedAmount).toBe(20000.0);
    });

    it('should return executive dashboard overview metrics', async () => {
      const dashboard = await service.getDashboardMetrics('co-rmm-1');
      expect(dashboard.totalSalesUsd).toBe(1285000.0);
      expect(dashboard.totalOutstandingDueUsd).toBe(185000.0);
      expect(dashboard.activeOrdersCount).toBe(6);
    });
  });

  describe('Pending Dues Database Calculation', () => {
    it('should compute billed minus receipts correctly and exclude fully settled invoices', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          documentNumber: 'RMM/EX/26-27/1',
          documentDate: '2026-11-01',
          customerName: 'Buyer A',
          currency: 'USD',
          totalInvoiceAmount: '10000.00',
          status: 'ISSUED',
        },
        {
          id: 'inv-2',
          documentNumber: 'RMM/EX/26-27/2',
          documentDate: '2026-11-02',
          customerName: 'Buyer B',
          currency: 'USD',
          totalInvoiceAmount: '5000.00',
          status: 'PAID',
        },
      ];

      const mockReceipts = [
        { commercialInvoiceId: 'inv-1', amountReceived: '3000.00' }, // 7,000 remains due!
        { commercialInvoiceId: 'inv-2', amountReceived: '5000.00' }, // 0 remains due (fully settled)!
      ];

      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation(() => ({
            leftJoin: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockResolvedValue(mockInvoices),
            })),
            where: vi.fn().mockResolvedValue(mockReceipts),
          })),
        })),
      };

      const dbService = new ReportsService({
        isConnected: true,
        db: mockDb as any,
      } as any);

      const result = await dbService.getPendingPayments('co-rmm-1');

      // Only inv-1 has an outstanding balance of 7000.00
      expect(result).toHaveLength(1);
      expect(result[0]!.invoiceId).toBe('inv-1');
      expect(result[0]!.balanceDue).toBe(7000.0);
      expect(result[0]!.totalReceivedAmount).toBe(3000.0);
    });
  });
});
