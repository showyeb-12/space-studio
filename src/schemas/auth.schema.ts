import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

const photoUrlSchema = z
  .union([z.string().trim().url("Photo URL must be a valid URL."), z.literal("")])
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || value.length <= 500, {
    message: "Photo URL must be 500 characters or fewer.",
  });

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long.")
    .max(80, "Name must be 80 characters or fewer."),
  email: emailSchema,
  photoURL: photoUrlSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const googleSchema = z.object({
  credential: z.string().min(10, "Google credential is required."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleInput = z.infer<typeof googleSchema>;
