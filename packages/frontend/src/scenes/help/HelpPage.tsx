import { Link } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { ArrowRight } from '@coolicons/react';
import { PageHeader } from '~/layout/PageHeader';

const CONCEPTS = [
  {
    term: 'Matter',
    detail:
      'One dispute or investigation. Everything — documents, facts, subsets, outputs — belongs to a matter and is authorised against it.',
  },
  {
    term: 'Fact',
    detail:
      'A single statement or event, kept with its date, type, and a verbatim citation to the page it came from. Facts can be proposed by extraction or added by a person.',
  },
  {
    term: 'Issue',
    detail:
      'The legal question that makes a fact relevant. One fact can sit under several issues; relevance is a judgement, not a property of the text.',
  },
  {
    term: 'Contradiction',
    detail:
      'A pair of statements the record cannot reconcile. Detection proposes pairs; a lawyer confirms or dismisses them. It is not the same thing as a disputed fact.',
  },
  {
    term: 'Subset',
    detail:
      'A scoped workspace inside a matter. Dep AI only reads documents inside the subset, and work product stays separate from the wider matter.',
  },
  {
    term: 'Output',
    detail:
      'A versioned draft, chronology, or report derived from facts. Each version stores the citations it was built from.',
  },
];

const GUARDRAILS = [
  {
    title: 'Review the source, not the summary',
    detail:
      'Every fact links to a page and quote. If the quote does not support the fact, correct the fact — do not rely on the model.',
  },
  {
    title: 'Conflicts stay visible',
    detail:
      'Depose does not resolve contradictions into a single narrative. It shows both sides with their evidence so the decision stays with you.',
  },
  {
    title: 'AI output is unreviewed work product',
    detail:
      'Dep AI cites what it used and says when the record is silent. Treat every answer and draft as needing lawyer review.',
  },
  {
    title: 'Live checking has legal limits',
    detail:
      'In England and Wales, hearings are recorded by the court under CPR 39.9 and only authorised providers may supply live transcripts. Use Live check only with an authorised feed and the court’s permission.',
  },
];

export function HelpPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Help"
        description="How the workspace is meant to be used, and what it deliberately refuses to do."
        actions={
          <Button variant="outline" render={<Link to="/matters" />}>
            Matters <ArrowRight size={14} />
          </Button>
        }
      />

      <section className="rounded-xl border border-primary/25 bg-primary/5 p-5">
        <h2 className="font-heading text-lg font-semibold">Start with the evidence</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
          Upload the documents that define the matter. Depose extracts page text, proposes atomic
          facts, and keeps every fact attached to the page that supports it. Confirm the facts you
          would rely on; reject what the documents do not support.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['1', 'Upload', 'PDF, DOCX, text, email, or images. Upload is separate from extraction.'],
            ['2', 'Review', 'Confirm or reject proposed facts. Correct dates and wording.'],
            ['3', 'Use the record', 'Chronology, contradictions, entities, and cited answers.'],
          ].map(([step, title, detail]) => (
            <div key={step} className="rounded-lg border border-border bg-card p-3.5">
              <span className="text-xs font-semibold text-primary">{step}</span>
              <p className="mt-1.5 text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Concepts
        </h2>
        <dl className="overflow-hidden rounded-xl border border-border bg-card">
          {CONCEPTS.map((concept) => (
            <div
              key={concept.term}
              className="grid gap-1 border-b border-border px-4 py-3.5 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
            >
              <dt className="text-sm font-medium">{concept.term}</dt>
              <dd className="text-sm text-muted-foreground text-pretty">{concept.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Guardrails
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUARDRAILS.map((rule) => (
            <div key={rule.title} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">{rule.title}</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">{rule.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Self-hosting
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
          Depose is deployed by your firm. Documents stay in the storage and database you run.
          Outbound model calls are made only to the provider configured for your instance; you can
          point the runtime at a local model server to keep inference inside your network.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Files stored on your volume</Badge>
          <Badge variant="outline">Firm-scoped tenancy</Badge>
          <Badge variant="outline">Audit log for writes</Badge>
          <Badge variant="outline">Bring your own model</Badge>
        </div>
      </section>
    </div>
  );
}
