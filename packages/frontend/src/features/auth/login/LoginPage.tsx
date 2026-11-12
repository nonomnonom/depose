import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { AlertCircleIcon } from 'lucide-react';
import { ApiError } from '~/features/lib/api/errors';
import { FormField } from '~/features/lib/components/FormField';
import { useClientConfig } from '~/features/lib/config/client-config';
import type { MeResponseDto } from '~/generated/schemas';
import { queryKeys } from '~/features/lib/query/keys';
import { queryClient } from '~/features/lib/query/client';
import { meControllerMe } from '~/generated/endpoints';
import { signInWithEmail } from '~/features/lib/auth/api';
import { AuthLayout } from '~/features/layout/AuthLayout';
import { loginSchema, type LoginFormValues } from '~/features/auth/schemas/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = useClientConfig();
  const returnTo = searchParams.get('returnTo');

  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await signInWithEmail(values);
      const me = await meControllerMe();
      const payload = me.data as MeResponseDto;
      queryClient.setQueryData(queryKeys.me, payload);
      const target =
        payload.setupRequired
          ? '/setup'
          : returnTo && returnTo.startsWith('/')
            ? returnTo
            : '/matters';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    }
  });

  const signupAllowed = config.auth.allowSelfSignup;

  return (
    <AuthLayout
      title={config.auth.allowSelfSignup ? 'Log in' : 'Access controlled'}
      description={`Log in to ${config.firm?.name ?? 'Depose'}.`}
      footer={
        <div className="flex flex-col gap-2">
          {error ? (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Login failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      }
      switcher={
        signupAllowed ? (
          <span>
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </span>
        ) : (
          <span>Contact your firm admin for access.</span>
        )
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormField
          inputId="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@firm.com"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        <FormField
          inputId="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Processing...' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
