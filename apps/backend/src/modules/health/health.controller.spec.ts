import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should return liveness status', () => {
    const result = controller.getLiveness();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('rmm-agro-exports-backend');
    expect(typeof result.uptimeSeconds).toBe('number');
  });

  it('should return readiness status', () => {
    const result = controller.getReadiness();
    expect(result.status).toBe('ok');
    expect(result.checks.system).toBe('up');
  });
});
