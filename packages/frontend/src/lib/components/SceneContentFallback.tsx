import { useEffect, useState } from 'react';

import { PageSkeleton } from './PageSkeleton';

/** PostHog-style delayed fallback: no flash of skeleton while a cached chunk resolves. */
export function SceneContentFallback(): React.ReactNode {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShow(true), 300);
    return () => window.clearTimeout(timeout);
  }, []);

  return show ? <PageSkeleton rows={4} /> : <div className="min-h-40" aria-hidden="true" />;
}
