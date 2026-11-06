import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private client: postgres.Sql | null = null;
  private drizzleDb: PostgresJsDatabase<typeof schema> | null = null;

  onModuleInit() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      this.logger.warn(
        'DATABASE_URL not configured. Database operations will be mocked or unconfigured.',
      );
      return;
    }

    try {
      this.client = postgres(dbUrl, {
        max: Number(process.env.DB_POOL_MAX) || 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });

      this.drizzleDb = drizzle(this.client, { schema });
      this.logger.log('PostgreSQL connection pool initialized.');
    } catch (err) {
      this.logger.error(
        `Failed to initialize database connection: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
    }
  }

  get db(): PostgresJsDatabase<typeof schema> {
    if (!this.drizzleDb) {
      throw new Error(
        'Database connection has not been initialized. Please configure DATABASE_URL.',
      );
    }
    return this.drizzleDb;
  }

  get isConnected(): boolean {
    return this.drizzleDb !== null;
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Closing PostgreSQL connection pool...');
      await this.client.end({ timeout: 5 });
      this.client = null;
      this.drizzleDb = null;
    }
  }
}
