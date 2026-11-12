import { Badge } from '@depose/ui/components/badge';
import { Check, CircleWarning } from '@coolicons/react';
import { PageHeader } from '~/features/layout/PageHeader';
import { useClientConfig } from '~/features/lib/config/client-config';

export function AiProvidersPage() {
  const { features } = useClientConfig();
  const enabled = features.ai.enabled;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="AI"
        description="Depose calls the model configured for this instance. Firm-level API keys are not stored in the workspace."
      />

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Model runtime</h2>
          <Badge variant={enabled ? 'secondary' : 'outline'}>
            {enabled ? 'Configured' : 'Not configured'}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          {enabled
            ? 'A model provider is configured for this deployment. Dep AI answers, extraction, and contradiction checks use it.'
            : 'No model provider is configured. Evidence retrieval and the fact bank still work; answers and extraction stay off until the operator sets the runtime.'}
        </p>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-primary" />
            <span className="text-muted-foreground">
              The provider, model, and base URL are set by the operator in the deployment
              environment, not per firm.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-primary" />
            <span className="text-muted-foreground">
              Point the runtime at a local or OpenAI-compatible model server to keep inference
              inside your network.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-primary" />
            <span className="text-muted-foreground">
              Pipeline routes for extraction and typed decisions are fixed by the operator, so a
              firm cannot silently change how facts are produced.
            </span>
          </li>
        </ul>
      </section>

      <section className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        <CircleWarning size={14} className="mt-0.5 shrink-0" />
        <p className="text-pretty">
          Model answers are not evidence. Every answer cites the facts it used and says when the
          record is silent; a lawyer still reviews the source before relying on it.
        </p>
      </section>
    </div>
  );
}
