import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import { assertSafeOutboundUrl } from '../../common/outbound-url.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  mcpConnections,
  mcpServers,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateMcpServerInput } from './mcp.dto.js';

interface JsonRpcTool {
  name?: unknown;
  description?: unknown;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function parseBody(text: string, contentType: string | null): unknown {
  if (contentType?.includes('text/event-stream')) {
    const data = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean)
      .at(-1);
    return data ? JSON.parse(data) : null;
  }
  return text ? JSON.parse(text) : null;
}

@Injectable()
export class McpService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor) {
    this.policy.assertFirm(actor, 'firm.mcp.manage');
    const rows = await this.db
      .select({
        id: mcpServers.id,
        serverKey: mcpServers.serverKey,
        name: mcpServers.name,
        url: mcpServers.url,
        transport: mcpServers.transport,
        createdAt: mcpServers.createdAt,
        status: mcpConnections.status,
      })
      .from(mcpServers)
      .leftJoin(
        mcpConnections,
        and(
          eq(mcpConnections.serverId, mcpServers.id),
          eq(mcpConnections.firmId, actor.firmId),
        ),
      )
      .where(eq(mcpServers.firmId, actor.firmId))
      .orderBy(asc(mcpServers.createdAt));
    return rows.map((row) => ({ ...row, status: row.status ?? 'disconnected' }));
  }

  async create(actor: FirmActor, input: CreateMcpServerInput) {
    this.policy.assertFirm(actor, 'firm.mcp.manage');
    if (input.url) await assertSafeOutboundUrl(input.url);
    const serverKey = slugify(input.name);
    if (!serverKey) throw DomainError.validation('Give the server a usable name');

    const [existing] = await this.db
      .select({ id: mcpServers.id })
      .from(mcpServers)
      .where(
        and(eq(mcpServers.firmId, actor.firmId), eq(mcpServers.serverKey, serverKey)),
      )
      .limit(1);
    if (existing) throw DomainError.conflict('CONFLICT', 'A server with that name already exists');

    const [created] = await this.db
      .insert(mcpServers)
      .values({
        firmId: actor.firmId,
        serverKey,
        name: input.name,
        transport: input.transport,
        url: input.url,
      })
      .returning();

    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.mcp_server.created',
      resourceType: 'mcp_server',
      resourceId: created.id,
      actor,
      metadata: { serverKey, transport: input.transport },
    });

    return { ...created, status: 'disconnected' };
  }

  async remove(actor: FirmActor, serverId: string) {
    this.policy.assertFirm(actor, 'firm.mcp.manage');
    const [server] = await this.db
      .select({ id: mcpServers.id, serverKey: mcpServers.serverKey })
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.firmId, actor.firmId)))
      .limit(1);
    if (!server) throw DomainError.notFound('MCP server not found');
    await this.db.delete(mcpServers).where(eq(mcpServers.id, server.id));
    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.mcp_server.removed',
      resourceType: 'mcp_server',
      resourceId: server.id,
      actor,
      metadata: { serverKey: server.serverKey },
    });
    return { deleted: true };
  }

  async test(actor: FirmActor, serverId: string) {
    this.policy.assertFirm(actor, 'firm.mcp.manage');
    const [server] = await this.db
      .select()
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.firmId, actor.firmId)))
      .limit(1);
    if (!server?.url) throw DomainError.notFound('MCP server not found');
    await assertSafeOutboundUrl(server.url);

    let tools: { name: string; description: string | null }[] = [];
    let error: string | null = null;
    const started = Date.now();

    try {
      const sessionId = await this.initialize(server.url);
      tools = await this.listTools(server.url, sessionId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Connection failed';
    }

    await this.db
      .insert(mcpConnections)
      .values({
        firmId: actor.firmId,
        serverId: server.id,
        authType: 'none',
        status: error ? 'error' : 'connected',
      })
      .onConflictDoUpdate({
        target: [mcpConnections.firmId, mcpConnections.serverId],
        set: {
          status: error ? 'error' : 'connected',
          updatedAt: new Date(),
        },
      });

    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.mcp_server.tested',
      resourceType: 'mcp_server',
      resourceId: server.id,
      actor,
      metadata: { ok: !error, tools: tools.length, latencyMs: Date.now() - started },
    });

    return { ok: !error, tools, error };
  }

  private async initialize(url: string): Promise<string | null> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'Depose', version: '0.1.0' },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`MCP initialize failed with ${response.status}`);
    return response.headers.get('mcp-session-id');
  }

  private async listTools(url: string, sessionId: string | null) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`MCP tools/list failed with ${response.status}`);

    const payload = parseBody(await response.text(), response.headers.get('content-type')) as {
      result?: { tools?: JsonRpcTool[] };
      error?: { message?: string };
    } | null;
    if (payload?.error) throw new Error(payload.error.message ?? 'MCP returned an error');

    return (payload?.result?.tools ?? [])
      .filter((tool) => typeof tool.name === 'string')
      .map((tool) => ({
        name: tool.name as string,
        description: typeof tool.description === 'string' ? tool.description : null,
      }));
  }
}
