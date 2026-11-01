import type { ObjectId } from "mongodb";

export interface WishlistDoc {
  _id: ObjectId;
  userEmail: string;
  studioId: ObjectId;
  createdAt: Date;
}
