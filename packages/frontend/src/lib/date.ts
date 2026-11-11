import { formatDate } from './format/date';

export function formatRelativeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 0) return formatDate(value);
  if (days === 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days < 30) return `${days} hari yang lalu`;
  return formatDate(value);
}
