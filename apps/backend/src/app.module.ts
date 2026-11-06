import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ActivityLogModule } from './modules/activity-log/activity-log.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DocumentNumberingModule } from './modules/document-numbering/document-numbering.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { DocumentHubModule } from './modules/document-hub/document-hub.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { PdfModule } from './modules/pdf/pdf.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const observeAppKey = process.env.OBSERVE_APP_KEY;
const observeAppSecret = process.env.OBSERVE_APP_SECRET;
const isObserveConfigured = Boolean(
  observeAppKey &&
    observeAppSecret &&
    observeAppKey !== 'YOUR_APP_KEY' &&
    observeAppSecret !== 'YOUR_APP_SECRET',
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ActivityLogModule,
    CompaniesModule,
    AuthModule,
    DocumentNumberingModule,
    MasterDataModule,
    SalesModule,
    DocumentHubModule,
    ReportsModule,
    PdfModule,
    ObserveModule.forRoot({
      appKey: isObserveConfigured ? observeAppKey : undefined,
      appSecret: isObserveConfigured ? observeAppSecret : undefined,
      serviceId: 'backend',
      enabled: isObserveConfigured,
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
