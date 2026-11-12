/**
 * Depose AI Elements — agentic interface patterns composed from the local
 * shadcn/ui base components (Trace, Code Block, Message Scroller, Hover Card,
 * Item, Marker, Bubble, Attachment, Input Group, Dropdown Menu, ...).
 *
 * Import everything from `@depose/ui/ai-elements`, or a single pattern from
 * `@depose/ui/ai-elements/<name>` to keep bundles small.
 */
export * from './chain-of-thought';
export * from './chat';
export * from './checkpoint';
export * from './confirmation';
export * from './context';
export * from './file-tree';
export * from './inline-citation';
export * from './message';
export * from './model-selector';
export * from './plan';
export * from './prompt-input';
export * from './queue';
export * from './reasoning';
export * from './sources';
export * from './stack-trace';
export * from './subagent';
export * from './suggestion';
export * from './task';
export * from './terminal';
export * from './test-results';
export * from './tool';

export {
  AiCollapsible,
  asText,
  formatDuration,
  formatTokens,
  hostnameOf,
  toTraceStatus,
  useAutoOpen,
  type AgentStatus,
  type AiOpenProps,
} from './_internal';
