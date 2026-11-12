import type { ReactNode } from 'react';

/** No navigation at all (PostHog `BareLayout`). Auth/setup scenes own their frame. */
export function PlainLayout({ children }: { children: ReactNode }): ReactNode {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
