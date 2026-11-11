import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { CircleWarning } from '@coolicons/react';
import { ApiError } from '~/lib/api/errors';
import { FormField } from '~/lib/components/FormField';
import { useClientConfig } from '~/lib/config/client-config';
import { queryKeys } from '~/lib/query/keys';
import { queryClient } from '~/lib/query/client';
import { meControllerMe } from '~/generated/endpoints';
import { unwrapData } from '~/lib/api/client';
import { signInWithEmail, signInWithSso } from '~/lib/auth/api';
import { AuthLayout } from '~/layout/auth/AuthLayout';
import { loginSchema, type LoginFormValues } from '~/scenes/auth/schemas/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { firmName, features } = useClientConfig();
  const returnTo = searchParams.get('returnTo');

  const [error, setError] = useState<string | null>(null);
  const [ssoPending, setSsoPending] = useState(false);
  const [mode, setMode] = useState<'email' | 'sso'>('email');
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const { passwordLogin, ssoLogin, ssoRequired, selfSignup } = features.auth;
  const bothMethods = passwordLogin && ssoLogin;
  const showSsoForm = ssoRequired || (ssoLogin && !passwordLogin) || mode === 'sso';

  const goAfterLogin = (setupRequired: boolean) => {
    const target =
      setupRequired
        ? '/setup'
        : returnTo && returnTo.startsWith('/')
          ? returnTo
          : '/matters';
    navigate(target, { replace: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await signInWithEmail(values);
      const me = unwrapData(await meControllerMe());
      queryClient.setQueryData(queryKeys.me, me);
      goAfterLogin(me.setupRequired);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    }
  });

  const handleSso = async () => {
    const email = form.getValues('email').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      form.setError('email', { message: 'Enter your email to continue with SSO.' });
      return;
    }
    setError(null);
    setSsoPending(true);
    try {
      await signInWithSso(email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'SSO sign-in failed. Please try again.');
      setSsoPending(false);
    }
  };

  const switcher = selfSignup ? (
    <span>
      Don't have an account?{' '}
      <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
        Sign up
      </Link>
    </span>
  ) : (
    <span>Contact your firm admin for access.</span>
  );

  const errorAlert = error ? (
    <Alert variant="destructive">
      <CircleWarning size={16} />
      <AlertTitle>Login failed</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  const emailField = (
    <FormField
      inputId="login-email"
      label="Email"
      type="email"
      autoComplete="email"
      placeholder="name@firm.com"
      {...form.register('email')}
      error={form.formState.errors.email?.message}
    />
  );

  // SSO is the only configured credential path.
  if (ssoRequired) {
    return (
      <AuthLayout
        title="Log in"
        description={`Log in to ${firmName} with your work email.`}
        footer={errorAlert}
        switcher={switcher}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSso();
          }}
          noValidate
        >
          <p className="text-sm text-muted-foreground">
            This firm requires single sign-on. Enter your work email to continue.
          </p>
          {emailField}
          <Button type="submit" className="w-full" disabled={ssoPending}>
            {ssoPending ? 'Redirecting...' : 'Continue with SSO'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  // No usable login method is configured (password disabled, SSO unavailable).
  if (!passwordLogin && !ssoLogin) {
    return (
      <AuthLayout title="Log in" description={`Log in to ${firmName}.`} switcher={switcher}>
        <Alert>
          <CircleWarning size={16} />
          <AlertTitle>No login method available</AlertTitle>
          <AlertDescription>
            Password and single sign-on are both disabled. Contact your firm admin.
          </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <AuthLayout
      title="Log in"
      description={`Log in to ${firmName}.`}
      footer={errorAlert}
      switcher={switcher}
    >
      {bothMethods ? (
        <div
          role="tablist"
          aria-label="Login method"
          className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/50 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'email'}
            className={tabClass(mode === 'email')}
            onClick={() => {
              setMode('email');
              setError(null);
              form.clearErrors();
            }}
          >
            Email
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sso'}
            className={tabClass(mode === 'sso')}
            onClick={() => {
              setMode('sso');
              setError(null);
              form.clearErrors();
            }}
          >
            SSO
          </button>
        </div>
      ) : null}

      {showSsoForm ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSso();
          }}
          noValidate
        >
          <p className="text-sm text-muted-foreground">
            {ssoRequired
              ? 'This firm requires single sign-on. Enter your work email to continue.'
              : "Enter your work email and we'll redirect you to your identity provider."}
          </p>
          {emailField}
          <Button type="submit" className="w-full" disabled={ssoPending}>
            {ssoPending ? 'Redirecting...' : 'Continue with SSO'}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {emailField}
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
      )}
    </AuthLayout>
  );
}
