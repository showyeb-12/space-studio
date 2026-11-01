import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  photoURL: string | null;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "studiospace-api",
    audience: "studiospace-client",
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: "studiospace-api",
    audience: "studiospace-client",
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.email !== "string" ||
    typeof decoded.name !== "string"
  ) {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    photoURL:
      typeof decoded.photoURL === "string" ? decoded.photoURL : null,
  };
}
