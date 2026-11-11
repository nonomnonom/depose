export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  warnings: string[];
}

export interface Cursor {
  sortValue: string;
  id: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function normalizeLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.sortValue}|${cursor.id}`, 'utf8').toString('base64url');
}

export function decodeCursor(value: unknown): Cursor | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const [sortValue, id] = Buffer.from(value, 'base64url').toString('utf8').split('|');
    if (!sortValue || !id) return null;
    return { sortValue, id };
  } catch {
    return null;
  }
}

export function toPage<T>(items: T[], limit: number): Page<T> {
  const hasMore = items.length > limit;
  return {
    items: hasMore ? items.slice(0, limit) : items,
    nextCursor: null,
    hasMore,
    warnings: [],
  };
}
