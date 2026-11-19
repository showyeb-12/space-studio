import { closeDB, connectDB, getBookings, getStudios, getUsers, getWishlists } from "../db/mongo";

async function check(): Promise<void> {
  try {
    const db = await connectDB();
    await db.command({ ping: 1 });

    const usersCol = await getUsers();
    const studiosCol = await getStudios();
    const bookingsCol = await getBookings();
    const wishlistsCol = await getWishlists();

    const [usersCount, studiosCount, bookingsCount, wishlistsCount] = await Promise.all([
      usersCol.countDocuments(),
      studiosCol.countDocuments(),
      bookingsCol.countDocuments(),
      wishlistsCol.countDocuments(),
    ]);

    console.log("Database connection successful!");
    console.log(`Users: ${usersCount}`);
    console.log(`Studios: ${studiosCount}`);
    console.log(`Bookings: ${bookingsCount}`);
    console.log(`Wishlists: ${wishlistsCount}`);
  } finally {
    await closeDB();
  }
}

check().catch((error) => {
  console.error("Database check failed:", error);
  process.exitCode = 1;
});

// health check script
