import type { ReactNode } from 'react';
import { PageHeader } from '~/layout/PageHeader';
import { EmptyState } from '~/lib/components/EmptyState';

interface PlaceholderPageProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  action?: ReactNode;
}

/**
 * Route scaffold for a screen whose data module has not shipped yet. It shows
 * the real loading/empty structure instead of pretending the feature works.
 */
export function PlaceholderPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  action,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState title={emptyTitle} description={emptyDescription} action={action} />
    </div>
  );
}
