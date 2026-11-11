import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Required')
    .email('Invalid email format'),
  password: z.string().min(1, 'Required'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Required')
    .email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;

export const setupFirmFormSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  slug: z.string().trim().toLowerCase().max(63).optional(),
  role: z.string().trim().min(1).optional(),
  primaryLanguage: z.enum(['en']),
  jurisdiction: z.string().trim().min(2, 'Required').max(8),
  timezone: z.string().trim().min(1, 'Required'),
});

export type SetupFirmFormValues = z.infer<typeof setupFirmFormSchema>;