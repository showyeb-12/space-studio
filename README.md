# StudioSpace API

The Express and MongoDB backend for StudioSpace, a peer-to-peer marketplace where creators list, discover, and book production studios, photo spaces, podcast rooms, music suites, and workshops.

This repository contains the REST API. The Next.js client lives in the separate `client` repository.

## Highlights

- Credentials authentication with bcrypt password hashing and a signed JWT stored in an HTTPOnly cookie
- Google sign-in through server-side Google ID-token verification
- Owner-protected studio CRUD with server-derived host identity
- Studio search, category and price filters, sorting, pagination, and a six-item featured endpoint
- Booking creation with server-calculated totals and time-overlap prevention
- Pending booking cancellation with ownership checks
- Saved-studios wishlist stored per user in MongoDB
- ImgBB image upload proxying with file type and 5 MB size validation
- Zod validation, Helmet, CORS allowlisting, rate limiting, and centralized JSON errors
- 64 automated tests covering auth, studios, bookings, wishlist, uploads, and seed data

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Language | TypeScript |
| Database | MongoDB Atlas with the native MongoDB driver |
| Authentication | bcryptjs, jsonwebtoken, HTTPOnly cookies |
| Google | google-auth-library |
| Validation | Zod |
| Uploads | Multer 2 and the ImgBB API |
| Testing | Vitest, Supertest, mongodb-memory-server |

## Project structure

```text
server/
├── src/
│   ├── config/          # validated environment configuration
│   ├── constants/       # studio categories and booking statuses
│   ├── db/              # MongoDB connection, indexes, collection helpers
│   ├── lib/             # cookies, JWT, and password utilities
│   ├── middleware/      # auth guard, rate limiting, error handling
│   ├── routes/          # auth, studios, bookings, uploads, wishlist, health
│   ├── schemas/         # Zod request schemas
│   ├── scripts/         # seed data and CLI entry point
│   ├── types/           # document and public DTO types
│   ├── utils/           # AppError, async handler, ObjectId parsing
│   ├── app.ts
│   └── server.ts
├── tests/               # unit, route, integration, and seed tests
├── .env.example
└── package.json
```

## Local setup

1. Open a terminal in the `server` directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create the environment file:

   ```bash
   cp .env.example .env
   ```

4. Fill in `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, and `IMGBB_API_KEY`. Use a random JWT secret of at least 32 characters.
5. Seed the demo database:

   ```bash
   npm run seed
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Confirm the API is running at `http://localhost:5000/api/health`.

The client should point its API proxy at `http://localhost:5000`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `PORT` | No | API port, default `5000` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB` | No | Database name, default `studiospace` |
| `JWT_SECRET` | Yes | JWT signing secret, minimum 32 characters |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `7d` |
| `COOKIE_NAME` | No | Auth cookie name, default `ss_token` |
| `CLIENT_URL` | Yes | Allowed client origin for CORS |
| `GOOGLE_CLIENT_ID` | No | Enables Google sign-in |
| `IMGBB_API_KEY` | No | Enables image uploads |
| `ALLOW_SEED` | No | Set to `true` to allow seeding in production |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the API with tsx watch mode |
| `npm run build` | Compile TypeScript to `dist` |
| `npm start` | Run the compiled API |
| `npm run typecheck` | Run TypeScript without emitting |
| `npm test` | Run all 64 tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run seed` | Reset demo data and insert seeded records |

## API routes

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Database ping and uptime |
| `POST` | `/api/auth/register` | Public | Create an account |
| `POST` | `/api/auth/login` | Public | Sign in and set the auth cookie |
| `POST` | `/api/auth/google` | Public | Verify a Google credential and sign in |
| `POST` | `/api/auth/logout` | Public | Clear the auth cookie |
| `GET` | `/api/auth/me` | Auth | Restore the current session |
| `GET` | `/api/studios` | Public | Search, filter, sort, and paginate studios |
| `GET` | `/api/studios/featured` | Public | Six top-rated studios |
| `GET` | `/api/studios/mine` | Auth | Listings owned by the current user |
| `GET` | `/api/studios/:id` | Public | Studio details |
| `POST` | `/api/studios` | Auth | Create a studio listing |
| `PATCH` | `/api/studios/:id` | Owner | Update a listing |
| `DELETE` | `/api/studios/:id` | Owner | Delete a listing |
| `POST` | `/api/bookings` | Auth | Request a reservation |
| `GET` | `/api/bookings/mine` | Auth | Current user's reservations |
| `PATCH` | `/api/bookings/:id/cancel` | Owner | Cancel a pending reservation |
| `GET` | `/api/wishlist` | Auth | Saved studios |
| `GET` | `/api/wishlist/ids` | Auth | Saved studio ids for heart states |
| `POST` | `/api/wishlist/:studioId` | Auth | Toggle a saved studio |
| `POST` | `/api/uploads` | Auth | Upload an image to ImgBB |

Studio list query parameters: `category`, `search`, `minRate`, `maxRate`, `sort` (`newest`, `rating`, `price-asc`, `price-desc`), `page`, and `limit`.

## Authentication and security

- JWTs are signed with `JWT_SECRET` and stored in an HTTPOnly, SameSite=Lax cookie. Cookies are marked `Secure` in production.
- Mutating studio endpoints, bookings, wishlist endpoints, and uploads require a valid token and return `401 Unauthorized` without one.
- Host identity is always read from the JWT. Client-submitted owner fields are ignored.
- Studio updates and deletes return `403` when the authenticated user does not own the listing.
- Passwords require at least one uppercase letter, one lowercase letter, and six characters.
- Auth endpoints are rate limited separately from the rest of the API.
- Unknown origins are rejected by CORS.
- No email verification or password-reset flow is included, by assignment design.

## Booking conflict prevention

Before inserting a reservation, the API checks MongoDB for an overlapping reservation in the same studio and date:

```js
{
  studioId,
  date,
  status: { $in: ["Confirmed", "Pending"] },
  startTime: { $lt: newEndTime },
  endTime: { $gt: newStartTime }
}
```

A collision returns `409` with code `BOOKING_CONFLICT` and a readable message. Cancelled bookings do not block a slot.

## Demo data and examiner credentials

`npm run seed` creates 15 studios, embedded reviews, four bookings covering every status, and two saved studios.

| Role | Email | Password |
|---|---|---|
| Host | `host@studiospace.com` | `Studio123` |
| Guest creator | `creator@studiospace.com` | `Studio123` |

The guest account owns one booking in each status, making the My Bookings UI easy to inspect.

The seed also creates a confirmed booking on **The Daylight Cyc Loft** for the date seven days after seeding, from **14:00 to 16:00**. Sign in as the guest, note that date in My Bookings, then try to book the same studio from **15:00 to 17:00** to see the `409` conflict response.

## Deployment on Render

1. Create a Render Web Service from this repository.
2. Set the root directory to `server` if the repository contains both apps.
3. Build command: `npm install && npm run build`.
4. Start command: `npm start`.
5. Add all production environment variables, including `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `CLIENT_URL`, `GOOGLE_CLIENT_ID`, and `IMGBB_API_KEY`.
6. Allow Render's outbound connections in MongoDB Atlas network access.
7. Run `npm run seed` once from a trusted local environment if you want demo data. Never set `ALLOW_SEED=true` permanently.
8. Add the deployed client origin to Google OAuth authorized JavaScript origins.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The suite currently reports 64 passing tests and no npm audit vulnerabilities.
