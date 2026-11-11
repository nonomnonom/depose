import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
    email: z.string().trim().email('Invalid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
