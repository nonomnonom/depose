import { zodResolver } from '@hookform/resolvers/zod';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout } from '~/app/layouts/AuthLayout';
import { api } from '~/lib/api/client';
import { ApiError } from '~/lib/api/errors';
import { FormField } from '~/lib/components/FormField';
import { setupFirmFormSchema, type SetupFirmFormValues } from '~/models/auth';
import { invalidateMe, useMeQuery } from '~/queries/me';

interface SetupFirmResponse {
  firm: { id: string; name: string; slug: string };
  primaryHost: string;
  loginUrl: string;
}

export function SetupFirm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMeQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFirmFormValues>({
    resolver: zodResolver(setupFirmFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      role: '',
      primaryLanguage: 'id',
      jurisdiction: 'ID',
      timezone: 'Asia/Jakarta',
    },
  });

  const setup = useMutation({
    mutationFn: (values: SetupFirmFormValues) =>
      api.post<SetupFirmResponse>('/api/v1/firm', {
        name: values.name,
        ...(values.slug ? { slug: values.slug } : {}),
        ...(values.role ? { role: values.role } : {}),
        primaryLanguage: values.primaryLanguage,
        jurisdiction: values.jurisdiction,
        timezone: values.timezone,
      }),
    onSuccess: async () => {
      await invalidateMe(queryClient);
      navigate('/', { replace: true });
    },
  });

  if (!me.isPending && !me.data) return <Navigate to="/login" replace />;
  if (me.data && !me.data.setupRequired) return <Navigate to="/" replace />;

  const errorMessage =
    setup.error instanceof ApiError && setup.error.status === 409
      ? 'Firm sudah dikonfigurasi'
      : setup.error
        ? 'Terjadi kesalahan. Silakan coba lagi.'
        : null;

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Setup Firm</CardTitle>
          <CardDescription>Buat firm Anda untuk mulai</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => setup.mutate(values))}
            noValidate
          >
            <FormField
              inputId="firmName"
              label="Nama Firm"
              autoComplete="organization"
              error={errors.name?.message}
              {...register('name')}
            />
            <FormField
              inputId="firmSlug"
              label="Slug"
              placeholder="Opsional"
              hint="Opsional"
              error={errors.slug?.message}
              {...register('slug')}
            />
            <FormField
              inputId="firmRole"
              label="Role"
              hint="Opsional"
              {...register('role')}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firmLanguage">Bahasa</Label>
                <NativeSelect id="firmLanguage" className="w-full" {...register('primaryLanguage')}>
                  <NativeSelectOption value="id">Bahasa Indonesia</NativeSelectOption>
                  <NativeSelectOption value="en">English</NativeSelectOption>
                </NativeSelect>
              </div>
              <FormField
                inputId="firmJurisdiction"
                label="Jurisdiksi"
                error={errors.jurisdiction?.message}
                {...register('jurisdiction')}
              />
            </div>
            <FormField
              inputId="firmTimezone"
              label="Timezone"
              error={errors.timezone?.message}
              {...register('timezone')}
            />
            {errorMessage ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" size="lg" disabled={setup.isPending}>
              {setup.isPending ? 'Memuat...' : 'Buat Firm'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}