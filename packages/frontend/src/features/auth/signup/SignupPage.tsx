import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import { ApiError } from '~/features/lib/api/errors';
import { FormField } from '~/features/lib/components/FormField';
import { useClientConfig } from '~/features/lib/config/client-config';
import type { MeResponseDto } from '~/generated/schemas';
import { queryKeys } from '~/features/lib/query/keys';
import { queryClient } from '~/features/lib/query/client';
import { meControllerMe } from '~/generated/endpoints';
import { signUpWithEmail } from '~/features/lib/auth/api';
import { AuthLayout } from '~/features/layout/AuthLayout';
import { signupSchema, type SignupFormValues } from '~/features/auth/schemas/auth';

export function SignupPage() {
  const navigate = useNavigate();
  const config = useClientConfig();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await signUpWithEmail(values);
      try {
        const me = await meControllerMe();
        const payload = me.data as MeResponseDto;
        queryClient.setQueryData(queryKeys.me, payload);
        navigate(payload.setupRequired ? '/setup' : '/matters', { replace: true });
      } catch {
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed. Please try again.');
    }
  });

  if (!config.auth.allowSelfSignup) {
    return (
      <AuthLayout
        title="Sign-up closed"
        description="Self-signup is disabled for this instance."
        switcher={
          <span>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </span>
        }
      >
        <Alert>
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Limited access</AlertTitle>
          <AlertDescription>
            Contact your firm admin for an invitation or account creation.
          </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Account created"
        description="Please log in with your email and password."
        switcher={
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Go to login page
          </Link>
        }
      >
        <Alert>
          <CheckCircle2Icon className="size-4" />
          <AlertTitle>Signup successful</AlertTitle>
          <AlertDescription>
            {config.auth.requireEmailVerification
              ? 'Check your email for verification before logging in.'
              : 'Your account is ready to use.'}
          </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Sign up"
      description="Create a new account for your firm."
      footer={
        error ? (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>Signup failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null
      }
      switcher={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormField
          inputId="signup-name"
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          {...form.register('name')}
          error={form.formState.errors.name?.message}
        />
        <FormField
          inputId="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@firm.com"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        <FormField
          inputId="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <FormField
          inputId="signup-confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          {...form.register('confirmPassword')}
          error={form.formState.errors.confirmPassword?.message}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Processing...' : 'Sign up'}
        </Button>
      </form>
    </AuthLayout>
  );
}
