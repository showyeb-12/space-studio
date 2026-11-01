import bcrypt from "bcryptjs";
import { isTest } from "../config/env";

const saltRounds = isTest ? 4 : 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
