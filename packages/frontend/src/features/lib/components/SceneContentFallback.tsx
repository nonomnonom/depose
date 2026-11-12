import { useEffect, useState } from 'react';

import { PageLoading } from './PageLoading';

/** PostHog-style delayed fallback: no flash of a spinner while a cached chunk resolves. */
export function SceneContentFallback(): React.ReactNode {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShow(true), 300);
    return () => window.clearTimeout(timeout);
  }, []);

  return show ? <PageLoading /> : <div className="min-h-40" aria-hidden="true" />;
}
