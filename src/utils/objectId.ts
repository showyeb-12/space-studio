import { ObjectId } from "mongodb";
import { AppError } from "./AppError";

export function parseObjectId(value: string, label = "resource"): ObjectId {
  if (
    !ObjectId.isValid(value) ||
    new ObjectId(value).toHexString() !== value.toLowerCase()
  ) {
    throw new AppError(
      400,
      `Invalid ${label} id.`,
      "INVALID_OBJECT_ID",
    );
  }

  return new ObjectId(value);
}
