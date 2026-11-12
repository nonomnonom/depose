import { useState } from 'react';
import {
  Agent,
  AgentContent,
  AgentHeader,
  AgentInstructions,
  AgentOutput,
  AgentTool,
  AgentTools,
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
  Checkpoint,
  CheckpointTrigger,
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationTitle,
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationItem,
  FileTree,
  FileTreeFile,
  FileTreeFolder,
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationQuote,
  InlineCitationSource,
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorShortcut,
  ModelSelectorTrigger,
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemDescription,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
  StackTrace,
  StackTraceContent,
  StackTraceCopyButton,
  StackTraceFrames,
  StackTraceHeader,
  Suggestion,
  Suggestions,
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
  Terminal,
  TerminalContent,
  TerminalHeader,
  TerminalTitle,
  Test,
  TestResults,
  TestResultsContent,
  TestResultsHeader,
  TestSuite,
  TestSuiteContent,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@depose/ui/ai-elements';
import { Badge } from '@depose/ui/components/badge';
import { EmptyState } from '~/features/lib/components/EmptyState';
import { PageLoading } from '~/features/lib/components/PageLoading';
import { PageSkeleton } from '~/features/lib/components/PageSkeleton';
import { ErrorState, ForbiddenPage, NotFoundPage } from '~/features/layout/ErrorPage';
import { Button } from '@depose/ui/components/button';
import { Copy, Reload, Sparkle, ThumbsUp } from '@coolicons/react';

const ANSWER = `The record shows the agreement was signed on **14 March 2023** [1], with payment due within 30 days [2]. The vendor terminated for non-payment on 2 May 2023, eleven days after the final reminder [3].

- Signature block dated 14 March 2023 [1]
- Invoice #4471 issued 18 March, due 17 April [2]
- Termination notice served 2 May 2023 [3]`;

const SOURCES = [
  {
    id: 'src-1',
    title: 'Master Services Agreement — signature page',
    doc: 'MSA.pdf',
    page: 12,
    quote: 'IN WITNESS WHEREOF, the parties have executed this Agreement as of 14 March 2023.',
  },
  {
    id: 'src-2',
    title: 'Invoice #4471',
    doc: 'Invoice-4471.pdf',
    page: 1,
    quote: 'Payment terms: net 30 days from invoice date.',
  },
  {
    id: 'src-3',
    title: 'Notice of termination',
    doc: 'Termination-Notice.pdf',
    page: 1,
    quote: 'We hereby terminate the Agreement for material breach, effective immediately.',
  },
];

const STACK = `RetrievalError: vector index unavailable
    at VectorStore.query (/app/src/retrieval/vector.ts:88:13)
    at EvidencePack.build (/app/src/ai/evidence.ts:142:9)
    at runAgent (/app/src/ai/agent.ts:64:5)
    at node_modules/.pnpm/p-limit@5.0.0/node_modules/p-limit/index.js:42:11`;

const FILE_TREE = [
  { path: 'src/ai/agent.ts', add: 42, del: 8 },
  { path: 'src/ai/evidence.ts', add: 19, del: 3 },
  { path: 'src/retrieval/vector.ts', add: 7, del: 0 },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-border pb-10 last:border-0">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">{children}</div>
  );
}

export function AiElementsPage() {
  const [model, setModel] = useState('gpt-5');
  const [effort, setEffort] = useState('medium');
  const [selectedFile, setSelectedFile] = useState('src/ai/agent.ts');
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string[]>([]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-1 py-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkle size={16} className="text-primary" />
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">AI Elements</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
          Agentic interface patterns built from the local shadcn/ui base components — Trace, Code
          Block, Message Scroller, Hover Card and Item. Each one is a composition you own, adapted
          to Depose deep-agent data: grounded answers, citations, retrieval traces and evidence
          scores.
        </p>
      </header>

      <Section
        title="Chat"
        description="A thread of message turns. The reply streams in place while Message Scroller keeps your reading position."
      >
        <div className="h-[30rem] overflow-hidden rounded-xl border border-border bg-card">
          <Conversation className="h-full">
            <ConversationContent className="mx-auto max-w-2xl gap-6 p-4">
              <ConversationItem>
                <Message from="user">
                  <MessageContent>
                    When was the agreement signed, and when did the vendor terminate?
                  </MessageContent>
                </Message>
              </ConversationItem>

              <ConversationItem>
                <Message from="assistant">
                  <MessageContent>
                    <Reasoning defaultOpen={false} duration={6}>
                      <ReasoningTrigger />
                      <ReasoningContent>
                        {`The question asks for two dates. I should search the signature page for the execution date, then the termination notice for the effective date. I'll verify both against the source pages before answering.`}
                      </ReasoningContent>
                    </Reasoning>

                    <Tool defaultOpen={false} name="search_facts" state="output-available">
                      <ToolHeader />
                      <ToolContent>
                        <ToolInput input={{ query: 'agreement signed execution date', limit: 5 }} />
                        <ToolOutput
                          output={{
                            matches: 3,
                            top: 'Signature page, 14 March 2023',
                          }}
                        />
                      </ToolContent>
                    </Tool>

                    <MessageResponse onCitationClick={() => undefined}>{ANSWER}</MessageResponse>

                    <Sources count={SOURCES.length} defaultOpen>
                      <SourcesTrigger />
                      <SourcesContent>
                        {SOURCES.map((source) => (
                          <Source key={source.id} href="#" title={source.title}>
                            {source.doc} · p. {source.page}
                          </Source>
                        ))}
                      </SourcesContent>
                    </Sources>
                  </MessageContent>

                  <MessageToolbar>
                    <MessageActions>
                      <MessageAction tooltip="Copy answer">
                        <Copy size={14} />
                      </MessageAction>
                      <MessageAction tooltip="Regenerate">
                        <Reload size={14} />
                      </MessageAction>
                      <MessageAction tooltip="Good answer">
                        <ThumbsUp size={14} />
                      </MessageAction>
                    </MessageActions>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      evidence 92%
                    </Badge>
                  </MessageToolbar>
                </Message>
              </ConversationItem>
            </ConversationContent>
          </Conversation>
        </div>
      </Section>

      <Section
        title="Chain of Thought"
        description="A summary that expands into the steps an agent took, including the facts it searched."
      >
        <Card>
          <ChainOfThought defaultOpen>
            <ChainOfThoughtHeader>Thought through 4 steps</ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              <ChainOfThoughtStep
                status="complete"
                label="Parsed the question into two date lookups"
              />
              <ChainOfThoughtStep
                status="complete"
                label="Searched confirmed facts for the execution date"
                description="3 matches in the signature page and preamble"
              />
              <ChainOfThoughtStep
                status="active"
                label="Verifying the termination date against the notice"
              />
              <ChainOfThoughtSearchResults>
                <ChainOfThoughtSearchResult>MSA.pdf</ChainOfThoughtSearchResult>
                <ChainOfThoughtSearchResult>Termination-Notice.pdf</ChainOfThoughtSearchResult>
                <ChainOfThoughtSearchResult>Invoice-4471.pdf</ChainOfThoughtSearchResult>
              </ChainOfThoughtSearchResults>
            </ChainOfThoughtContent>
          </ChainOfThought>
        </Card>
      </Section>

      <Section
        title="Plan & Task"
        description="What the agent intends to do, and the steps as it takes them."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <Plan defaultOpen>
              <PlanHeader>
                <PlanTitle>Answer the timeline question</PlanTitle>
                <PlanDescription>3 steps · grounded in confirmed facts</PlanDescription>
              </PlanHeader>
              <PlanContent>
                <ChainOfThoughtStep status="complete" label="Locate the signature date" />
                <ChainOfThoughtStep status="complete" label="Locate the termination date" />
                <ChainOfThoughtStep status="active" label="Compose the grounded answer" />
              </PlanContent>
              <PlanFooter>
                <PlanAction>Edit plan</PlanAction>
              </PlanFooter>
            </Plan>
          </Card>
          <Card>
            <Task defaultOpen>
              <TaskTrigger title="Working through the record" />
              <TaskContent>
                <TaskItem status="complete">Search confirmed facts</TaskItem>
                <TaskItem status="complete">
                  Open <TaskItemFile>MSA.pdf</TaskItemFile>
                </TaskItem>
                <TaskItem status="running">Check the termination notice</TaskItem>
              </TaskContent>
            </Task>
          </Card>
        </div>
      </Section>

      <Section
        title="Queue"
        description="The agent's todo list, split into what is left and what is done."
      >
        <Card>
          <Queue>
            <QueueSection defaultOpen>
              <QueueSectionTrigger>
                <QueueSectionLabel>In progress · 1</QueueSectionLabel>
              </QueueSectionTrigger>
              <QueueSectionContent>
                <QueueList>
                  <QueueItem status="running">
                    <QueueItemIndicator status="running" />
                    <QueueItemContent>Cross-check the payment terms</QueueItemContent>
                    <QueueItemDescription>Invoice #4471, net 30</QueueItemDescription>
                  </QueueItem>
                </QueueList>
              </QueueSectionContent>
            </QueueSection>
            <QueueSection defaultOpen={false}>
              <QueueSectionTrigger>
                <QueueSectionLabel>Done · 3</QueueSectionLabel>
              </QueueSectionTrigger>
              <QueueSectionContent>
                <QueueList>
                  <QueueItem status="complete">
                    <QueueItemIndicator status="complete" />
                    <QueueItemContent>Find the execution date</QueueItemContent>
                  </QueueItem>
                  <QueueItem status="complete">
                    <QueueItemIndicator status="complete" />
                    <QueueItemContent>Find the termination date</QueueItemContent>
                  </QueueItem>
                  <QueueItem status="complete">
                    <QueueItemIndicator status="complete" />
                    <QueueItemContent>Verify citations</QueueItemContent>
                  </QueueItem>
                </QueueList>
              </QueueSectionContent>
            </QueueSection>
          </Queue>
        </Card>
      </Section>

      <Section
        title="Tool"
        description="A tool call from input to output, in every state the agent can report."
      >
        <div className="flex flex-col gap-3">
          <Tool name="search_facts" state="input-available" defaultOpen>
            <ToolHeader />
            <ToolContent>
              <ToolInput input={{ query: 'termination effective date' }} />
            </ToolContent>
          </Tool>
          <Tool name="open_document" state="output-available">
            <ToolHeader />
            <ToolContent>
              <ToolInput input={{ documentId: 'doc_msa', page: 12 }} />
              <ToolOutput output={{ text: 'Executed as of 14 March 2023.' }} />
            </ToolContent>
          </Tool>
          <Tool name="vector_query" state="output-error" defaultOpen>
            <ToolHeader />
            <ToolContent>
              <ToolInput input={{ embedding: 'timeline', topK: 8 }} />
              <ToolOutput errorText="Vector index unavailable: no embedding model configured." />
            </ToolContent>
          </Tool>
          <Tool name="delete_fact" state="output-denied">
            <ToolHeader />
            <ToolContent>
              <ToolInput input={{ factId: 'fact_881' }} />
            </ToolContent>
          </Tool>
        </div>
      </Section>

      <Section
        title="Subagent"
        description="A delegated run, with its instructions, tools and result."
      >
        <Card>
          <Agent name="citation-verifier" model="gpt-5-mini" defaultOpen>
            <AgentHeader />
            <AgentContent>
              <AgentInstructions>
                Check every citation in the draft answer against the evidence pack. Report any quote
                that does not match its source page.
              </AgentInstructions>
              <AgentTools>
                <AgentTool name="read_evidence" status="complete" />
                <AgentTool name="compare_quote" status="complete" />
                <AgentTool name="flag_mismatch" status="running" />
              </AgentTools>
              <AgentOutput
                language="Result"
                output={{ verified: 3, mismatched: 0, confidence: 0.94 }}
              />
            </AgentContent>
          </Agent>
        </Card>
      </Section>

      <Section
        title="Confirmation & Checkpoint"
        description="Approving a tool before it runs, and a point in the conversation you can return to."
      >
        <div className="flex flex-col gap-3">
          <Confirmation state="request">
            <ConfirmationTitle description="This will delete a confirmed fact and its citation.">
              Run delete_fact?
            </ConfirmationTitle>
            <ConfirmationActions>
              <ConfirmationAction variant="outline">Deny</ConfirmationAction>
              <ConfirmationAction>Approve</ConfirmationAction>
            </ConfirmationActions>
          </Confirmation>
          <Confirmation state="accepted">
            <ConfirmationTitle description="delete_fact ran and removed fact_881.">
              Approved
            </ConfirmationTitle>
          </Confirmation>
          <Confirmation state="rejected">
            <ConfirmationTitle description="No change was made to the record.">
              Denied
            </ConfirmationTitle>
          </Confirmation>
          <Checkpoint>
            <span className="text-xs text-muted-foreground">Before the deletion</span>
            <CheckpointTrigger />
          </Checkpoint>
        </div>
      </Section>

      <Section
        title="Context & Model Selector"
        description="How much of the window the thread has used, and which model and effort the agent runs."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Context usedTokens={48200} maxTokens={200000} modelId="gpt-5">
            <ContextTrigger />
            <ContextContent>
              <ContextContentHeader />
              <ContextContentBody />
              <ContextContentFooter />
            </ContextContent>
          </Context>

          <ModelSelector>
            <ModelSelectorTrigger>
              <Button variant="outline" size="sm" className="gap-2">
                <ModelSelectorLogo />
                <ModelSelectorName>{model}</ModelSelectorName>
              </Button>
            </ModelSelectorTrigger>
            <ModelSelectorContent>
              <ModelSelectorList value={model} onValueChange={setModel}>
                <ModelSelectorGroup heading="Model">
                  <ModelSelectorItem value="gpt-5">
                    <ModelSelectorName>GPT-5</ModelSelectorName>
                    <ModelSelectorShortcut>⌘1</ModelSelectorShortcut>
                  </ModelSelectorItem>
                  <ModelSelectorItem value="gpt-5-mini">
                    <ModelSelectorName>GPT-5 mini</ModelSelectorName>
                  </ModelSelectorItem>
                  <ModelSelectorItem value="claude-sonnet">
                    <ModelSelectorName>Claude Sonnet</ModelSelectorName>
                  </ModelSelectorItem>
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>

          <ModelSelector>
            <ModelSelectorTrigger>
              <Button variant="outline" size="sm" className="gap-2">
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {effort}
                </Badge>
                effort
              </Button>
            </ModelSelectorTrigger>
            <ModelSelectorContent>
              <ModelSelectorList value={effort} onValueChange={setEffort}>
                <ModelSelectorGroup heading="Reasoning effort">
                  {(['low', 'medium', 'high'] as const).map((value) => (
                    <ModelSelectorItem key={value} value={value}>
                      <ModelSelectorName className="capitalize">{value}</ModelSelectorName>
                    </ModelSelectorItem>
                  ))}
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        </div>
      </Section>

      <Section
        title="Inline Citation"
        description="A source in the sentence that opens on hover, with the quote on the page."
      >
        <Card>
          <p className="text-sm leading-relaxed text-pretty">
            The agreement was executed on 14 March 2023{' '}
            <InlineCitation>
              <InlineCitationCard>
                <InlineCitationCardTrigger sources={['https://depose.local/msa']} />
                <InlineCitationCardBody>
                  <InlineCitationSource
                    title="Master Services Agreement"
                    url="https://depose.local/msa"
                  >
                    <InlineCitationQuote>
                      IN WITNESS WHEREOF, the parties have executed this Agreement as of 14 March
                      2023.
                    </InlineCitationQuote>
                  </InlineCitationSource>
                </InlineCitationCardBody>
              </InlineCitationCard>
            </InlineCitation>{' '}
            and payment fell due thirty days later.
          </p>
        </Card>
      </Section>

      <Section
        title="File Tree"
        description="The files an agent changed, as a folder tree with line deltas."
      >
        <Card>
          <FileTree
            defaultExpanded={['src', 'src/ai']}
            selected={selectedFile}
            onSelect={setSelectedFile}
          >
            <FileTreeFolder path="src">
              <FileTreeFolder path="src/ai">
                {FILE_TREE.filter((file) => file.path.startsWith('src/ai')).map((file) => (
                  <FileTreeFile key={file.path} path={file.path}>
                    {file.path.split('/').at(-1)}
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      +{file.add} −{file.del}
                    </span>
                  </FileTreeFile>
                ))}
              </FileTreeFolder>
              <FileTreeFolder path="src/retrieval">
                {FILE_TREE.filter((file) => file.path.startsWith('src/retrieval')).map((file) => (
                  <FileTreeFile key={file.path} path={file.path}>
                    {file.path.split('/').at(-1)}
                  </FileTreeFile>
                ))}
              </FileTreeFolder>
            </FileTreeFolder>
          </FileTree>
        </Card>
      </Section>

      <Section
        title="Stack Trace & Terminal"
        description="A failed retrieval step with its frames, and a command the agent ran."
      >
        <div className="flex flex-col gap-3">
          <StackTrace trace={STACK} defaultOpen>
            <StackTraceHeader />
            <StackTraceContent>
              <StackTraceFrames />
              <StackTraceCopyButton />
            </StackTraceContent>
          </StackTrace>
          <Terminal
            command="pnpm --filter @depose/backend test:retrieval"
            output={`✓ vector index built (12,840 chunks)
✓ embedding model loaded
✗ query 'timeline' returned 0 results
  expected ≥ 1 match for the execution date`}
            defaultOpen
          >
            <TerminalHeader>
              <TerminalTitle />
            </TerminalHeader>
            <TerminalContent />
          </Terminal>
        </div>
      </Section>

      <Section
        title="Test Results"
        description="A test run by the agent, with suites, failures and durations."
      >
        <Card>
          <TestResults summary={{ total: 5, passed: 4, failed: 1, duration: 12 }}>
            <TestResultsHeader />
            <TestResultsContent>
              <TestSuite name="retrieval" tests={[{ name: 'query', status: 'failed' }]}>
                <TestSuiteContent>
                  <Test name="builds index" status="passed" duration={2.1} />
                  <Test name="query returns matches" status="failed" duration={0.4} />
                </TestSuiteContent>
              </TestSuite>
              <TestSuite name="citations">
                <TestSuiteContent>
                  <Test name="verifies quotes" status="passed" duration={1.2} />
                  <Test name="flags mismatches" status="passed" duration={0.8} />
                </TestSuiteContent>
              </TestSuite>
            </TestResultsContent>
          </TestResults>
        </Card>
      </Section>

      <Section
        title="Prompt Input & Suggestions"
        description="A message field with attachments and a send button, plus one-click prompts."
      >
        <div className="flex flex-col gap-3">
          <Suggestions>
            {[
              'What happened around the signing date?',
              'Which facts mention payment?',
              'What is missing from the record?',
            ].map((suggestion) => (
              <Suggestion key={suggestion} suggestion={suggestion} onClick={setDraft} />
            ))}
          </Suggestions>
          <PromptInput
            onSubmit={(message) => {
              if (!message.text.trim()) return;
              setSent((current) => [message.text, ...current]);
              setDraft('');
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about the facts, dates, people, or documents…"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <Badge variant="outline" className="text-[10px]">
                  ask
                </Badge>
              </PromptInputTools>
              <PromptInputSubmit className="ml-auto" disabled={!draft.trim()} />
            </PromptInputFooter>
          </PromptInput>
          {sent.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Sent: {sent.map((text) => `“${text}”`).join(', ')}
            </p>
          ) : null}
        </div>
      </Section>

      <Section
        title="Shell states"
        description="Load, skeleton, empty, and error variants shared by every scene. Routes use the centered spinner; skeletons are reserved for content-shaped placeholders."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-2 text-xs font-medium text-muted-foreground">PageLoading — spinner</p>
            <PageLoading label="Loading facts..." />
          </Card>
          <Card>
            <p className="mb-2 text-xs font-medium text-muted-foreground">PageSkeleton — skeleton</p>
            <PageSkeleton rows={2} />
          </Card>
          <Card>
            <p className="mb-2 text-xs font-medium text-muted-foreground">EmptyState</p>
            <EmptyState
              title="No facts yet"
              description="Facts appear here once documents have been processed."
            />
          </Card>
          <Card>
            <p className="mb-2 text-xs font-medium text-muted-foreground">ErrorState</p>
            <ErrorState title="Could not load facts" message="The request failed." />
          </Card>
          <Card>
            <p className="mb-2 text-xs font-medium text-muted-foreground">ForbiddenPage</p>
            <ForbiddenPage />
          </Card>
          <Card>
            <p className="mb-2 text-xs font-medium text-muted-foreground">NotFoundPage</p>
            <NotFoundPage />
          </Card>
        </div>
      </Section>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Every pattern imports from{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">@depose/ui/ai-elements</code>.
        </p>
        <ConversationDownload messages={[{ role: 'assistant', content: ANSWER }]} />
      </div>
    </div>
  );
}
