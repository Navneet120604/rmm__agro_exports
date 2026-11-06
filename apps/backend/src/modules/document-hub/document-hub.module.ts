import { Module } from '@nestjs/common';
import { DocumentHubController } from './document-hub.controller.js';
import { DocumentHubService } from './document-hub.service.js';

@Module({
  controllers: [DocumentHubController],
  providers: [DocumentHubService],
  exports: [DocumentHubService],
})
export class DocumentHubModule {}
