import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://127.0.0.1:27017/studiospace"),
  MONGODB_DB: z.string().min(1).default("studiospace"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long")
    .default("dev-only-studiospace-secret-change-before-production-32"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  COOKIE_NAME: z.string().min(1).default("ss_token"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  IMGBB_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

if (parsed.data.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be explicitly set in production.");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be explicitly set in production.");
  }
  if (!process.env.CLIENT_URL) {
    throw new Error("CLIENT_URL must be explicitly set in production.");
  }
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
