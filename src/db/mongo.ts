import { MongoClient, type Collection, type Db } from "mongodb";
import { env } from "../config/env";
import type { BookingDoc, StudioDoc, UserDoc } from "../types/models";
import type { WishlistDoc } from "../types/wishlist";

let client: MongoClient | null = null;
let database: Db | null = null;
let connection: Promise<Db> | null = null;

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db
      .collection<UserDoc>("users")
      .createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
    db
      .collection<StudioDoc>("studios")
      .createIndex({ category: 1 }, { name: "studios_category_idx" }),
    db
      .collection<StudioDoc>("studios")
      .createIndex({ ownerEmail: 1 }, { name: "studios_owner_email_idx" }),
    db
      .collection<StudioDoc>("studios")
      .createIndex({ createdAt: -1 }, { name: "studios_created_at_idx" }),
    db
      .collection<StudioDoc>("studios")
      .createIndex({ rating: -1 }, { name: "studios_rating_idx" }),
    db
      .collection<BookingDoc>("bookings")
      .createIndex(
        { studioId: 1, date: 1, status: 1 },
        { name: "bookings_studio_date_status_idx" },
      ),
    db
      .collection<BookingDoc>("bookings")
      .createIndex(
        { guestEmail: 1, createdAt: -1 },
        { name: "bookings_guest_created_idx" },
      ),
    db.collection<WishlistDoc>("wishlists").createIndex(
      { userEmail: 1, studioId: 1 },
      { unique: true, name: "wishlists_user_studio_unique" },
    ),
    db
      .collection<WishlistDoc>("wishlists")
      .createIndex(
        { userEmail: 1, createdAt: -1 },
        { name: "wishlists_user_created_idx" },
      ),
  ]);
}

export async function connectDB(): Promise<Db> {
  if (database) {
    return database;
  }

  if (!connection) {
    connection = (async () => {
      const mongoClient = new MongoClient(env.MONGODB_URI, {
        appName: "StudioSpace",
        serverSelectionTimeoutMS: 10_000,
      });

      await mongoClient.connect();
      const db = mongoClient.db(env.MONGODB_DB);

      await ensureIndexes(db);

      client = mongoClient;
      database = db;

      return db;
    })().catch((error) => {
      connection = null;
      client = null;
      database = null;
      throw error;
    });
  }

  return connection;
}

export function getDB(): Db {
  if (!database) {
    throw new Error("Database is not connected. Call connectDB() first.");
  }
  return database;
}

export async function getUsers(): Promise<Collection<UserDoc>> {
  const db = await connectDB();
  return db.collection<UserDoc>("users");
}

export async function getStudios(): Promise<Collection<StudioDoc>> {
  const db = await connectDB();
  return db.collection<StudioDoc>("studios");
}

export async function getBookings(): Promise<Collection<BookingDoc>> {
  const db = await connectDB();
  return db.collection<BookingDoc>("bookings");
}

export async function getWishlists(): Promise<Collection<WishlistDoc>> {
  const db = await connectDB();
  return db.collection<WishlistDoc>("wishlists");
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
  }
  client = null;
  database = null;
  connection = null;
}
