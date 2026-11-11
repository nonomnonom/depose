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
import { loginFormSchema, type LoginFormValues } from '~/models/auth';
import { invalidateMe, useMeQuery } from '~/queries/me';
import { useTenantQuery } from '~/queries/tenant';

export function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMeQuery();
  const tenant = useTenantQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const signIn = useMutation({
    mutationFn: (values: LoginFormValues) =>
      api.post('/api/auth/sign-in/email', { email: values.email, password: values.password }),
    onSuccess: async () => {
      await invalidateMe(queryClient);
      navigate('/', { replace: true });
    },
  });

  if (me.data) {
    return <Navigate to={me.data.setupRequired ? '/setup' : '/'} replace />;
  }

  const errorMessage =
    signIn.error instanceof ApiError && signIn.error.status === 401
      ? 'Email atau password salah'
      : signIn.error instanceof ApiError && signIn.error.status === 403
        ? 'Email belum terverifikasi'
        : signIn.error
          ? 'Terjadi kesalahan. Silakan coba lagi.'
          : null;

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Masuk ke akun Depose Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => signIn.mutate(values))}
            noValidate
          >
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
              autoComplete="current-password"
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
            <Button type="submit" size="lg" disabled={signIn.isPending}>
              {signIn.isPending ? 'Memuat...' : 'Masuk'}
            </Button>
          </form>
          {tenant.data?.auth.allowSelfSignup ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Belum punya akun?{' '}
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                to="/signup"
              >
                Buat akun
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}