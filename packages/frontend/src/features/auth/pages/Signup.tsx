import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@depose/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@depose/ui/components/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout } from '~/app/layouts/AuthLayout';
import { api } from '~/lib/api/client';
import { ApiError } from '~/lib/api/errors';
import { FormField } from '~/lib/components/FormField';
import { signupFormSchema, type SignupFormValues } from '~/models/auth';
import { invalidateMe, useMeQuery } from '~/queries/me';
import { useTenantQuery } from '~/queries/tenant';

export function Signup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMeQuery();
  const tenant = useTenantQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupFormSchema) });

  const signUp = useMutation({
    mutationFn: (values: SignupFormValues) =>
      api.post('/api/auth/sign-up/email', {
        name: values.name,
        email: values.email,
        password: values.password,
      }),
    onSuccess: async () => {
      await invalidateMe(queryClient);
      navigate('/setup', { replace: true });
    },
  });

  if (me.data) {
    return <Navigate to={me.data.setupRequired ? '/setup' : '/'} replace />;
  }

  if (tenant.data && !tenant.data.auth.allowSelfSignup) {
    return (
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle>Buat akun</CardTitle>
            <CardDescription>Pendaftaran akun dinonaktifkan untuk instance ini</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-medium underline underline-offset-4" to="/login">
              Masuk
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  const errorMessage = signUp.error instanceof ApiError ? signUp.error.message : null;

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Buat akun</CardTitle>
          <CardDescription>Daftarkan akun untuk memulai</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => signUp.mutate(values))}
            noValidate
          >
            <FormField
              inputId="name"
              label="Nama"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
            <FormField
              inputId="email"
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <FormField
              inputId="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="Minimal 8 karakter"
              error={errors.password?.message}
              {...register('password')}
            />
            {errorMessage ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" size="lg" disabled={signUp.isPending}>
              {signUp.isPending ? 'Memuat...' : 'Daftar'}
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link className="font-medium text-foreground underline underline-offset-4" to="/login">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}