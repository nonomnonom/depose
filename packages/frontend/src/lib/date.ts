import { formatDate } from './format/date';
import { differenceInDays } from 'date-fns';

export function formatRelativeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = differenceInDays(date, new Date());
  if (days < 0) {
    return differenceInDays(new Date(), date) === 0 ? 'hari ini' :
      differenceInDays(new Date(), date) < 30 ? `± ${Math.abs(days)} hari` :
        formatDate(value);
  }
  if (days === 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days < 30) return `${days} hari yang lalu`;
  return formatDate(value);
}
