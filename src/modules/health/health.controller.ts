import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '@app/src/common/decorators/public.decorator';

import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get()
  @SkipThrottle()
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
