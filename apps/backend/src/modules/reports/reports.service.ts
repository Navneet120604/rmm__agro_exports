import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  activityLogs,
  commercialInvoices,
  customers,
  masterOrders,
  productionOrders,
  receipts,
  shippingCharges,
  suppliers,
} from '../../database/schema/index.js';
import type {
  CustomerReportFilterDto,
  OrderReportFilterDto,
  ReceiptReportFilterDto,
} from './dto/reports.dto.js';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  // -------------------------------------------------------------------------
  // 1. SALES ORDER REGISTER (Production Orders to Rice Mills)
  // -------------------------------------------------------------------------
  async getSalesOrderRegister(
    companyId: string,
    filter: OrderReportFilterDto = {},
  ) {
    if (!this.databaseService.isConnected) {
      return [
        {
          id: 'mock-po-1',
          documentNumber: 'RMM/1',
          documentDate: '2026-11-06',
          buyerPoNumber: 'PO-UAE-9921',
          supplierMillName: 'Karnal Rice Mill Ltd',
          totalQuantityMt: 100.0,
          allocatedInvoiceMt: 30.0,
          remainingMt: 70.0,
          status: 'PENDING',
        },
      ];
    }

    const conditions = [
      eq(productionOrders.companyId, companyId),
      isNull(productionOrders.deletedAt),
    ];

    if (filter.fromDate) {
      conditions.push(gte(productionOrders.documentDate, filter.fromDate));
    }
    if (filter.toDate) {
      conditions.push(lte(productionOrders.documentDate, filter.toDate));
    }
    if (filter.supplierMillId) {
      conditions.push(
        eq(productionOrders.supplierMillId, filter.supplierMillId),
      );
    }
    if (filter.status) {
      conditions.push(eq(productionOrders.status, filter.status));
    }

    const rows = await this.databaseService.db
      .select({
        id: productionOrders.id,
        documentNumber: productionOrders.documentNumber,
        documentDate: productionOrders.documentDate,
        buyerPoNumber: productionOrders.buyerPoNumber,
        supplierMillId: productionOrders.supplierMillId,
        supplierMillName: suppliers.name,
        totalQuantityMt: productionOrders.totalQuantityMt,
        allocatedInvoiceMt: productionOrders.allocatedInvoiceMt,
        status: productionOrders.status,
      })
      .from(productionOrders)
      .leftJoin(suppliers, eq(productionOrders.supplierMillId, suppliers.id))
      .where(and(...conditions))
      .orderBy(desc(productionOrders.documentDate));

    return rows.map((r) => {
      const total = parseFloat(r.totalQuantityMt);
      const allocated = parseFloat(r.allocatedInvoiceMt);
      return {
        ...r,
        totalQuantityMt: total,
        allocatedInvoiceMt: allocated,
        remainingMt: Math.max(0, Math.round((total - allocated) * 1000) / 1000),
      };
    });
  }

  // -------------------------------------------------------------------------
  // 2. INVOICE REGISTER (Commercial Export Invoices)
  // -------------------------------------------------------------------------
  async getInvoiceRegister(
    companyId: string,
    filter: CustomerReportFilterDto = {},
  ) {
    if (!this.databaseService.isConnected) {
      return [
        {
          id: 'mock-inv-1',
          documentNumber: 'RMM/EX/26-27/1',
          documentDate: '2026-11-08',
          financialYear: '26-27',
          customerName: 'Al-Barakah General Trading LLC',
          countryOfDestination: 'United Arab Emirates',
          incoterm: 'CIF',
          currency: 'USD',
          totalFobAmount: 50000.0,
          oceanFreightAmount: 1500.0,
          insuranceAmount: 100.0,
          totalInvoiceAmount: 51600.0,
          status: 'ISSUED',
        },
      ];
    }

    const conditions = [
      eq(commercialInvoices.companyId, companyId),
      isNull(commercialInvoices.deletedAt),
    ];

    if (filter.fromDate) {
      conditions.push(gte(commercialInvoices.documentDate, filter.fromDate));
    }
    if (filter.toDate) {
      conditions.push(lte(commercialInvoices.documentDate, filter.toDate));
    }
    if (filter.customerId) {
      conditions.push(eq(commercialInvoices.customerId, filter.customerId));
    }

    const rows = await this.databaseService.db
      .select({
        id: commercialInvoices.id,
        documentNumber: commercialInvoices.documentNumber,
        documentDate: commercialInvoices.documentDate,
        financialYear: commercialInvoices.financialYear,
        customerId: commercialInvoices.customerId,
        customerName: customers.name,
        countryOfDestination: commercialInvoices.countryOfDestination,
        incoterm: commercialInvoices.incoterm,
        currency: commercialInvoices.currency,
        totalFobAmount: commercialInvoices.totalFobAmount,
        oceanFreightAmount: commercialInvoices.oceanFreightAmount,
        insuranceAmount: commercialInvoices.insuranceAmount,
        totalInvoiceAmount: commercialInvoices.totalInvoiceAmount,
        status: commercialInvoices.status,
      })
      .from(commercialInvoices)
      .leftJoin(customers, eq(commercialInvoices.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(commercialInvoices.documentDate));

    return rows.map((r) => ({
      ...r,
      totalFobAmount: parseFloat(r.totalFobAmount),
      oceanFreightAmount: parseFloat(r.oceanFreightAmount),
      insuranceAmount: parseFloat(r.insuranceAmount),
      totalInvoiceAmount: parseFloat(r.totalInvoiceAmount),
    }));
  }

  // -------------------------------------------------------------------------
  // 3. PENDING PAYMENTS (DUE) REGISTER (Billed minus Received)
  // -------------------------------------------------------------------------
  async getPendingPayments(companyId: string) {
    if (!this.databaseService.isConnected) {
      return [
        {
          invoiceId: 'mock-inv-1',
          documentNumber: 'RMM/EX/26-27/1',
          documentDate: '2026-11-08',
          customerName: 'Al-Barakah General Trading LLC',
          currency: 'USD',
          totalInvoiceAmount: 51600.0,
          totalReceivedAmount: 20000.0,
          balanceDue: 31600.0,
          status: 'ISSUED',
        },
      ];
    }

    // Commercial invoices with customer join
    const invoices = await this.databaseService.db
      .select({
        id: commercialInvoices.id,
        documentNumber: commercialInvoices.documentNumber,
        documentDate: commercialInvoices.documentDate,
        customerName: customers.name,
        currency: commercialInvoices.currency,
        totalInvoiceAmount: commercialInvoices.totalInvoiceAmount,
        status: commercialInvoices.status,
      })
      .from(commercialInvoices)
      .leftJoin(customers, eq(commercialInvoices.customerId, customers.id))
      .where(
        and(
          eq(commercialInvoices.companyId, companyId),
          isNull(commercialInvoices.deletedAt),
        ),
      );

    // Get all receipts for the company
    const receiptRows = await this.databaseService.db
      .select({
        commercialInvoiceId: receipts.commercialInvoiceId,
        amountReceived: receipts.amountReceived,
      })
      .from(receipts)
      .where(and(eq(receipts.companyId, companyId), isNull(receipts.deletedAt)));

    const receiptsByInvoice = new Map<string, number>();
    for (const r of receiptRows) {
      const current = receiptsByInvoice.get(r.commercialInvoiceId) || 0;
      receiptsByInvoice.set(
        r.commercialInvoiceId,
        current + parseFloat(r.amountReceived),
      );
    }

    const pending = [];
    for (const inv of invoices) {
      const billed = parseFloat(inv.totalInvoiceAmount);
      const received = receiptsByInvoice.get(inv.id) || 0;
      const due = Math.round((billed - received) * 100) / 100;

      if (due > 0.01) {
        pending.push({
          invoiceId: inv.id,
          documentNumber: inv.documentNumber,
          documentDate: inv.documentDate,
          customerName: inv.customerName,
          currency: inv.currency,
          totalInvoiceAmount: billed,
          totalReceivedAmount: Math.round(received * 100) / 100,
          balanceDue: due,
          status: inv.status,
        });
      }
    }

    return pending.sort((a, b) => b.balanceDue - a.balanceDue);
  }

  // -------------------------------------------------------------------------
  // 4. SALES BY CUSTOMER (Aggregated Volume & Value)
  // -------------------------------------------------------------------------
  async getSalesByCustomer(companyId: string) {
    if (!this.databaseService.isConnected) {
      return [
        {
          customerId: 'cust-1',
          customerName: 'Al-Barakah General Trading LLC',
          country: 'United Arab Emirates',
          invoiceCount: 4,
          totalSalesAmount: 206400.0,
          currency: 'USD',
        },
      ];
    }

    const rows = await this.databaseService.db
      .select({
        customerId: commercialInvoices.customerId,
        customerName: customers.name,
        country: customers.country,
        invoiceCount: sql<number>`count(${commercialInvoices.id})`,
        totalSalesAmount: sql<string>`coalesce(sum(${commercialInvoices.totalInvoiceAmount}), 0)`,
      })
      .from(commercialInvoices)
      .leftJoin(customers, eq(commercialInvoices.customerId, customers.id))
      .where(
        and(
          eq(commercialInvoices.companyId, companyId),
          isNull(commercialInvoices.deletedAt),
        ),
      )
      .groupBy(
        commercialInvoices.customerId,
        customers.name,
        customers.country,
      );

    return rows.map((r) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      country: r.country,
      invoiceCount: Number(r.invoiceCount),
      totalSalesAmount: parseFloat(r.totalSalesAmount),
      currency: 'USD',
    }));
  }

  // -------------------------------------------------------------------------
  // 5. RECEIPTS REGISTER (All Inward Payments)
  // -------------------------------------------------------------------------
  async getReceiptsRegister(
    companyId: string,
    filter: ReceiptReportFilterDto = {},
  ) {
    if (!this.databaseService.isConnected) {
      return [
        {
          id: 'mock-rec-1',
          receiptNumber: 'REC-RMM/26-27/1',
          receiptDate: '2026-11-10',
          invoiceNumber: 'RMM/EX/26-27/1',
          customerName: 'Al-Barakah General Trading LLC',
          paymentMode: 'WIRE_TRANSFER',
          referenceNumber: 'SWIFT-998877',
          amountReceived: 51600.0,
          currency: 'USD',
        },
      ];
    }

    const conditions = [
      eq(receipts.companyId, companyId),
      isNull(receipts.deletedAt),
    ];

    if (filter.fromDate) {
      conditions.push(gte(receipts.receiptDate, filter.fromDate));
    }
    if (filter.toDate) {
      conditions.push(lte(receipts.receiptDate, filter.toDate));
    }
    if (filter.paymentMode) {
      conditions.push(eq(receipts.paymentMode, filter.paymentMode));
    }

    const rows = await this.databaseService.db
      .select({
        id: receipts.id,
        receiptNumber: receipts.receiptNumber,
        receiptDate: receipts.receiptDate,
        invoiceNumber: commercialInvoices.documentNumber,
        customerName: customers.name,
        paymentMode: receipts.paymentMode,
        referenceNumber: receipts.referenceNumber,
        amountReceived: receipts.amountReceived,
        currency: receipts.currency,
      })
      .from(receipts)
      .leftJoin(
        commercialInvoices,
        eq(receipts.commercialInvoiceId, commercialInvoices.id),
      )
      .leftJoin(customers, eq(receipts.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(receipts.receiptDate));

    return rows.map((r) => ({
      ...r,
      amountReceived: parseFloat(r.amountReceived),
    }));
  }

  // -------------------------------------------------------------------------
  // 6. SHIPPING & COST REGISTER (Incoterm Breakdown Chain)
  // -------------------------------------------------------------------------
  async getShippingAndCostRegister(companyId: string) {
    if (!this.databaseService.isConnected) {
      return [
        {
          invoiceNumber: 'RMM/EX/26-27/1',
          invoiceDate: '2026-11-08',
          incoterm: 'CIF',
          thcCharge: 200.0,
          blCharge: 50.0,
          sealCharge: 15.0,
          mucCharge: 25.0,
          riskCharge: 10.0,
          repositionCharge: 100.0,
          oceanFreightCharge: 1500.0,
          insuranceCharge: 100.0,
          totalShippingCharge: 2000.0,
          totalInvoiceAmount: 51600.0,
        },
      ];
    }

    const rows = await this.databaseService.db
      .select({
        invoiceNumber: commercialInvoices.documentNumber,
        invoiceDate: commercialInvoices.documentDate,
        incoterm: commercialInvoices.incoterm,
        thcCharge: shippingCharges.thcCharge,
        blCharge: shippingCharges.blCharge,
        sealCharge: shippingCharges.sealCharge,
        mucCharge: shippingCharges.mucCharge,
        riskCharge: shippingCharges.riskCharge,
        repositionCharge: shippingCharges.repositionCharge,
        oceanFreightCharge: shippingCharges.oceanFreightCharge,
        insuranceCharge: shippingCharges.insuranceCharge,
        totalShippingCharge: shippingCharges.totalShippingCharge,
        totalInvoiceAmount: commercialInvoices.totalInvoiceAmount,
      })
      .from(commercialInvoices)
      .leftJoin(
        shippingCharges,
        eq(commercialInvoices.id, shippingCharges.invoiceId),
      )
      .where(
        and(
          eq(commercialInvoices.companyId, companyId),
          isNull(commercialInvoices.deletedAt),
        ),
      )
      .orderBy(desc(commercialInvoices.documentDate));

    return rows.map((r) => ({
      invoiceNumber: r.invoiceNumber,
      invoiceDate: r.invoiceDate,
      incoterm: r.incoterm,
      thcCharge: parseFloat(r.thcCharge || '0.00'),
      blCharge: parseFloat(r.blCharge || '0.00'),
      sealCharge: parseFloat(r.sealCharge || '0.00'),
      mucCharge: parseFloat(r.mucCharge || '0.00'),
      riskCharge: parseFloat(r.riskCharge || '0.00'),
      repositionCharge: parseFloat(r.repositionCharge || '0.00'),
      oceanFreightCharge: parseFloat(r.oceanFreightCharge || '0.00'),
      insuranceCharge: parseFloat(r.insuranceCharge || '0.00'),
      totalShippingCharge: parseFloat(r.totalShippingCharge || '0.00'),
      totalInvoiceAmount: parseFloat(r.totalInvoiceAmount),
    }));
  }

  // -------------------------------------------------------------------------
  // EXECUTIVE DASHBOARD METRICS
  // -------------------------------------------------------------------------
  async getDashboardMetrics(companyId: string) {
    if (!this.databaseService.isConnected) {
      return {
        totalExportedMt: 1250.0,
        totalSalesUsd: 1285000.0,
        totalOutstandingDueUsd: 185000.0,
        activeOrdersCount: 6,
        pendingProductionOrdersCount: 3,
        recentActivity: [
          {
            id: 'act-1',
            action: 'CREATE',
            entityTable: 'commercial_invoices',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    // 1. Total exported MT & total sales
    const [invAgg] = await this.databaseService.db
      .select({
        totalSales: sql<string>`coalesce(sum(${commercialInvoices.totalInvoiceAmount}), 0)`,
      })
      .from(commercialInvoices)
      .where(
        and(
          eq(commercialInvoices.companyId, companyId),
          isNull(commercialInvoices.deletedAt),
        ),
      );

    // 2. Pending dues
    const pendingList = await this.getPendingPayments(companyId);
    let totalOutstandingDueUsd = 0;
    for (const p of pendingList) {
      totalOutstandingDueUsd += p.balanceDue;
    }

    // 3. Counts
    const [ordersCount] = await this.databaseService.db
      .select({ count: sql<number>`count(*)` })
      .from(masterOrders)
      .where(
        and(
          eq(masterOrders.companyId, companyId),
          eq(masterOrders.status, 'ACTIVE'),
          isNull(masterOrders.deletedAt),
        ),
      );

    const [pendingPoCount] = await this.databaseService.db
      .select({ count: sql<number>`count(*)` })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.companyId, companyId),
          eq(productionOrders.status, 'PENDING'),
          isNull(productionOrders.deletedAt),
        ),
      );

    // 4. Recent activity log
    const recentActivity = await this.databaseService.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.companyId, companyId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(5);

    return {
      totalSalesUsd: parseFloat(invAgg?.totalSales || '0.00'),
      totalOutstandingDueUsd:
        Math.round(totalOutstandingDueUsd * 100) / 100,
      activeOrdersCount: Number(ordersCount?.count || 0),
      pendingProductionOrdersCount: Number(pendingPoCount?.count || 0),
      recentActivity,
    };
  }
}
