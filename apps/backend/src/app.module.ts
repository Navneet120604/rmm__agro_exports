import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { DocumentNumberingModule } from './modules/document-numbering/document-numbering.module.js';
import { HealthModule } from './modules/health/health.module.js';

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
    DocumentNumberingModule,
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
