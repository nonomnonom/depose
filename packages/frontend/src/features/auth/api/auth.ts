import { api } from '~/lib/api/client';

export async function signInEmail(email: string, password: string): Promise<void> {
  await api.post('/api/auth/sign-in/email', { email, password });
}

export async function signUpEmail(name: string, email: string, password: string): Promise<void> {
  await api.post('/api/auth/sign-up/email', { name, email, password });
}

export async function signOut(): Promise<void> {
  await api.post('/api/auth/sign-out');
}