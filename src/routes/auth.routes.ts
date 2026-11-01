import { Router } from "express";
import { ObjectId } from "mongodb";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { env } from "../config/env";
import { getUsers } from "../db/mongo";
import { clearAuthCookie, setAuthCookie } from "../lib/cookies";
import { signAuthToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { requireAuth } from "../middleware/requireAuth";
import {
  googleSchema,
  loginSchema,
  registerSchema,
} from "../schemas/auth.schema";
import {
  toPublicUser,
  type NewUser,
  type UserDoc,
} from "../types/models";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const users = await getUsers();

    const existing = await users.findOne({ email: input.email });
    if (existing) {
      throw new AppError(
        409,
        "An account with this email already exists.",
        "EMAIL_IN_USE",
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(input.password);

    const newUser: NewUser = {
      name: input.name,
      email: input.email,
      photoURL: input.photoURL,
      passwordHash,
      provider: "credentials",
      googleId: null,
      createdAt: now,
      updatedAt: now,
    };

    const createdUser: UserDoc = { _id: new ObjectId(), ...newUser };
    await users.insertOne(createdUser);

    res.status(201).json({
      success: true,
      message: "Account created successfully. Please sign in.",
      data: { user: toPublicUser(createdUser) },
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const users = await getUsers();

    const user = await users.findOne({ email: input.email });
    if (!user) {
      throw new AppError(
        401,
        "Invalid email or password.",
        "INVALID_CREDENTIALS",
      );
    }

    if (!user.passwordHash) {
      throw new AppError(
        401,
        "This account uses Google sign-in. Continue with Google instead.",
        "GOOGLE_ACCOUNT",
      );
    }

    const passwordMatches = await verifyPassword(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new AppError(
        401,
        "Invalid email or password.",
        "INVALID_CREDENTIALS",
      );
    }

    const token = signAuthToken({
      sub: user._id.toHexString(),
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
    });

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Signed in successfully.",
      data: { user: toPublicUser(user) },
    });
  }),
);

router.post(
  "/google",
  asyncHandler(async (req, res) => {
    const input = googleSchema.parse(req.body);
    console.log("DEBUG: GOOGLE_CLIENT_ID =", env.GOOGLE_CLIENT_ID, "type =", typeof env.GOOGLE_CLIENT_ID);
    console.log("DEBUG: !env.GOOGLE_CLIENT_ID =", !env.GOOGLE_CLIENT_ID);

    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(
        503,
        "Google sign-in is not configured on this server.",
        "GOOGLE_NOT_CONFIGURED",
      );
    }

    const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

    let payload: TokenPayload | undefined;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(
        401,
        "Google sign-in could not be verified. Please try again.",
        "GOOGLE_VERIFICATION_FAILED",
      );
    }

    if (!payload?.email) {
      throw new AppError(
        401,
        "Your Google account email could not be verified.",
        "GOOGLE_EMAIL_UNVERIFIED",
      );
    }

    const email = payload.email.toLowerCase();
    const users = await getUsers();
    const existing = await users.findOne({ email });
    const now = new Date();
    const name =
      payload.name?.trim() || email.split("@")[0] || "StudioSpace member";

    let user: UserDoc | null;

    if (existing) {
      const updated = await users.findOneAndUpdate(
        { _id: existing._id },
        {
          $set: {
            name,
            photoURL: payload.picture ?? existing.photoURL,
            googleId: payload.sub,
            provider: existing.passwordHash ? existing.provider : "google",
            updatedAt: now,
          },
        },
        { returnDocument: "after" },
      );

      user = updated ?? existing;
    } else {
      const newUser: NewUser = {
        name,
        email,
        photoURL: payload.picture ?? null,
        passwordHash: null,
        provider: "google",
        googleId: payload.sub,
        createdAt: now,
        updatedAt: now,
      };

      user = { _id: new ObjectId(), ...newUser };
      await users.insertOne(user);
    }

    if (!user) {
      throw new AppError(
        500,
        "Your account could not be prepared. Please try again.",
        "ACCOUNT_SETUP_FAILED",
      );
    }

    const token = signAuthToken({
      sub: user._id.toHexString(),
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
    });

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Signed in with Google successfully.",
      data: { user: toPublicUser(user) },
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user || !ObjectId.isValid(req.user.id)) {
      clearAuthCookie(res);
      throw new AppError(
        401,
        "Invalid session. Please sign in again.",
        "INVALID_SESSION",
      );
    }

    const users = await getUsers();
    const user = await users.findOne({ _id: new ObjectId(req.user.id) });

    if (!user) {
      clearAuthCookie(res);
      throw new AppError(
        401,
        "Your account could not be found. Please sign in again.",
        "ACCOUNT_NOT_FOUND",
      );
    }

    res.status(200).json({
      success: true,
      message: "Session is active.",
      data: { user: toPublicUser(user) },
    });
  }),
);

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: "Signed out successfully.",
    data: null,
  });
});

export default router;
