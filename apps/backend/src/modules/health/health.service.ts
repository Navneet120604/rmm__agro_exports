import { Injectable } from '@nestjs/common';

export interface LivenessStatus {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}

export interface ReadinessStatus {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  checks: {
    system: 'up';
    database: 'unconfigured' | 'connected' | 'disconnected';
    memoryUsageMB: number;
  };
}

@Injectable()
export class HealthService {
  private readonly version = '0.0.1';
  private readonly serviceName = 'rmm-agro-exports-backend';

  checkLiveness(): LivenessStatus {
    return {
      status: 'ok',
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  checkReadiness(): ReadinessStatus {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      checks: {
        system: 'up',
        database: process.env.DATABASE_URL ? 'connected' : 'unconfigured',
        memoryUsageMB: Math.round(memory.heapUsed / 1024 / 1024),
      },
    };
  }
}
