import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DocumentHubService } from './document-hub.service.js';
import {
  AddDocumentHubItemDto,
  AddLotDto,
  CreateMasterOrderDto,
  UpdateDocumentStatusDto,
} from './dto/document-hub.dto.js';

@ApiTags('Document Hub & Shipment Lots')
@ApiSecurity('bearer')
@Controller('documents')
export class DocumentHubController {
  constructor(private readonly documentHubService: DocumentHubService) {}

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
  // MASTER ORDERS & SHIPMENT LOTS
  // ----------------------------------------------------
  @Get('orders')
  @ApiOperation({
    summary: 'List all Master Export Orders with LC tracking for active company',
  })
  @ApiResponse({ status: 200, description: 'Master orders list' })
  async listOrders(@Req() req: Request) {
    const { companyId } = this.getCompanyContext(req);
    return this.documentHubService.listMasterOrders(companyId);
  }

  @Get('orders/:id')
  @ApiOperation({
    summary:
      'Get Master Order details with split lots, export document set checklist, and readiness %',
  })
  @ApiParam({ name: 'id', description: 'Master Order UUID' })
  @ApiResponse({ status: 200, description: 'Master order complete details' })
  async getOrderDetails(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = this.getCompanyContext(req);
    return this.documentHubService.getMasterOrderDetails(companyId, id);
  }

  @Post('orders')
  @ApiOperation({
    summary:
      'Create Master Order and automatically initialize standard 9-point export document checklist',
  })
  @ApiResponse({ status: 201, description: 'Master order created' })
  async createOrder(
    @Req() req: Request,
    @Body() dto: CreateMasterOrderDto,
  ) {
    const { companyId, companyCode } = this.getCompanyContext(req);
    const user = (req as any).user;

    return this.documentHubService.createMasterOrder(
      companyId,
      companyCode,
      dto,
      user?.sub || 'usr-mock',
      user?.username || 'admin',
    );
  }

  @Post('lots')
  @ApiOperation({
    summary:
      'Split Master Order into shipment lots (validates total allocated MT does not exceed order)',
  })
  @ApiResponse({ status: 201, description: 'Shipment lot added' })
  async addLot(@Req() req: Request, @Body() dto: AddLotDto) {
    const { companyId } = this.getCompanyContext(req);
    return this.documentHubService.addLot(companyId, dto);
  }

  // ----------------------------------------------------
  // DOCUMENT HUB CHECKLIST & VERIFICATION
  // ----------------------------------------------------
  @Post('items')
  @ApiOperation({
    summary: 'Add a custom document to the export document set checklist',
  })
  @ApiResponse({ status: 201, description: 'Document checklist item created' })
  async addDocumentItem(
    @Req() req: Request,
    @Body() dto: AddDocumentHubItemDto,
  ) {
    const { companyId } = this.getCompanyContext(req);
    return this.documentHubService.addDocumentItem(companyId, dto);
  }

  @Patch('items/:id')
  @ApiOperation({
    summary:
      'Update document status (PENDING -> DRAFTED -> COLLECTED -> VERIFIED) with audit trail',
  })
  @ApiParam({ name: 'id', description: 'Document Hub Item UUID' })
  @ApiResponse({ status: 200, description: 'Document item updated' })
  async updateDocumentStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentStatusDto,
  ) {
    const { companyId } = this.getCompanyContext(req);
    const user = (req as any).user;

    return this.documentHubService.updateDocumentStatus(
      companyId,
      id,
      dto,
      user?.sub || 'usr-mock',
      user?.username || 'admin',
    );
  }
}
