import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { McpRegistryController } from './mcp-registry.controller.js';
import { McpRegistryService } from './mcp-registry.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [McpRegistryController],
  providers: [McpRegistryService],
})
export class McpRegistryModule {}
