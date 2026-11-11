import { useCallback, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, BadgeDot } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@depose/ui/components/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@depose/ui/components/dialog';
import { Input } from '@depose/ui/components/input';
import { Skeleton } from '@depose/ui/components/skeleton';
import { MatterDtoStatus, MattersControllerListStatus } from '~/generated/schemas';
import { URLSearchParams } from 'url';
import { useNavigate } from 'react-router-dom';
import { useClientConfig } from '~/lib/config/client-config';
import { useSession } from '~/lib/auth/session';
import { ApiError, codeForStatus } from '~/lib/api/errors';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { queryKeys } from '~/lib/query/keys';
import { mattersControllerCreate, mattersControllerList } from '~/generated/endpoints';
import type { MatterDto } from '~/generated/schemas';
import { formatRelativeDate } from '~/lib/date';

interface FilterOption {
  label: string;
  value?: MattersControllerListStatus;
}

const STATUS_OPTIONS: FilterOption[] = [
  { label: 'Semua status', value: undefined },
  { label: 'Aktif', value: 'active' },
  { label: 'Ditutup', value: 'closed' },
  { label: 'Arsip', value: 'archived' },
];

function statusBadge(status: MatterDtoStatus) {
  const text: Record<MatterDtoStatus, string> = {
    active: 'Aktif',
    closed: 'Ditutup',
    archived: 'Arsip',
  };
  const dotColor: Record<MatterDtoStatus, string> = {
    active: 'bg-emerald-500',
    closed: 'bg-amber-500',
    archived: 'bg-zinc-400',
  };
  return (
    <Badge variant="outline" className="text-xs">
      <BadgeDot className={dotColor[status]} />
      {text[status]}
    </Badge>
  );
}

export function MattersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = useClientConfig();
  const { me } = useSession();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MattersControllerListStatus | undefined>(undefined);
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });

  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.matters({ q: search || undefined, status }),
    queryFn: ({ pageParam: cursor }) =>
      mattersControllerList({
        limit: 20,
        cursor,
        q: search || undefined,
        status,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.data.nextCursor,
  });

  const allItems = listQuery.data?.pages.flatMap((p) => p.data.items) ?? [];

  const create = useMutation({
    mutationFn: async () =>
      mattersControllerCreate({
        name: createForm.name.trim() || 'Matter Baru',
        description: createForm.description.trim() || undefined,
      }),
    onSuccess: (matter) => {
      setCreateForm({ name: '', description: '' });
      setCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.matters({ q: search || undefined, status }) });
      navigate(`/matter/${matter.data.id}`, { replace: true });
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : 'Gagal membuat matter.'),
  });

  const [createError, setCreateError] = useState<string | null>(null);

  const handleSearch = useCallback(
    (value: string, filter: FilterOption | null) => {
      setSearch(value);
      if (filter) setStatus(filter.value);
      listQuery.refetch();
    },
    [listQuery],
  );

  return (
    <>
      <PageHeader
        title="Matter"
        description={me?.firm ? `Matter untuk ${me.firm.name}` : config.firm?.name ? `Matter ${config.firm.name}` : undefined}
        actions={
          <Button onClick={() => setCreateDialog(true)}>
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Buat matter
          </Button>
        }
      />

      <Command open={createDialog} onOpenChange={setCreateDialog} title="Buat matter">
        <CommandInput
          placeholder="Nama matter..."
          value={createForm.name}
          onValueChange={(v) => setCreateForm((f) => ({ ...f, name: v }))}
        />
        <DialogContent className="space-y-3">
          <DialogHeader>
            <DialogTitle>Buat matter</DialogTitle>
            <DialogDescription>
              Tambahkan matter ke firm Anda.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nama matter"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Field label="Deskripsi">
            <Input placeholder="Deskripsi singkat..." value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          {createError ? (
            <ErrorState
              title="Gagal membuat matter"
              message={createError}
              onRetry={() => { setCreateError(null); create.mutate(); }}
            />
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setCreateDialog(false); setCreateError(null); }}>
              Batal
            </Button>
            <Button onClick={() => create.mutate()} disabled={!createForm.name.trim() || create.isPending}>
              {create.isPending ? 'Membuat...' : 'Buat matter'}
            </Button>
          </div>
        </DialogContent>
      </Command>

      <div className="flex flex-wrap items-center gap-2">
        <Command className="w-[var(--sidebar-width-icon)] sm:w-60">
          <CommandInput
            value={search}
            onValueChange={(v) => setSearch(v)}
            placeholder="Cari matter..."
          />
          <CommandList>
            <CommandEmpty>
              {allItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {search ? 'Tidak ada hasil.' : 'Belum ada matter. Membuat matter sekarang?'}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ketik dan tekan Enter untuk filter.
                </p>
              )}
            </CommandEmpty>
            <CommandGroup heading="Status">
              {STATUS_OPTIONS.map((opt) => (
                <CommandItem
                  key={opt.label}
                  className={opt.value === status ? 'bg-accent text-accent-foreground' : ''}
                  onSelect={() => handleSearch(search, opt)}
                >
                  <span className={opt.value === status ? 'ml-auto' : 'hidden'}>●</span>
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>

      {listQuery.isPending
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))
        : allItems.length === 0 && !search
          ? <EmptyList />
          : listQuery.isError
            ? <ErrorState title="Gagal memuat matter" message="Tidak dapat mengambil daftar matter." onRetry={() => listQuery.refetch()} />
            : (
              <>
                {allItems.map((matter) => (
                  <MatterRow key={matter.id} matter={matter} onClick={() => navigate(`/matter/${matter.id}`)} />
                ))}
                {listQuery.isFetchingNextPage ? (
                  <div className="flex justify-center py-4">
                    <Button variant="outline" size="sm" disabled className="gap-2">
                      <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                      </svg>
                      Memuat...
                    </Button>
                  </div>
                ) : null}
              </>
            )
      }

      {listQuery.isError && allItems.length === 0 ? null : null}
    </>
  );
}

function MatterRow({ matter, onClick }: { matter: MatterDto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground">{matter.name}</h3>
          {matter.description ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{matter.description}</p> : null}
        </div>
        <div className="shrink-0">{statusBadge(matter.status)}</div>
      </div>
      {matter.matterNumber ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Nomor: {matter.matterNumber}</span>
        </div>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Dibuat {formatRelativeDate(matter.createdAt)}</span>
      </div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function EmptyList() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <svg className="size-10 text-muted-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-sm text-muted-foreground">Belum ada matter.</p>
      <p className="text-sm text-muted-foreground">Buat matter untuk memulai kerja.</p>
      <Button onClick={() => {}} className="gap-2">
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Buat matter
      </Button>
    </div>
  );
}

function URLSearchParams() {} // placeholder
