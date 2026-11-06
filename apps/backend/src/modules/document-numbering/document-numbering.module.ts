import { Module } from '@nestjs/common';
import { DocumentNumberingController } from './document-numbering.controller.js';
import { DocumentNumberingService } from './document-numbering.service.js';

@Module({
  controllers: [DocumentNumberingController],
  providers: [DocumentNumberingService],
  exports: [DocumentNumberingService],
})
export class DocumentNumberingModule {}
