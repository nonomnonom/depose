import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@depose/ui/components/card';
import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import { NativeSelect, NativeSelectOption } from '@depose/ui/components/native-select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '~/lib/api/client';
import { FormField } from '~/lib/components/FormField';
import type { Matter, MatterStatus } from '~/lib/types';
import { mattersQueryKey, useMattersQuery } from '~/queries/matters';

const createMatterFormSchema = z.object({
  name: z.string().trim().min(1),
  matterNumber: z.string().trim().max(60),
  type: z.string().trim().min(1),
});

type CreateMatterFormValues = z.infer<typeof createMatterFormSchema>;

const STATUS_VARIANT: Record<MatterStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  closed: 'secondary',
  archived: 'outline',
};

const STATUS_LABEL: Record<MatterStatus, string> = {
  active: 'Aktif',
  closed: 'Ditutup',
  archived: 'Diarsipkan',
};

export function Matters() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const matters = useMattersQuery({ status: status || undefined, q: search || undefined });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMatterFormValues>({
    resolver: zodResolver(createMatterFormSchema),
    defaultValues: { name: '', matterNumber: '', type: 'litigation' },
  });

  const createMatter = useMutation({
    mutationFn: (values: CreateMatterFormValues) =>
      api.post<{ matter: Matter }>('/api/v1/matters', {
        name: values.name,
        ...(values.matterNumber ? { matterNumber: values.matterNumber } : {}),
        type: values.type,
      }),
    onSuccess: async () => {
      reset();
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: mattersQueryKey() });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-medium tracking-tight">Matter</h1>
          <p className="text-sm text-muted-foreground">Kelola matter Anda</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          Tambah Matter
        </Button>
      </header>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Matter</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit((values) => createMatter.mutate(values))}
              noValidate
            >
              <FormField
                inputId="matterName"
                label="Nama Matter"
                error={errors.name?.message}
                {...register('name')}
              />
              <FormField
                inputId="matterNumber"
                label="Nomor Matter"
                hint="Opsional"
                {...register('matterNumber')}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="matterType">Tipe</Label>
                <NativeSelect id="matterType" className="w-full" {...register('type')}>
                  <NativeSelectOption value="litigation">Litigation</NativeSelectOption>
                  <NativeSelectOption value="advisory">Advisory</NativeSelectOption>
                  <NativeSelectOption value="transactional">Transactional</NativeSelectOption>
                  <NativeSelectOption value="other">Other</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="flex items-end justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={createMatter.isPending}>
                  {createMatter.isPending ? 'Membuat...' : 'Buat'}
                </Button>
              </div>
            </form>
            {createMatter.error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Terjadi kesalahan. Silakan coba lagi.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Cari matter"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Cari matter"
        />
        <NativeSelect
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <NativeSelectOption value="">Semua</NativeSelectOption>
          <NativeSelectOption value="active">Aktif</NativeSelectOption>
          <NativeSelectOption value="closed">Ditutup</NativeSelectOption>
          <NativeSelectOption value="archived">Diarsipkan</NativeSelectOption>
        </NativeSelect>
      </div>

      {matters.isPending ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : matters.isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-sm text-destructive">Terjadi kesalahan. Silakan coba lagi.</p>
            <Button variant="outline" onClick={() => void matters.refetch()}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : matters.data.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-1 py-10">
            <p className="text-sm font-medium">Belum ada matter</p>
            <p className="text-sm text-muted-foreground">Buat matter pertama Anda untuk memulai.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {matters.data.items.map((matter) => (
              <li key={matter.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{matter.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {matter.matterNumber ?? matter.type}
                      {matter.openedDate ? matter.openedDate : ''}
                    </span>
                  </div>
                  <Badge variant={STATUS_VARIANT[matter.status]}>{STATUS_LABEL[matter.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
