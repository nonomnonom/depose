import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { McpController } from './mcp.controller.js';
import { McpService } from './mcp.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
