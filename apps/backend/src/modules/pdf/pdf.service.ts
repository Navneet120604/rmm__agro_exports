import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type {
  CommercialInvoicePdfData,
  CompanyHeaderData,
  CustomerPartyData,
} from './pdf.types.js';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generates a print-faithful A4 Commercial Export Invoice PDF
   */
  async generateCommercialInvoicePdf(
    data: CommercialInvoicePdfData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 in / 12.7 mm
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // 1. HEADER (Top Letterhead)
        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .text(data.company.name.toUpperCase(), { align: 'center' });

        doc
          .font('Helvetica')
          .fontSize(9)
          .text(
            `${data.company.address || 'Export House, Taraori - 132116, Karnal, Haryana, India'}`,
            { align: 'center' },
          )
          .text(
            `GSTIN: ${data.company.gstin || '06AABCR1234F1Z5'} | IEC: ${data.company.iec || '0505012345'} | Phone: ${data.company.phone || '+91 1748 245000'}`,
            { align: 'center' },
          );

        doc.moveDown(0.5);
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('COMMERCIAL EXPORT INVOICE', { align: 'center', underline: true });

        doc.moveDown(0.5);

        // Draw horizontal divider
        const startY = doc.y;
        doc.moveTo(36, startY).lineTo(559, startY).stroke('#222222');
        doc.moveDown(0.4);

        // 2. DOCUMENT & PARTY METADATA (2-column box layout)
        const topGridY = doc.y;

        // Left column: Shipper & Consignee
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text('EXPORTER / SHIPPER:', 36, topGridY)
          .font('Helvetica')
          .text(data.company.name, 36)
          .text(data.company.address || 'Karnal, Haryana, India', 36);

        doc.moveDown(0.5);
        doc
          .font('Helvetica-Bold')
          .text('CONSIGNEE (For Delivery):', 36)
          .font('Helvetica')
          .text(data.buyer.name, 36)
          .text(data.buyer.address, 36)
          .text(data.buyer.country, 36);

        // Right column: Invoice details
        const rightColX = 320;
        doc
          .font('Helvetica-Bold')
          .text('Invoice No: ', rightColX, topGridY, { continued: true })
          .font('Helvetica')
          .text(data.documentNumber);

        doc
          .font('Helvetica-Bold')
          .text('Invoice Date: ', rightColX, undefined, { continued: true })
          .font('Helvetica')
          .text(data.documentDate);

        doc
          .font('Helvetica-Bold')
          .text('Buyer PO Ref: ', rightColX, undefined, { continued: true })
          .font('Helvetica')
          .text(data.buyerPoNumber || 'N/A');

        doc
          .font('Helvetica-Bold')
          .text('Port of Loading: ', rightColX, undefined, { continued: true })
          .font('Helvetica')
          .text(data.portOfLoading);

        doc
          .font('Helvetica-Bold')
          .text('Port of Discharge: ', rightColX, undefined, { continued: true })
          .font('Helvetica')
          .text(data.portOfDischarge);

        doc
          .font('Helvetica-Bold')
          .text('Country of Destination: ', rightColX, undefined, { continued: true })
          .font('Helvetica')
          .text(data.countryOfDestination);

        doc
          .font('Helvetica-Bold')
          .text('Incoterm Terms: ', rightColX, undefined, { continued: true })
          .font('Helvetica')
          .text(`${data.incoterm} (${data.currency})`);

        doc.moveDown(1);
        const tableStartY = Math.max(doc.y, 230);
        doc.moveTo(36, tableStartY).lineTo(559, tableStartY).stroke('#222222');

        // 3. ITEMS TABLE
        let currentY = tableStartY + 6;
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('S.No', 40, currentY);
        doc.text('Description of Export Goods', 70, currentY);
        doc.text('Packing Type', 270, currentY);
        doc.text('Quantity (MT)', 370, currentY, { width: 60, align: 'right' });
        doc.text(`Rate / MT (${data.currency})`, 440, currentY, {
          width: 50,
          align: 'right',
        });
        doc.text(`Amount (${data.currency})`, 500, currentY, {
          width: 55,
          align: 'right',
        });

        currentY += 14;
        doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#888888');
        currentY += 6;

        let totalQty = 0;
        doc.font('Helvetica').fontSize(8);
        data.items.forEach((item, idx) => {
          totalQty += item.quantityMt;
          doc.text(String(idx + 1), 40, currentY);
          doc.text(item.productName, 70, currentY, { width: 190 });
          doc.text(item.packingDescription, 270, currentY, { width: 95 });
          doc.text(item.quantityMt.toFixed(3), 370, currentY, {
            width: 60,
            align: 'right',
          });
          doc.text(item.ratePerMt.toFixed(2), 440, currentY, {
            width: 50,
            align: 'right',
          });
          doc.text(item.amount.toFixed(2), 500, currentY, {
            width: 55,
            align: 'right',
          });

          if (item.specifications) {
            currentY += 12;
            doc
              .font('Helvetica-Oblique')
              .fontSize(7)
              .text(`Spec: ${item.specifications}`, 70, currentY, { width: 250 })
              .font('Helvetica')
              .fontSize(8);
          }
          currentY += 16;
        });

        doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#222222');
        currentY += 6;

        // Subtotals & Shipping breakdown
        doc.font('Helvetica-Bold');
        doc.text('Total FOB Quantity (MT):', 70, currentY);
        doc.text(totalQty.toFixed(3), 370, currentY, {
          width: 60,
          align: 'right',
        });
        doc.text('Total FOB Value:', 400, currentY);
        doc.text(data.totalFobAmount.toFixed(2), 500, currentY, {
          width: 55,
          align: 'right',
        });

        if (data.incoterm === 'CFR' || data.incoterm === 'CIF') {
          currentY += 12;
          doc.text('Ocean Freight Charges:', 400, currentY);
          doc.text(data.oceanFreightAmount.toFixed(2), 500, currentY, {
            width: 55,
            align: 'right',
          });
        }

        if (data.incoterm === 'CIF') {
          currentY += 12;
          doc.text('Marine Insurance:', 400, currentY);
          doc.text(data.insuranceAmount.toFixed(2), 500, currentY, {
            width: 55,
            align: 'right',
          });
        }

        currentY += 14;
        doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#222222');
        currentY += 6;

        // Grand Total
        doc.fontSize(9);
        doc.text(
          `GRAND TOTAL (${data.incoterm} ${data.currency}):`,
          350,
          currentY,
        );
        doc.text(data.totalInvoiceAmount.toFixed(2), 500, currentY, {
          width: 55,
          align: 'right',
        });

        // 4. AMOUNT IN WORDS
        currentY += 20;
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text('AMOUNT IN WORDS: ', 36, currentY, { continued: true })
          .font('Helvetica')
          .text(data.amountInWords);

        // 5. BANKING DETAILS
        currentY += 20;
        doc.font('Helvetica-Bold').fontSize(8).text('BANK DETAILS FOR REMITTANCE:', 36, currentY);
        currentY += 10;
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .text(
            `Bank: ${data.bankDetails?.bankName || 'HDFC Bank Ltd, New Delhi'} | A/C No: ${data.bankDetails?.accountNumber || '50200012345678'} | SWIFT: ${data.bankDetails?.swiftCode || 'HDFCINBB'}`,
            36,
            currentY,
          );

        // 6. DECLARATION & SIGNATURE
        currentY += 25;
        doc
          .font('Helvetica')
          .fontSize(7)
          .text(
            'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
            36,
            currentY,
            { width: 300 },
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(`For ${data.company.name.toUpperCase()}`, 380, currentY, {
            align: 'center',
            width: 170,
          });

        currentY += 35;
        doc
          .font('Helvetica')
          .fontSize(7)
          .text('Authorised Signatory', 380, currentY, {
            align: 'center',
            width: 170,
          });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a print-faithful A4 Packing List PDF
   */
  async generatePackingListPdf(
    company: CompanyHeaderData,
    invoiceNumber: string,
    invoiceDate: string,
    buyer: CustomerPartyData,
    containersList: {
      containerNumber: string;
      sealNumber: string;
      containerSize: string;
      totalBags: number;
      grossWeightKg: number;
      netWeightKg: number;
    }[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // Header
        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .text(company.name.toUpperCase(), { align: 'center' });

        doc.moveDown(0.5);
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('EXPORT PACKING LIST', { align: 'center', underline: true });

        doc.moveDown(0.5);
        let currentY = doc.y;
        doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#222222');
        currentY += 8;

        // Metadata
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(`Invoice No: ${invoiceNumber}  |  Date: ${invoiceDate}`, 36, currentY);
        doc.text(`Consignee / Buyer: ${buyer.name}, ${buyer.country}`, 300, currentY);

        currentY += 20;
        doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#222222');
        currentY += 6;

        // Container Table Header
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('Container No', 40, currentY);
        doc.text('Line Seal No', 160, currentY);
        doc.text('Size', 270, currentY);
        doc.text('Total Bags', 330, currentY, { width: 60, align: 'right' });
        doc.text('Net Wt (KG)', 410, currentY, { width: 65, align: 'right' });
        doc.text('Gross Wt (KG)', 490, currentY, { width: 65, align: 'right' });

        currentY += 14;
        doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#888888');
        currentY += 6;

        let totalBagsSum = 0;
        let totalNetKgSum = 0;
        let totalGrossKgSum = 0;

        doc.font('Helvetica').fontSize(8);
        for (const c of containersList) {
          totalBagsSum += c.totalBags;
          totalNetKgSum += c.netWeightKg;
          totalGrossKgSum += c.grossWeightKg;

          doc.text(c.containerNumber, 40, currentY);
          doc.text(c.sealNumber, 160, currentY);
          doc.text(c.containerSize, 270, currentY);
          doc.text(c.totalBags.toLocaleString(), 330, currentY, {
            width: 60,
            align: 'right',
          });
          doc.text(c.netWeightKg.toFixed(2), 410, currentY, {
            width: 65,
            align: 'right',
          });
          doc.text(c.grossWeightKg.toFixed(2), 490, currentY, {
            width: 65,
            align: 'right',
          });

          currentY += 14;
        }

        currentY += 4;
        doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#222222');
        currentY += 6;

        // Totals
        doc.font('Helvetica-Bold');
        doc.text('TOTAL SUMMARY:', 40, currentY);
        doc.text(totalBagsSum.toLocaleString(), 330, currentY, {
          width: 60,
          align: 'right',
        });
        doc.text(totalNetKgSum.toFixed(2), 410, currentY, {
          width: 65,
          align: 'right',
        });
        doc.text(totalGrossKgSum.toFixed(2), 490, currentY, {
          width: 65,
          align: 'right',
        });

        // Signatory
        currentY += 50;
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(`For ${company.name.toUpperCase()}`, 380, currentY, {
            align: 'center',
            width: 170,
          });

        currentY += 35;
        doc
          .font('Helvetica')
          .fontSize(7)
          .text('Authorised Signatory', 380, currentY, {
            align: 'center',
            width: 170,
          });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
