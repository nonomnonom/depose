import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@depose/ui/components/button';
import logoUrl from '~/assets/mascot/logo-favicon.png';
import { useClientConfig } from '~/lib/config/client-config';

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  switcher?: React.ReactNode;
}

const NOTES = [
  '// Fact intelligence for disputes.',
  '// Every fact cited. Every contradiction found.',
];

export function AuthLayout({ title, description, children, footer, switcher }: AuthLayoutProps) {
  const config = useClientConfig();
  const firmName = config.firm?.name ?? 'Depose';
  const [visibleNotes, setVisibleNotes] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisibleNotes(NOTES.length);
      return;
    }
    setVisibleNotes(0);
    const fullText = NOTES.map((line) => `// ${line}`).join('\n');
    let acc = 350;
    const schedule: number[] = [];
    for (const ch of fullText) {
      acc += ch === '\n' ? 380 : 42;
      schedule.push(acc);
    }
    const start = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - start;
      let k = 0;
      while (k < schedule.length && schedule[k] <= elapsed) {
        k++;
      }
      setVisibleNotes(k);
      if (k >= schedule.length) {
        clearInterval(id);
      }
    }, 40);
    return () => clearInterval(id);
  }, []);

  const displayedNotes = NOTES.slice(0, visibleNotes);

  return (
    <div className="AuthScene relative min-h-dvh bg-no-repeat bg-center">
      {/* Backdrop gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(80% 70% at 50% 30%, var(--auth-scene-backdrop-glow), transparent 70%), linear-gradient(180deg, var(--auth-scene-backdrop-top) 0%, var(--auth-scene-backdrop-mid) 55%, var(--auth-scene-backdrop-bottom) 100%)`,
        }}
      />

      {/* Typewriter notes */}
      <div className="pointer-events-none absolute top-[clamp(20px,4vh,40px)] left-[clamp(20px,4vw,44px)] z-10 min-h-[2.6em] hidden sm:block">
        {displayedNotes.map((note, idx) => (
          <div key={idx} className="font-mono text-xs leading-relaxed whitespace-pre text-primary/50 first:font-semibold">
            {note}
            {idx === displayedNotes.length - 1 && (
              <span className="inline-block w-2 h-[1.05em] ml-0.5 align-middle bg-warning rounded-[1px] animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <main className="relative z-20 flex items-center justify-center min-h-full py-18 px-4 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-4 flex items-center justify-center">
            <span className="flex items-center justify-center">
              <img src={logoUrl} alt="" className="h-7 w-auto sm:h-10" aria-hidden="true" />
            </span>
          </div>

          {/* Auth card */}
          <div className="AuthScene__card rounded-xl p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-1 text-center">
              <h1 className="m-0 text-xl font-bold leading-tight tracking-tight">{title}</h1>
              {description ? (
                <p className="mt-2 mb-0 text-sm text-muted-foreground text-pretty">{description}</p>
              ) : null}
            </div>
            {children}
            {footer ? <div className="mt-6">{footer}</div> : null}
            {switcher ? (
              <div className="mt-4 text-center text-sm text-muted-foreground">{switcher}</div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Footer info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-xs text-muted-foreground sm:text-right">
        {config.hostname}
        {config.requiresSetup ? ' · New instance' : ''}
      </div>
    </div>
  );
}
