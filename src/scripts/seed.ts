import { closeDB } from "../db/mongo";
import { seedDatabase } from "./seed-database";

async function run(): Promise<void> {
  try {
    await seedDatabase();
  } finally {
    await closeDB();
  }
}

run().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
