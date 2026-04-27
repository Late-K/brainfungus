# Brain Fungus

Brain Fungus is a band management web app built for musicians. It gives bands a single place to manage songs and setlists, schedule rehearsals, track each member's song-learning progress, and chat with one another.

---

## Core Features

| Feature       | Description                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Bands         | Create or join bands with role-based access (creator, admin, member)                                                |
| Custom Songs  | Add band-specific songs and albums with audio                                                                       |
| Covers        | Search and save cover songs via the Deezer API                                                                      |
| Setlists      | Build ordered setlists from custom songs and covers                                                                 |
| Song Learning | Mark songs as learnt - bands showing completion percentage                                                          |
| Rehearsals    | Schedule one-time, weekly, or biweekly rehearsals and see who is available for them                                 |
| Calendar      | Visual calendar of all upcoming rehearsals across every band the user belongs to                                    |
| Band Chat     | Perband simple messaging capabilities                                                                               |
| Profile       | "Always available" toggle that auto-marks availability for rehearsals and a place to see all songs marked as learnt |

---

## Tech Stack

- Next.js
- React
- MongoDB
- NextAuth - Google OAuth with JWT sessions
- Deezer API
- Vercel (hosting)

### MongoDB Collections

`users`, `bands`, `songs`, `covers`, `setlists`, `learnt-songs`, `rehearsals`, `rehearsal-availability`, `messages`

---

## Setup & Running

### Prerequisites

- Node.js 18+
- A MongoDB database
- A Google OAuth application (Client ID + Secret)

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
```

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
├── api/          # REST-style Next.js route handlers
├── actions/      # Server actions (bands, songs, setlists, rehearsals, …)
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks (data fetching, page logic)
├── lib/          # Core utilities: auth, DB connection, setlist/rehearsal logic
└── types/        # Shared TypeScript types
```

---

## Technical Notes

- Auth — NextAuth `signIn` callback upserts the user into MongoDB on every login. `getAuthUser()` validates the session and returns `{ db, user, session }` for use in server actions.
- DB — `MongoClient` is cached on the Node.js global in development to survive hot-reloads. All modules access it via `getDb()`.
- Authorisation — `requireBandMemberContext(bandId)` combines session validation and band membership into one call for user auth.
- Rehearsal recurrence — Rehearsals store an anchor date, `repeatType` (`once` / `weekly` / `biweekly`) and optional `endDate`, with all complicated occurance computation and calls happening in the background at runtime.
- Setlists — Songs are stored as minimal references, setlists are set active to display on band dashboard and song learning is tracked in a separate `learnt-songs` collection for globalisation.
- Band roles — `creator` / `admin` / `member` roles. Band deletion cascades to all dependent collections.
- Deezer — Two Next.js route handlers (`/api/deezer/search` and `/api/deezer/track/[id]`) forward requests to the public Deezer API. Results are not cached; saving a result persists it as `BandCover` in MongoDB.
- Modularity — UI is split into focused single-purpose components. Large page logic lives in dedicated hooks, keeping components thin. Shared utilities are reused across both components and server actions.
