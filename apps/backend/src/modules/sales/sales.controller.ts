import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CreateProductionOrderDto,
  CreateProformaInvoiceDto,
} from './dto/sales.dto.js';
import { SalesService } from './sales.service.js';

@ApiTags('Sales & Export Documents')
@ApiSecurity('bearer')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  private getCompanyContext(req: Request): {
    companyId: string;
    companyCode: string;
  } {
    const user = (req as any).user;
    return {
      companyId:
        user?.activeCompanyId ||
        (req.headers['x-company-id'] as string) ||
        '00000000-0000-0000-0000-000000000001',
      companyCode: user?.activeCompanyCode || 'RMM',
    };
  }

  // ----------------------------------------------------
  // PROFORMA INVOICES
  // ----------------------------------------------------
  @Get('proformas')
  @ApiOperation({
    summary: 'List all Proforma Invoices for the active exporting company',
  })
  @ApiResponse({ status: 200, description: 'Proforma invoices list' })
  async listProformas(@Req() req: Request) {
    const { companyId } = this.getCompanyContext(req);
    return this.salesService.listProformas(companyId);
  }

  @Post('proformas')
  @ApiOperation({
    summary:
      'Issue a new Proforma Invoice (atomic gap-free numbering & frozen terms)',
  })
  @ApiResponse({ status: 201, description: 'Proforma invoice created' })
  async createProforma(
    @Req() req: Request,
    @Body() dto: CreateProformaInvoiceDto,
  ) {
    const { companyId, companyCode } = this.getCompanyContext(req);
    const user = (req as any).user;

    return this.salesService.createProformaInvoice(
      companyId,
      companyCode,
      dto,
      user?.sub || 'usr-mock',
      user?.username || 'admin',
    );
  }

  // ----------------------------------------------------
  // PRODUCTION ORDERS
  // ----------------------------------------------------
  @Get('production-orders')
  @ApiOperation({
    summary: 'List all Production Orders dispatched to rice mills',
  })
  @ApiResponse({ status: 200, description: 'Production orders list' })
  async listProductionOrders(@Req() req: Request) {
    const { companyId } = this.getCompanyContext(req);
    return this.salesService.listProductionOrders(companyId);
  }

  @Post('production-orders')
  @ApiOperation({
    summary:
      'Create Production Order with strict Rule 8 remaining-quantity verification',
  })
  @ApiResponse({ status: 201, description: 'Production order created' })
  async createProductionOrder(
    @Req() req: Request,
    @Body() dto: CreateProductionOrderDto,
  ) {
    const { companyId, companyCode } = this.getCompanyContext(req);
    const user = (req as any).user;

    return this.salesService.createProductionOrder(
      companyId,
      companyCode,
      dto,
      user?.sub || 'usr-mock',
      user?.username || 'admin',
    );
  }
}
