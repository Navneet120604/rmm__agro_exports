import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  const logger = new Logger('Bootstrap');

  // Security headers with Helmet (configured to allow Swagger UI)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `'unsafe-inline'`, 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Parse cookies
  app.use(
    cookieParser(process.env.COOKIE_SECRET || 'exportfly-dev-cookie-secret'),
  );

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Correlation-ID',
      'X-Company-ID',
    ],
  });

  // Centralized error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Strict runtime request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  // API Versioning Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'health', 'health/{*path}'],
  });

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ExportFly Web API')
    .setDescription(
      'RMM Agro Exports — Enterprise Export Management System REST API',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'X-Company-ID', in: 'header' },
      'company-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'ExportFly Web API Documentation',
  });

  // Port configuration (Default 4000 to avoid Next.js 3000 conflict)
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);

  logger.log(`ExportFly Backend running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  logger.log(`Health check: http://localhost:${port}/health`);
}

await bootstrap();
