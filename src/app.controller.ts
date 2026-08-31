import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@/shared/decorators/public.decorator';

interface AppInfo {
  name: string;
  version: string;
  environment: string;
}

/**
 * Endpoint gốc: trả thông tin service thay cho chuỗi "Hello World!" của
 * template. Health check thực sự nằm ở `GET /api/health` (module health).
 */
@ApiTags('App')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Thông tin service' })
  getInfo(): AppInfo {
    return {
      name: process.env.npm_package_name ?? 'server',
      version: process.env.npm_package_version ?? '0.0.0',
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
