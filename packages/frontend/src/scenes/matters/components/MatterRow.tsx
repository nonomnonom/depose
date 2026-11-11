import { Link } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import type { MatterDto, MatterDtoStatus } from '~/generated/schemas';
import { formatRelativeDate } from '~/lib/format/date';

const STATUS_TEXT: Record<MatterDtoStatus, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

const STATUS_DOT: Record<MatterDtoStatus, string> = {
  active: 'bg-emerald-500',
  closed: 'bg-amber-500',
  archived: 'bg-zinc-400',
};

export function MatterStatusBadge({ status }: { status: MatterDtoStatus }) {
  return (
    <Badge variant="outline" className="text-xs">
      <span className={`mr-1 inline-block size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_TEXT[status]}
    </Badge>
  );
}

export function MatterRow({ matter }: { matter: MatterDto }) {
  return (
    <Link
      to={`/matters/${matter.id}/overview`}
      className="flex flex-col gap-1.5 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate text-sm font-medium text-foreground">{matter.name}</h3>
        <MatterStatusBadge status={matter.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {matter.matterNumber ? <span>{matter.matterNumber}</span> : null}
        {matter.description ? (
          <span className="min-w-0 truncate">{matter.description}</span>
        ) : null}
        <span>Updated {formatRelativeDate(matter.updatedAt)}</span>
      </div>
    </Link>
  );
}
