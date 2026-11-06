import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  DocumentNumberingService,
  type DocumentType,
  type NextNumberResult,
} from './document-numbering.service.js';

@ApiTags('Document Numbering')
@Controller('document-numbering')
export class DocumentNumberingController {
  constructor(
    private readonly numberingService: DocumentNumberingService,
  ) {}

  @Get('preview')
  @ApiOperation({
    summary: 'Preview the next document number without allocating it',
  })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'companyCode', required: true })
  @ApiQuery({
    name: 'documentType',
    enum: ['PROFORMA', 'PRODUCTION_ORDER', 'COMMERCIAL_INVOICE'],
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Next document number details' })
  async previewNextNumber(
    @Query('companyId') companyId: string,
    @Query('companyCode') companyCode: string,
    @Query('documentType') documentType: DocumentType,
  ): Promise<NextNumberResult> {
    return this.numberingService.peekNextNumber(
      companyId,
      companyCode,
      documentType,
    );
  }
}
