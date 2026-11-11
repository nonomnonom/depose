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
import { Label } from '@depose/ui/components/label';
import { NativeSelect, NativeSelectOption } from '@depose/ui/components/native-select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '~/lib/api/client';
import { FormField } from '~/lib/components/FormField';
import type { FirmDomain } from '~/lib/types';
import type { Firm } from '~/features/auth/types';
import { useMeQuery } from '~/queries/me';
import { queryKeys } from '~/lib/query/keys';

const firmSettingsSchema = z.object({
  name: z.string().trim().min(1),
  primaryLanguage: z.enum(['id', 'en']),
  jurisdiction: z.string().trim().min(2).max(8),
  defaultTimezone: z.string().trim().min(1),
});

type FirmSettingsValues = z.infer<typeof firmSettingsSchema>;

const domainsQueryKey = ['firm', 'domains'] as const;

export function FirmSettings() {
  const me = useMeQuery();
  const queryClient = useQueryClient();

  if (!me.data?.firm) {
    return <p className="text-sm text-muted-foreground">Memuat...</p>;
  }

  return <FirmSettingsForm firm={me.data.firm} key={me.data.firm.id} queryClient={queryClient} />;
}

function FirmSettingsForm({
  firm,
  queryClient,
}: {
  firm: Firm;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
  } = useForm<FirmSettingsValues>({
    resolver: zodResolver(firmSettingsSchema),
    defaultValues: {
      name: firm.name,
      primaryLanguage: firm.primaryLanguage === 'en' ? 'en' : 'id',
      jurisdiction: firm.jurisdiction,
      defaultTimezone: firm.defaultTimezone,
    },
  });

  const domains = useQuery({
    queryKey: domainsQueryKey,
    queryFn: () => api.get<{ domains: FirmDomain[] }>('/api/v1/firm/domains'),
  });

  const updateFirm = useMutation({
    mutationFn: (values: FirmSettingsValues) => api.patch<{ firm: Firm }>('/api/v1/firm', values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-medium tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kelola pengaturan firm</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Identitas</CardTitle>
          <CardDescription>{firm.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit((values) => updateFirm.mutate(values))}
            noValidate
          >
            <FormField
              inputId="settingsFirmName"
              label="Nama Firm"
              error={errors.name?.message}
              {...register('name')}
            />
            <FormField
              inputId="settingsJurisdiction"
              label="Jurisdiksi"
              error={errors.jurisdiction?.message}
              {...register('jurisdiction')}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settingsLanguage">Bahasa</Label>
              <NativeSelect
                id="settingsLanguage"
                className="w-full"
                {...register('primaryLanguage')}
              >
                <NativeSelectOption value="id">Bahasa Indonesia</NativeSelectOption>
                <NativeSelectOption value="en">English</NativeSelectOption>
              </NativeSelect>
            </div>
            <FormField
              inputId="settingsTimezone"
              label="Timezone"
              error={errors.defaultTimezone?.message}
              {...register('defaultTimezone')}
            />
            <div className="flex items-center justify-end gap-3 sm:col-span-2">
              {isSubmitSuccessful && !updateFirm.isPending ? (
                <span className="text-sm text-muted-foreground">Tersimpan</span>
              ) : null}
              <Button type="submit" disabled={updateFirm.isPending}>
                {updateFirm.isPending ? 'Memuat...' : 'Simpan'}
              </Button>
            </div>
          </form>
          {updateFirm.error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Terjadi kesalahan. Silakan coba lagi.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain</CardTitle>
        </CardHeader>
        <CardContent>
          {domains.isPending ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : domains.isError ? (
            <p className="text-sm text-destructive">Terjadi kesalahan. Silakan coba lagi.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {domains.data.domains.map((domain) => (
                <li
                  key={domain.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <span className="font-mono text-sm">{domain.hostname}</span>
                  <div className="flex items-center gap-2">
                    {domain.isPrimary ? (
                      <Badge variant="secondary">Utama</Badge>
                    ) : null}
                    <Badge variant={domain.status === 'active' ? 'default' : 'outline'}>
                      {domain.status === 'active' ? 'Aktif' : 'Menunggu'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}