# Brain Fungus

Brain Fungus is a band management web app built for musicians. It gives bands a single place to manage songs and setlists, schedule rehearsals, track each member's song-learning progress, and chat with one another.

---

## Core Features

| Feature       | Description                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Bands         | Create or join bands with role-based access (creator, admin, member)                                                |
| Custom Songs  | Add band-specific songs and albums with private Blob audio uploads                                                  |
| Covers        | Search and save cover songs via the Deezer API                                                                      |
| Setlists      | Build ordered setlists from custom songs and covers                                                                 |
| Song Learning | Mark songs as learnt - bands showing completion percentage                                                          |
| Rehearsals    | Schedule one-time, weekly, or biweekly rehearsals and see who is available for them                                 |
| Calendar      | Visual calendar of all upcoming rehearsals across every band the user belongs to                                    |
| Band Chat     | Perband simple messaging capabilities                                                                               |
| Notifications | Push notifications for upcoming rehearsals, band chat messages and active setlist changes, toggled per device |
| Profile       | "Always available" toggle that auto-marks availability for rehearsals and a place to see all songs marked as learnt |

---

## Tech Stack

- Next.js
- React
- MongoDB
- Vercel Blob
- NextAuth - Google OAuth with JWT sessions
- Deezer API
- Vercel (hosting)

### MongoDB Collections

`users`, `bands`, `custom_songs`, `covers`, `setlists`, `learnt_songs`, `rehearsals`, `rehearsal_availability`, `band_messages`, `push_subscriptions`, `rehearsal_reminders`

---

## Setup & Running

### Prerequisites

- Node.js 18+
- A MongoDB database
- A Google OAuth application (Client ID + Secret)
- A Vercel Blob

### 1. Clone the repository

```bash
git clone https://github.com/Late-K/brainfungus.git
cd brainfungus
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_mongodb_db_name
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
BLOB_READ_WRITE_TOKEN=your_vercel_blob_read_write_token
BLOB_STORE_ID=your_vercel_blob_store_id
BLOB_WEBHOOK_PUBLIC_KEY=your_vercel_blob_webhook_public_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=a_long_random_string
```

Generate the VAPID key pair with `npx web-push generate-vapid-keys`.

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with Google.

---

## Project Structure

```
src/app/
├── api/          # REST-style Next.js route handlers (reads)
├── actions/      # Server actions (writes): bands, invites, songs, setlists, rehearsals, …
├── components/   # UI components, grouped by feature
│   ├── auth/  bands/  chat/  covers/  profile/
│   ├── rehearsals/  setlists/  songs/
│   ├── layout/   # app-wide pieces: navbar, service worker, music app context
│   └── ui/       # shared building blocks: headers, loading, toggles, upload field
├── hooks/        # Custom React hooks (data fetching, page logic)
├── lib/          # Helpers safe to use in the browser: validation, formatting, rehearsal/setlist logic
│   └── server/   # Server-only code: auth, DB connection, access checks, blob storage, push
└── types/        # Shared TypeScript types
```

Files in `lib/server/` start with `import "server-only"`, so the build fails if one is ever imported into browser code.

---

## Technical Notes

- Auth - NextAuth `signIn` callback upserts the user into MongoDB on every login. `getAuthUser()` validates the session and returns `{ db, user, session }` for use in server actions.
- DB - `MongoClient` is cached on the Node.js global in development to survive hot-reloads. All modules access it via `getDb()`.
- Authorisation - `requireBandMemberContext(bandId)` combines session validation and band membership into one call for user auth.
- Rehearsal recurrence - Rehearsals store an anchor date, `repeatType` (`once` / `weekly` / `biweekly`) and optional `endDate`, with all complicated occurance computation and calls happening in the background at runtime.
- Setlists - Songs are stored as minimal references, setlists are set active to display on band dashboard and song learning is tracked in a separate `learnt-songs` collection for globalisation.
- Band roles - `creator` / `admin` / `member` roles. Band deletion cascades to all dependent collections.
- Deezer - Next.js route handlers (`/api/deezer/search`, `/api/deezer/track`, `/api/deezer/artist` and `/api/deezer/album`) forward requests to the public Deezer API. Results are not cached; saving a result persists it as `BandCover` in MongoDB.
- Modularity - UI is split into focused single-purpose components. Large page logic lives in dedicated hooks, keeping components thin. Shared utilities are reused across both components and server actions.
- Audio storage - Custom song audio files are uploaded to private Vercel Blob storage
- Push notifications - Devices opt in from the profile page and their Web Push subscriptions are stored in `push_subscriptions`. Chat messages and active setlist changes notify the rest of the band straight away (sent with `after()` so actions stay fast). Rehearsal reminders for today and tomorrow are sent by a daily Vercel cron (`vercel.json` → `/api/cron/rehearsal-reminders`, authorised with `CRON_SECRET`). Push only works in production builds, since the service worker isn't registered in dev, and on iOS only once the app is added to the Home Screen.
