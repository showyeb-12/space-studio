import { ObjectId } from "mongodb";
import { env } from "../config/env";
import {
  connectDB,
  getBookings,
  getStudios,
  getUsers,
  getWishlists,
} from "../db/mongo";
import type { BookingStatus } from "../constants/bookings";
import type { StudioCategory } from "../constants/studios";
import { timeToMinutes } from "../schemas/booking.schema";
import { hashPassword } from "../lib/password";
import type {
  BookingDoc,
  ReviewDoc,
  StudioDoc,
} from "../types/models";

interface SeedUser {
  name: string;
  email: string;
  photoURL: string;
}

interface SeedStudioInput {
  title: string;
  category: StudioCategory;
  hourlyRate: number;
  securityDeposit: number;
  capacity: number;
  location: string;
  imageUrl: string;
  gallery: string[];
  amenities: string[];
  overview: string;
  reviewOffset: number;
}

interface SeedBookingInput {
  studio: StudioDoc;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  note: string;
  createdDaysAgo: number;
}

const DEMO_PASSWORD = "Studio123";

const host: SeedUser = {
  name: "Maya Chen",
  email: "host@studiospace.com",
  photoURL:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
};

const guest: SeedUser = {
  name: "Alex Rivera",
  email: "creator@studiospace.com",
  photoURL:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
};

const reviewers = [
  {
    name: "Jordan Ellis",
    photoURL:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Priya Nair",
    photoURL:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Marcus Lee",
    photoURL:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Sofia Alvarez",
    photoURL:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Devon Brooks",
    photoURL:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Nia Carter",
    photoURL:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  },
];

const reviewComments: Record<StudioCategory, string[]> = {
  "Photo Studio": [
    "The cyc wall was spotless and the lighting rig saved us an hour of setup.",
    "Natural light poured in all afternoon and the styling room was a dream.",
    "Load-in was easy, the elevator is huge, and the host answered every message fast.",
    "We shot a full lookbook here without a single lighting hiccup.",
    "The space feels bigger than the photos and the backdrop selection is excellent.",
    "Clean, quiet, and perfectly set up for a small crew.",
  ],
  "Film Stage": [
    "The stage was quiet, the power grid handled our package, and parking was simple.",
    "We built two sets in a day thanks to the generous floor plan.",
    "The green room kept our talent comfortable through a long shoot.",
    "Truck access made load-in painless for a six-person crew.",
    "Soundproofing was better than expected, even with effects playback.",
    "The host knew the space inside out and helped us plan camera positions.",
  ],
  "Podcast Lounge": [
    "The mics were already dialed in and the room sounded warm without extra processing.",
    "We recorded four episodes back to back and the setup never slowed us down.",
    "Acoustic treatment is excellent and the coffee bar kept the conversation going.",
    "The video setup made it easy to capture a clean multi-cam interview.",
    "A calm, quiet room with everything a two-person show needs.",
    "The host shared a recording checklist before we arrived. Very thoughtful.",
  ],
  "Music Suite": [
    "The console sounded incredible and the isolation booth was dead quiet.",
    "We tracked drums all day without disturbing the neighbors.",
    "The backline saved us from hauling gear across town.",
    "A warm room with a great piano and a comfortable lounge.",
    "The vocal booth gave us a clean take on the first pass.",
    "Easy load-in, solid power, and a host who understands session flow.",
  ],
  Workshop: [
    "The work tables were sturdy, the ventilation was strong, and cleanup was simple.",
    "Our group of twelve had plenty of room and every tool we needed.",
    "The kiln was ready to go and the host walked us through safety in minutes.",
    "Great natural light for a printmaking session with a full class.",
    "The sink station and storage made a messy process feel organized.",
    "A welcoming space that worked perfectly for our weekend workshop.",
  ],
};

const ratingSets = [
  [5, 5, 5],
  [5, 4.8, 4.9],
  [4.9, 4.7, 5],
  [5, 4.6, 4.8],
  [4.8, 5, 4.9],
  [5, 4.9, 4.7],
];

const galleryPool = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
];

const studioInputs: SeedStudioInput[] = [
  {
    title: "The Daylight Cyc Loft",
    category: "Photo Studio",
    hourlyRate: 95,
    securityDeposit: 250,
    capacity: 12,
    location: "Arts District, Los Angeles, CA",
    imageUrl:
      "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[0] ?? "", galleryPool[2] ?? ""],
    amenities: ["Cyc Wall", "Profoto Lighting", "Green Room", "Freight Elevator", "Wi-Fi"],
    overview:
      "A sun-washed loft built around a full white cyclorama, with a dedicated lighting grid and a private styling room for editorial crews.",
    reviewOffset: 0,
  },
  {
    title: "Neon Backlot Stage",
    category: "Film Stage",
    hourlyRate: 180,
    securityDeposit: 500,
    capacity: 40,
    location: "Burbank, CA",
    imageUrl:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[1] ?? "", galleryPool[3] ?? ""],
    amenities: ["Soundproofing", "Truck Parking", "Lighting Grid", "Green Room", "Hair & Makeup"],
    overview:
      "A blackout film stage with a reinforced power grid, drive-on access, and enough room for two standing sets without compromise.",
    reviewOffset: 1,
  },
  {
    title: "Quiet Wave Podcast Lounge",
    category: "Podcast Lounge",
    hourlyRate: 55,
    securityDeposit: 100,
    capacity: 4,
    location: "Williamsburg, Brooklyn, NY",
    imageUrl:
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[4] ?? "", galleryPool[2] ?? ""],
    amenities: ["Shure Mics", "Acoustic Panels", "Wi-Fi", "Coffee Bar"],
    overview:
      "A compact, acoustically treated podcast room with broadcast mics, clean video framing, and a relaxed lounge for two to four hosts.",
    reviewOffset: 2,
  },
  {
    title: "Analog Room Music Suite",
    category: "Music Suite",
    hourlyRate: 85,
    securityDeposit: 200,
    capacity: 6,
    location: "East Austin, TX",
    imageUrl:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[5] ?? "", galleryPool[1] ?? ""],
    amenities: ["Vintage Console", "Isolation Booth", "Backline", "Wi-Fi"],
    overview:
      "A warm recording suite centered on a vintage console, with a silent isolation booth and a backline ready for full-band sessions.",
    reviewOffset: 3,
  },
  {
    title: "Clay & Light Workshop",
    category: "Workshop",
    hourlyRate: 65,
    securityDeposit: 120,
    capacity: 14,
    location: "Silver Lake, Los Angeles, CA",
    imageUrl:
      "https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[2] ?? "", galleryPool[0] ?? ""],
    amenities: ["Pottery Wheels", "Kiln", "Sink Station", "Aprons"],
    overview:
      "A hands-on ceramics workshop with eight wheels, a ready-to-fire kiln, deep sinks, and generous work tables for small classes.",
    reviewOffset: 4,
  },
  {
    title: "Golden Hour Studio",
    category: "Photo Studio",
    hourlyRate: 110,
    securityDeposit: 300,
    capacity: 10,
    location: "SoHo, New York, NY",
    imageUrl:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[1] ?? "", galleryPool[4] ?? ""],
    amenities: ["Natural Light", "Seamless Backdrops", "Styling Rack", "Wi-Fi"],
    overview:
      "A top-floor portrait studio with west-facing windows, seamless paper backdrops, and a compact styling station for fashion teams.",
    reviewOffset: 5,
  },
  {
    title: "Soundstage 12",
    category: "Film Stage",
    hourlyRate: 220,
    securityDeposit: 750,
    capacity: 60,
    location: "Atlanta, GA",
    imageUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[3] ?? "", galleryPool[5] ?? ""],
    amenities: ["Cyc Wall", "Camera Package", "Truck Parking", "Green Room", "Elevator"],
    overview:
      "A full-scale soundstage with a wrap-around cyc, house camera package, and a green room that comfortably holds a large cast.",
    reviewOffset: 6,
  },
  {
    title: "The Mic Drop Room",
    category: "Podcast Lounge",
    hourlyRate: 60,
    securityDeposit: 100,
    capacity: 5,
    location: "Capitol Hill, Seattle, WA",
    imageUrl:
      "https://images.unsplash.com/photo-1589903308904-1010c2294adc?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[0] ?? "", galleryPool[3] ?? ""],
    amenities: ["4 Mic Setup", "Riverside Recording", "Acoustic Foam", "Wi-Fi"],
    overview:
      "A ready-to-record podcast lounge with four dynamic mics, remote recording support, and soft acoustic treatment on every wall.",
    reviewOffset: 7,
  },
  {
    title: "Velvet Frequency Suite",
    category: "Music Suite",
    hourlyRate: 130,
    securityDeposit: 300,
    capacity: 8,
    location: "Nashville, TN",
    imageUrl:
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[5] ?? "", galleryPool[2] ?? ""],
    amenities: ["Grand Piano", "Vocal Booth", "Drum Kit", "Lounge"],
    overview:
      "A characterful music suite with a tuned grand piano, isolated vocal booth, house drum kit, and a lounge built for long sessions.",
    reviewOffset: 8,
  },
  {
    title: "The Print Lab",
    category: "Workshop",
    hourlyRate: 75,
    securityDeposit: 150,
    capacity: 12,
    location: "Portland, OR",
    imageUrl:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[4] ?? "", galleryPool[1] ?? ""],
    amenities: ["Screen Printing", "Darkroom", "Work Tables", "Ventilation"],
    overview:
      "A printmaking workshop with screen-printing stations, a working darkroom, and ventilation that keeps long production days comfortable.",
    reviewOffset: 9,
  },
  {
    title: "White Wall Photo Hall",
    category: "Photo Studio",
    hourlyRate: 140,
    securityDeposit: 350,
    capacity: 16,
    location: "Chelsea, New York, NY",
    imageUrl:
      "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[3] ?? "", galleryPool[0] ?? ""],
    amenities: ["White Cyc", "Blackout Curtains", "Lighting Rig", "Makeup Room"],
    overview:
      "A gallery-scale photo hall with a seamless white cyc, blackout capability, and a full lighting package for campaign work.",
    reviewOffset: 10,
  },
  {
    title: "Hangar Film Works",
    category: "Film Stage",
    hourlyRate: 260,
    securityDeposit: 900,
    capacity: 80,
    location: "Santa Clarita, CA",
    imageUrl:
      "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[2] ?? "", galleryPool[5] ?? ""],
    amenities: ["Drive-On Stage", "Scissor Lifts", "Power Grid", "Parking Lot", "Green Room"],
    overview:
      "A drive-on production hangar with high ceilings, scissor lifts, three-phase power, and room for vehicles and large builds.",
    reviewOffset: 11,
  },
  {
    title: "The Listening Room",
    category: "Podcast Lounge",
    hourlyRate: 70,
    securityDeposit: 120,
    capacity: 6,
    location: "Chicago, IL",
    imageUrl:
      "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[1] ?? "", galleryPool[4] ?? ""],
    amenities: ["Mixing Desk", "Acoustic Treatment", "Video Setup", "Wi-Fi"],
    overview:
      "A producer-friendly podcast room with a compact mixing desk, treated walls, and a three-camera video setup for recorded interviews.",
    reviewOffset: 12,
  },
  {
    title: "Basement Bass Studio",
    category: "Music Suite",
    hourlyRate: 95,
    securityDeposit: 220,
    capacity: 7,
    location: "Detroit, MI",
    imageUrl:
      "https://images.unsplash.com/photo-1519508234439-4f23643125c1?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[0] ?? "", galleryPool[5] ?? ""],
    amenities: ["Live Room", "Vocal Booth", "Analog Synths", "Lounge"],
    overview:
      "A low-lit music suite with a lively tracking room, a tight vocal booth, and a collection of analog synths ready to patch in.",
    reviewOffset: 13,
  },
  {
    title: "Studio Bloom Photo Garden",
    category: "Photo Studio",
    hourlyRate: 105,
    securityDeposit: 280,
    capacity: 10,
    location: "Topanga, CA",
    imageUrl:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80",
    gallery: [galleryPool[4] ?? "", galleryPool[2] ?? ""],
    amenities: ["Outdoor Set", "Natural Light", "Prop Closet", "Parking"],
    overview:
      "A garden-side photo studio with an outdoor set, soft canyon light, and a prop closet stocked for lifestyle and brand shoots.",
    reviewOffset: 14,
  },
];

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function dateFromNow(days: number): string {
  return daysFromNow(days).toISOString().slice(0, 10);
}

function buildReviews(
  category: StudioCategory,
  offset: number,
): ReviewDoc[] {
  const ratings = ratingSets[offset % ratingSets.length] ?? [5, 5, 5];
  const comments = reviewComments[category];

  return ratings.map((rating, index) => {
    const reviewer = reviewers[(offset + index) % reviewers.length];
    const comment = comments[(offset + index) % comments.length];

    return {
      id: new ObjectId().toHexString(),
      name: reviewer?.name ?? "StudioSpace member",
      photoURL: reviewer?.photoURL ?? null,
      rating,
      comment: comment ?? "A well-equipped space that matched the listing.",
      createdAt: daysFromNow(-(offset + index + 4)),
    };
  });
}

function buildStudio(
  input: SeedStudioInput,
  owner: SeedUser,
  index: number,
): StudioDoc {
  const reviews = buildReviews(input.category, input.reviewOffset);
  const rating =
    Math.round(
      (reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length) *
        10,
    ) / 10;
  const now = new Date();

  return {
    _id: new ObjectId(),
    title: input.title,
    category: input.category,
    hourlyRate: input.hourlyRate,
    securityDeposit: input.securityDeposit,
    capacity: input.capacity,
    location: input.location,
    imageUrl: input.imageUrl,
    gallery: Array.from(
      new Set([input.imageUrl, ...input.gallery].filter(Boolean)),
    ),
    amenities: input.amenities,
    overview: input.overview,
    ownerEmail: owner.email,
    ownerName: owner.name,
    ownerPhoto: owner.photoURL,
    rating,
    reviewCount: reviews.length,
    reviews,
    createdAt: daysFromNow(-index),
    updatedAt: now,
  };
}

function buildBooking(
  input: SeedBookingInput,
  guestUser: SeedUser,
): BookingDoc {
  const hours =
    (timeToMinutes(input.endTime) - timeToMinutes(input.startTime)) / 60;
  const totalPrice =
    Math.round(hours * input.studio.hourlyRate * 100) / 100;
  const createdAt = daysFromNow(-input.createdDaysAgo);

  return {
    _id: new ObjectId(),
    studioId: input.studio._id,
    studioTitle: input.studio.title,
    studioImage: input.studio.imageUrl,
    ownerEmail: input.studio.ownerEmail,
    guestEmail: guestUser.email,
    guestName: guestUser.name,
    guestPhoto: guestUser.photoURL,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    hours,
    totalPrice,
    securityDeposit: input.studio.securityDeposit,
    note: input.note,
    status: input.status,
    createdAt,
    updatedAt: createdAt,
    cancelledAt:
      input.status === "Cancelled" ? daysFromNow(-1) : null,
  };
}

export interface SeedOptions {
  log?: boolean;
}

export async function seedDatabase(
  options: SeedOptions = {},
): Promise<void> {
  const log = options.log ?? true;

  if (env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    throw new Error(
      "Refusing to seed a production database. Set ALLOW_SEED=true to override.",
    );
  }

  await connectDB();

  const users = await getUsers();
  const studios = await getStudios();
  const bookings = await getBookings();
  const wishlists = await getWishlists();
  const demoEmails = [host.email, guest.email];

  const existingStudios = await studios
    .find({ ownerEmail: { $in: demoEmails } })
    .project({ _id: 1 })
    .toArray();
  const existingIds = existingStudios.map((studio) => studio._id);

  await bookings.deleteMany({
    $or: [
      { studioId: { $in: existingIds } },
      { guestEmail: { $in: demoEmails } },
    ],
  });
  await studios.deleteMany({ ownerEmail: { $in: demoEmails } });
  await wishlists.deleteMany({ userEmail: { $in: demoEmails } });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();

  for (const demoUser of [host, guest]) {
    await users.updateOne(
      { email: demoUser.email },
      {
        $set: {
          name: demoUser.name,
          email: demoUser.email,
          photoURL: demoUser.photoURL,
          passwordHash,
          provider: "credentials",
          googleId: null,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  const seededStudios = studioInputs.map((input, index) =>
    buildStudio(input, index % 2 === 0 ? host : guest, index),
  );

  await studios.insertMany(seededStudios);

  const confirmedStudio = seededStudios[0];
  const pendingStudio = seededStudios[2];
  const completedStudio = seededStudios[4];
  const cancelledStudio = seededStudios[6];

  if (
    !confirmedStudio ||
    !pendingStudio ||
    !completedStudio ||
    !cancelledStudio
  ) {
    throw new Error("Seed studio definitions are incomplete.");
  }

  const seededBookings = [
    buildBooking(
      {
        studio: confirmedStudio,
        date: dateFromNow(7),
        startTime: "14:00",
        endTime: "16:00",
        status: "Confirmed",
        note: "Two-camera product shoot with a small crew.",
        createdDaysAgo: 3,
      },
      guest,
    ),
    buildBooking(
      {
        studio: pendingStudio,
        date: dateFromNow(9),
        startTime: "10:00",
        endTime: "12:00",
        status: "Pending",
        note: "First episode of a new interview series.",
        createdDaysAgo: 1,
      },
      guest,
    ),
    buildBooking(
      {
        studio: completedStudio,
        date: dateFromNow(-21),
        startTime: "09:00",
        endTime: "11:00",
        status: "Completed",
        note: "Weekend ceramics class for eight students.",
        createdDaysAgo: 35,
      },
      guest,
    ),
    buildBooking(
      {
        studio: cancelledStudio,
        date: dateFromNow(12),
        startTime: "16:00",
        endTime: "18:00",
        status: "Cancelled",
        note: "Production schedule changed before the shoot.",
        createdDaysAgo: 5,
      },
      guest,
    ),
  ];

  await bookings.insertMany(seededBookings);

  const wishlistStudios = [seededStudios[1], seededStudios[3]].filter(
    (studio): studio is StudioDoc => Boolean(studio),
  );

  await wishlists.insertMany(
    wishlistStudios.map((studio) => ({
      _id: new ObjectId(),
      userEmail: guest.email,
      studioId: studio._id,
      createdAt: now,
    })),
  );

  if (log) {
    console.log("Demo data seeded successfully.");
    console.log(`Users: ${demoEmails.length}`);
    console.log(`Studios: ${seededStudios.length}`);
    console.log(`Bookings: ${seededBookings.length}`);
    console.log(`Saved studios: ${wishlistStudios.length}`);
    console.log(`Host login: ${host.email} / ${DEMO_PASSWORD}`);
    console.log(`Guest login: ${guest.email} / ${DEMO_PASSWORD}`);
  }
}
