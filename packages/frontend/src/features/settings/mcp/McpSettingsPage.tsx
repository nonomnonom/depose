import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@depose/ui/components/alert-dialog';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@depose/ui/components/dialog';
import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import { NativeSelect, NativeSelectOption } from '@depose/ui/components/native-select';
import { PageLoading } from '~/features/lib/components/PageLoading';
import type { McpServerDto, McpToolDto } from '~/generated/schemas';
import { PageHeader } from '~/features/layout/PageHeader';
import { useSession } from '~/features/lib/auth/session';
import { useClientConfig } from '~/features/lib/config/client-config';
import {
  useCreateMcpServer,
  useMcpServers,
  useRemoveMcpServer,
  useTestMcpServer,
} from './mcp.queries';

export function McpSettingsPage() {
  const { can } = useSession();
  const { features } = useClientConfig();
  const servers = useMcpServers();
  const canManage = can('firm.mcp.manage');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="MCP servers"
        description="Connect external tool servers to the firm. Admins control which servers are trusted."
        actions={
          canManage ? (
            <Button onClick={() => setDialogOpen(true)}>Add server</Button>
          ) : undefined
        }
      />

      {servers.isPending ? (
        <PageLoading />
      ) : servers.isError ? (
        <p className="text-sm text-muted-foreground">
          MCP servers could not be loaded.{' '}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => void servers.refetch()}
          >
            Retry
          </button>
        </p>
      ) : servers.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-14 text-center">
          <p className="text-sm font-medium">No MCP servers connected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an HTTP MCP endpoint to let agents call its tools. Credentials and tool allowlists
            come next.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {servers.data.map((server) => (
            <McpServerRow key={server.id} server={server} canManage={canManage} />
          ))}
        </div>
      )}

      <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">Depose MCP endpoint</h2>
            <p className="text-sm text-muted-foreground">
              External assistants can search confirmed facts and list documents, read-only.
            </p>
          </div>
          <Badge variant={features.mcpServer.enabled ? 'secondary' : 'outline'}>
            {features.mcpServer.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <code className="mt-1 block rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs">
          {window.location.origin}/api/mcp
        </code>
        <p className="text-xs text-muted-foreground">
          {features.mcpServer.enabled
            ? 'Clients authenticate with the instance bearer token configured by the admin.'
            : 'Set MCP_SERVER_TOKEN and MCP_SERVER_FIRM_ID on the server to enable this endpoint.'}
        </p>
      </section>

      <AddServerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function McpServerRow({ server, canManage }: { server: McpServerDto; canManage: boolean }) {
  const test = useTestMcpServer();
  const remove = useRemoveMcpServer();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tools, setTools] = useState<McpToolDto[] | null>(null);

  const statusVariant =
    server.status === 'connected'
      ? 'secondary'
      : server.status === 'error'
        ? 'destructive'
        : 'outline';

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{server.name}</p>
            <Badge variant={statusVariant} className="text-xs capitalize">
              {server.status}
            </Badge>
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{server.url}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {server.transport.toUpperCase()} · key {server.serverKey}
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={test.isPending}
              onClick={() =>
                test.mutate(server.id, {
                  onSuccess: (result) => setTools(result.tools),
                })
              }
            >
              {test.isPending ? 'Testing...' : 'Test connection'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      {test.data ? (
        <div className="border-t border-border px-4 py-2.5 text-xs">
          {test.data.ok ? (
            <p className="text-muted-foreground">
              Connected. {test.data.tools.length}{' '}
              {test.data.tools.length === 1 ? 'tool' : 'tools'} exposed.
            </p>
          ) : (
            <p className="text-destructive">Connection failed: {test.data.error}</p>
          )}
          {tools && tools.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tools.map((tool) => (
                <Badge key={tool.name} variant="outline" className="font-mono text-[10px]">
                  {tool.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {test.isError ? (
        <p className="border-t border-border px-4 py-2 text-xs text-destructive">
          {test.error instanceof Error ? test.error.message : 'Connection failed.'}
        </p>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {server.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Agents can no longer call this server. Tool call history stays for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(server.id, { onSuccess: () => setConfirmOpen(false) })
              }
            >
              {remove.isPending ? 'Removing...' : 'Remove server'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddServerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateMcpServer();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [transport, setTransport] = useState<'http' | 'sse'>('http');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) create.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add MCP server</DialogTitle>
          <DialogDescription>
            Point Depose at an HTTP MCP endpoint. The connection is tested explicitly, not on
            save.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name">Name</Label>
            <Input
              id="mcp-name"
              placeholder="Court records"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-url">Server URL</Label>
            <Input
              id="mcp-url"
              placeholder="https://mcp.example.com/mcp"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-transport">Transport</Label>
            <NativeSelect
              id="mcp-transport"
              className="w-full"
              value={transport}
              onChange={(event) => setTransport(event.target.value as 'http' | 'sse')}
            >
              <NativeSelectOption value="http">HTTP (streamable)</NativeSelectOption>
              <NativeSelectOption value="sse">SSE</NativeSelectOption>
            </NativeSelect>
          </div>
          {create.error ? (
            <p className="text-sm text-destructive">
              {create.error instanceof Error ? create.error.message : 'Could not add server.'}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !url.trim() || create.isPending}
            onClick={() =>
              create.mutate(
                { name: name.trim(), url: url.trim(), transport },
                {
                  onSuccess: () => {
                    setName('');
                    setUrl('');
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            {create.isPending ? 'Adding...' : 'Add server'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
