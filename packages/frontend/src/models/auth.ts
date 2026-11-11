import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Wajib diisi')
    .email('Format email tidak valid'),
  password: z.string().min(1, 'Wajib diisi'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z.object({
  name: z.string().trim().min(1, 'Wajib diisi').max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Wajib diisi')
    .email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;

export const setupFirmFormSchema = z.object({
  name: z.string().trim().min(1, 'Wajib diisi'),
  slug: z.string().trim().toLowerCase().max(63).optional(),
  role: z.string().trim().min(1).optional(),
  primaryLanguage: z.enum(['id', 'en']),
  jurisdiction: z.string().trim().min(2, 'Wajib diisi').max(8),
  timezone: z.string().trim().min(1, 'Wajib diisi'),
});

export type SetupFirmFormValues = z.infer<typeof setupFirmFormSchema>;