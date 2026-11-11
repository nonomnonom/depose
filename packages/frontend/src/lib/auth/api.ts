import { api } from '~/lib/api/client';

interface SignInInput {
  email: string;
  password: string;
}

interface SignUpInput extends SignInInput {
  name: string;
}

export async function signInWithEmail(input: SignInInput): Promise<void> {
  await api.post('/api/auth/sign-in/email', {
    email: input.email,
    password: input.password,
    rememberMe: true,
  });
}

export async function signUpWithEmail(input: SignUpInput): Promise<void> {
  await api.post('/api/auth/sign-up/email', {
    name: input.name,
    email: input.email,
    password: input.password,
  });
}

interface SsoRedirect {
  url: string;
  redirect?: boolean;
}

export async function signInWithSso(email: string): Promise<void> {
  const result = await api.post<SsoRedirect>('/api/auth/sign-in/sso', {
    email,
    callbackURL: `${window.location.origin}/matters`,
  });
  if (!result?.url) {
    throw new Error('SSO provider did not return a redirect URL.');
  }
  window.location.assign(result.url);
}

export async function updateProfile(input: { name: string }): Promise<void> {
  await api.post('/api/auth/update-user', { name: input.name });
}

export async function signOut(): Promise<void> {
  await api.post('/api/auth/sign-out', {});
}
