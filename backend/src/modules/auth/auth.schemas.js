import { z } from 'zod';

const passwordBytesSchema = z
  .string()
  .min(1)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must be at most 72 UTF-8 bytes',
  );
const passwordSchema = passwordBytesSchema.min(12);
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z.object({ email: emailSchema, password: passwordBytesSchema }).strict();
export const changePasswordSchema = z
  .object({
    currentPassword: passwordBytesSchema,
    newPassword: passwordSchema,
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'New password must differ from current password',
  });
