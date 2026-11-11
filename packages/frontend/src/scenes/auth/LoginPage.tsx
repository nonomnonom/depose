import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { AlertCircleIcon } from 'lucide-react';
import { ApiError } from '~/lib/api/errors';
import { FormField } from '~/lib/components/FormField';
import { useClientConfig } from '~/lib/config/client-config';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/query/keys';
import { queryClient } from '~/lib/query/client';
import { meControllerMe } from '~/generated/endpoints';
import { signInWithEmail } from '~/lib/auth/api';
import { AuthLayout } from '~/layout/AuthLayout';
import { loginSchema, type LoginFormValues } from '~/scenes/auth/schemas/auth';

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
      queryClient.setQueryData(queryKeys.me, me.data);
      const target =
        me.data.setupRequired
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
      title="Log in"
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
