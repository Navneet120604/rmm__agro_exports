import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CustomerReportFilterDto,
  OrderReportFilterDto,
  ReceiptReportFilterDto,
} from './dto/reports.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports & Executive Dashboard')
@ApiSecurity('bearer')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getCompanyContext(req: Request): string {
    const user = (req as any).user;
    return (
      user?.activeCompanyId ||
      (req.headers['x-company-id'] as string) ||
      '00000000-0000-0000-0000-000000000001'
    );
  }

  // ----------------------------------------------------
  // 1. SALES ORDER REGISTER
  // ----------------------------------------------------
  @Get('sales-order-register')
  @ApiOperation({
    summary:
      'Sales Order Register (Production orders by period, showing allocated & remaining MT)',
  })
  @ApiResponse({ status: 200, description: 'Sales order register list' })
  async getSalesOrderRegister(
    @Req() req: Request,
    @Query() filter: OrderReportFilterDto,
  ) {
    const companyId = this.getCompanyContext(req);
    return this.reportsService.getSalesOrderRegister(companyId, filter);
  }

  // ----------------------------------------------------
  // 2. INVOICE REGISTER
  // ----------------------------------------------------
  @Get('invoice-register')
  @ApiOperation({
    summary:
      'Commercial Export Invoice Register (All invoices by period, customer, and incoterm)',
  })
  @ApiResponse({ status: 200, description: 'Invoice register list' })
  async getInvoiceRegister(
    @Req() req: Request,
    @Query() filter: CustomerReportFilterDto,
  ) {
    const companyId = this.getCompanyContext(req);
    return this.reportsService.getInvoiceRegister(companyId, filter);
  }

  // ----------------------------------------------------
  // 3. PENDING PAYMENTS (DUE)
  // ----------------------------------------------------
  @Get('pending-payments')
  @ApiOperation({
    summary:
      'Pending Payments (Due) Report (Billed invoice amount minus received receipts per customer)',
  })
  @ApiResponse({ status: 200, description: 'Pending dues list' })
  async getPendingPayments(@Req() req: Request) {
    const companyId = this.getCompanyContext(req);
    return this.reportsService.getPendingPayments(companyId);
  }

  // ----------------------------------------------------
  // 4. SALES BY CUSTOMER
  // ----------------------------------------------------
  @Get('sales-by-customer')
  @ApiOperation({
    summary:
      'Sales by Customer Report (Aggregated export volume and revenue per foreign buyer)',
  })
  @ApiResponse({ status: 200, description: 'Sales by customer aggregation' })
  async getSalesByCustomer(@Req() req: Request) {
    const companyId = this.getCompanyContext(req);
    return this.reportsService.getSalesByCustomer(companyId);
  }

  // ----------------------------------------------------
  // 5. RECEIPTS REGISTER
  // ----------------------------------------------------
  @Get('receipts-register')
  @ApiOperation({
    summary:
      'Inward Foreign Exchange Receipts Register (All payment remittances received)',
  })
  @ApiResponse({ status: 200, description: 'Receipts register list' })
  async getReceiptsRegister(
    @Req() req: Request,
    @Query() filter: ReceiptReportFilterDto,
  ) {
    const companyId = this.getCompanyContext(req);
    return this.reportsService.getReceiptsRegister(companyId, filter);
  }

  // ----------------------------------------------------
  // 6. SHIPPING & COST REGISTER
  // ----------------------------------------------------
  @Get('shipping-and-cost')
  @ApiOperation({
    summary:
      'Shipping & Cost Register (Incoterm charge breakdown including THC, BL, Seal, Reposition, Freight & Insurance)',
  })
  @ApiResponse({ status: 200, description: 'Shipping & cost report' })
  async getShippingAndCostRegister(@Req() req: Request) {
    const companyId = this.getCompanyContext(req);
    return this.reportsService.getShippingAndCostRegister(companyId);
  }

  // ----------------------------------------------------
  // EXECUTIVE DASHBOARD METRICS
  // ----------------------------------------------------
  @Get('dashboard')
  @ApiOperation({
    summary:
      'Executive Dashboard Overview (Total sales, outstanding balance, active orders, and recent audit activity)',
  })
  @ApiResponse({ status: 200, description: 'Executive dashboard metrics' })
  async getDashboardMetrics(@Req() req: Request) {
    const companyId = this.getCompanyContext(req);
    return this.reportsService.getDashboardMetrics(companyId);
  }
}
