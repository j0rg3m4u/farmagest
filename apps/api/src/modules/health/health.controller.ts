import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@farmagest/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }
}
