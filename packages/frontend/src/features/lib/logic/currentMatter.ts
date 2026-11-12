/**
 * The matter a person was last working in. PostHog keys this off the current
 * project; here it is what makes the app open matter-first instead of on a
 * firm-wide list. Storage is best-effort: a blocked localStorage just means we
 * fall back to the matter chooser.
 */
const STORAGE_KEY = 'depose.matter.current';

export function readCurrentMatterId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberCurrentMatter(matterId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, matterId);
  } catch {
    // Storage unavailable (private mode, blocked cookies); navigation still works.
  }
}

export function forgetCurrentMatter(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See rememberCurrentMatter.
  }
}
