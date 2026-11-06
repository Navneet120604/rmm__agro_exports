import { Global, Module } from '@nestjs/common';
import { DocumentNumberingController } from './document-numbering.controller.js';
import { DocumentNumberingService } from './document-numbering.service.js';

@Global()
@Module({
  controllers: [DocumentNumberingController],
  providers: [DocumentNumberingService],
  exports: [DocumentNumberingService],
})
export class DocumentNumberingModule {}
