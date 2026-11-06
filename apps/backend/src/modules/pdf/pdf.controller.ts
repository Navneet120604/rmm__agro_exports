import { Controller, Get, Res } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PdfService } from './pdf.service.js';

@ApiTags('PDF Generation Engine')
@ApiSecurity('bearer')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('sample-invoice')
  @ApiOperation({
    summary:
      'Generate official print-faithful A4 Commercial Export Invoice PDF stream',
  })
  @ApiResponse({
    status: 200,
    description: 'Binary application/pdf stream formatted to A4 print media',
  })
  async getSampleInvoicePdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateCommercialInvoicePdf({
      company: {
        name: 'RMM Agro Exports',
        code: 'RMM',
        address: 'Export House, Taraori - 132116, Karnal, Haryana, India',
        gstin: '06AABCR1234F1Z5',
        iec: '0505012345',
        phone: '+91 1748 245000',
        email: 'exports@rmmagro.com',
      },
      buyer: {
        name: 'Al-Barakah General Trading LLC',
        address: 'PO Box 8899, Deira, Dubai',
        country: 'United Arab Emirates',
        taxId: 'TRN-100234567890003',
      },
      documentNumber: 'RMM/EX/26-27/001',
      documentDate: '2026-11-08',
      financialYear: '26-27',
      buyerPoNumber: 'PO-UAE-9921',
      portOfLoading: 'Mundra Port, Gujarat, India',
      portOfDischarge: 'Jebel Ali Port, UAE',
      countryOfDestination: 'United Arab Emirates',
      incoterm: 'CIF',
      currency: 'USD',
      items: [
        {
          productName: '1121 Steam Basmati Rice',
          packingDescription: '30 KG Non-Woven Bags',
          quantityMt: 50.0,
          ratePerMt: 1000.0,
          amount: 50000.0,
          specifications: 'Average Grain Length 8.35mm, Max 1% Broken, Sortexed',
        },
      ],
      totalFobAmount: 50000.0,
      oceanFreightAmount: 1500.0,
      insuranceAmount: 100.0,
      totalInvoiceAmount: 51600.0,
      amountInWords:
        'US Dollars Fifty-One Thousand Six Hundred Only',
      bankDetails: {
        bankName: 'HDFC Bank Ltd, New Delhi',
        accountNumber: '50200012345678',
        swiftCode: 'HDFCINBB',
      },
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Commercial_Invoice_RMM_EX_26-27_001.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get('sample-packing-list')
  @ApiOperation({
    summary: 'Generate official A4 Export Packing List PDF stream',
  })
  @ApiResponse({ status: 200, description: 'Binary application/pdf stream' })
  async getSamplePackingListPdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generatePackingListPdf(
      {
        name: 'RMM Agro Exports',
        code: 'RMM',
      },
      'RMM/EX/26-27/001',
      '2026-11-08',
      {
        name: 'Al-Barakah General Trading LLC',
        address: 'Dubai, UAE',
        country: 'United Arab Emirates',
      },
      [
        {
          containerNumber: 'MSCU9876543',
          sealNumber: 'SEAL-001234',
          containerSize: '20FT',
          totalBags: 833,
          grossWeightKg: 25150.0,
          netWeightKg: 25000.0,
        },
        {
          containerNumber: 'TGHU1122334',
          sealNumber: 'SEAL-001235',
          containerSize: '20FT',
          totalBags: 833,
          grossWeightKg: 25150.0,
          netWeightKg: 25000.0,
        },
      ],
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Packing_List_RMM_EX_26-27_001.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
