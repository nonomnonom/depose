import { useState } from 'react';
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
import { Skeleton } from '@depose/ui/components/skeleton';
import { Check, CircleWarning, Plus, Reload, Trash } from '@coolicons/react';
import type { ModelGatewayControllerCreateBodyKind } from '~/generated/schemas';
import { formatRelativeDate } from '~/lib/format/date';
import {
  useAiProviders,
  useAiRoutes,
  useCreateProvider,
  useRemoveProvider,
  useTestProvider,
} from './ai-providers.queries';

const KINDS: { value: ModelGatewayControllerCreateBodyKind; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai-compatible', label: 'OpenAI-compatible gateway' },
];

export function AiProvidersPage() {
  const providers = useAiProviders();
  const routes = useAiRoutes();
  const test = useTestProvider();
  const remove = useRemoveProvider();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">Model gateway</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            Dep AI completion uses your firm's own provider keys. Pipeline routes for extraction
            and typed decisions are set by the operator and stay read-only here.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} />
          Add provider
        </Button>
      </header>

      <section className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <h3 className="text-sm font-medium">Firm completion providers</h3>
        </div>
        {providers.isPending ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : providers.isError ? (
          <p className="p-4 text-sm text-destructive">
            {providers.error instanceof Error ? providers.error.message : 'Could not load providers.'}
          </p>
        ) : providers.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <div>
              <p className="text-sm font-medium">No provider connected</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
                Dep AI cannot call a model until an admin adds a firm provider and enables at least
                one model. Evidence retrieval still works without it.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Connect a provider
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {providers.data.map((provider) => (
              <li key={provider.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{provider.label}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {provider.kind}
                    </Badge>
                    <Badge
                      variant={provider.status === 'active' ? 'secondary' : 'outline'}
                      className="text-[10px] capitalize"
                    >
                      {provider.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Key ····{provider.apiKeyLast4} · {provider.models.length} model
                    {provider.models.length === 1 ? '' : 's'}
                    {provider.baseUrl ? ` · ${provider.baseUrl}` : ''}
                  </p>
                  {provider.lastError ? (
                    <p className="mt-0.5 text-xs text-destructive">{provider.lastError}</p>
                  ) : null}
                  {provider.lastTestedAt ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Tested {formatRelativeDate(provider.lastTestedAt)}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={test.isPending}
                  onClick={() =>
                    test.mutate(provider.id, {
                      onError: (err) =>
                        setError(err instanceof Error ? err.message : 'Test failed.'),
                    })
                  }
                >
                  <Reload size={13} />
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(provider.id)}
                >
                  <Trash size={15} />
                  <span className="sr-only">Remove {provider.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {test.data ? (
          <p
            className={`border-t border-border px-4 py-2 text-xs ${
              test.data.ok ? 'text-muted-foreground' : 'text-destructive'
            }`}
          >
            {test.data.ok
              ? `Connected. ${test.data.models.length} models available.`
              : test.data.error ?? 'The provider did not answer.'}
          </p>
        ) : null}
        {error ? <p className="border-t border-border px-4 py-2 text-xs text-destructive">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <h3 className="text-sm font-medium">Instance pipeline routes</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configured by the operator with environment variables. They cannot be changed from the
            firm workspace.
          </p>
        </div>
        {routes.isError ? (
          <p className="p-4 text-sm text-destructive">Route status is not available.</p>
        ) : (
          <ul className="divide-y divide-border">
            {routes.data
              ? [routes.data.decision, routes.data.extraction].map((route) => (
                  <li key={route.routeKey} className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      className={`mt-1 flex size-4 items-center justify-center rounded-full ${
                        route.available
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {route.available ? <Check size={11} /> : <CircleWarning size={11} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs">{route.routeKey}</p>
                      <p className="mt-0.5 text-sm">
                        {route.provider} · {route.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {route.available
                          ? route.capability === 'decision'
                            ? `Typed System One · threshold ${route.threshold ?? 0.8}`
                            : `Fact extraction${route.fallbackEnabled ? ' · completion fallback on' : ''}`
                          : 'Not configured. The pipeline reports an unavailable route rather than inventing output.'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {route.capability}
                    </Badge>
                  </li>
                ))
              : null}
          </ul>
        )}
      </section>

      <AddProviderDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function AddProviderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateProvider();
  const [kind, setKind] = useState<ModelGatewayControllerCreateBodyKind>('openai');
  const [label, setLabel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState('');
  const [fallback, setFallback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    create.mutate(
      {
        kind,
        label: label.trim(),
        ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        models: models
          .split(',')
          .map((model) => model.trim())
          .filter(Boolean),
        ...(fallback.trim() ? { fallbackModelId: fallback.trim() } : {}),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setLabel('');
          setBaseUrl('');
          setApiKey('');
          setModels('');
          setFallback('');
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Could not add the provider.'),
      },
    );
  };

  const invalid =
    !label.trim() ||
    !models.trim() ||
    (kind === 'openai-compatible' && !baseUrl.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a provider</DialogTitle>
          <DialogDescription>
            The key is encrypted with the instance secret and never returned to the browser. Only
            models you list can be selected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="provider-kind">Provider</Label>
              <select
                id="provider-kind"
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as ModelGatewayControllerCreateBodyKind)
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {KINDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provider-label">Display name</Label>
              <Input
                id="provider-label"
                placeholder="OpenAI firma"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider-base">Base URL</Label>
            <Input
              id="provider-base"
              placeholder={
                kind === 'openai-compatible'
                  ? 'https://gateway.internal/v1'
                  : 'Optional; uses the provider default'
              }
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider-key">API key</Label>
            <Input
              id="provider-key"
              type="password"
              autoComplete="off"
              placeholder="sk-…"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider-models">Enabled models</Label>
            <Input
              id="provider-models"
              placeholder="gpt-4.1-mini, gpt-4.1"
              value={models}
              onChange={(event) => setModels(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma separated. These become the firm's completion catalogue.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider-fallback">Fallback model</Label>
            <Input
              id="provider-fallback"
              placeholder="Optional, same connection"
              value={fallback}
              onChange={(event) => setFallback(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={invalid || create.isPending}>
            {create.isPending ? 'Saving…' : 'Connect provider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
