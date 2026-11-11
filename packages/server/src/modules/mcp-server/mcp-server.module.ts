import { Module } from '@nestjs/common';
import { McpModule } from '@nestjs/mcp';
import { UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { DeposeMcpTools } from './mcp-tools.service.js';
import { McpTokenGuard } from './mcp-token.guard.js';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'depose',
      version: '0.1.0',
      title: 'Depose',
      description: 'Read-only access to confirmed facts and documents in a Depose matter.',
      instructions:
        'Search confirmed facts before answering. Cite the returned document and page. Do not treat proposals or rejected facts as established.',
      path: 'mcp',
      decorators: [Public(), UseGuards(McpTokenGuard)],
    }),
  ],
  providers: [DeposeMcpTools, McpTokenGuard],
})
export class DeposeMcpServerModule {}
