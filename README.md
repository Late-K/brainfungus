# Brain Fungus

A band management web app for musicians. Create and join bands, manage songs and setlists, schedule rehearsals, track song-learning progress, and chat with bandmates — all in one place.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, **MongoDB**, and **NextAuth.js** (Google OAuth).

---

## Project Overview

Brain Fungus is a collaborative tool for bands to organise their music and schedule. Key features include:

- **Bands** — Create or join bands with role-based access (creator, admin, member).
- **Songs** — Add custom band songs with notes, album grouping, and optional audio uploads.
- **Covers** — Search and save cover songs via the Deezer API.
- **Setlists** — Create ordered setlists from custom songs and covers; mark one setlist as active and track a per-song learnt progress bar across all band members.
- **Song Learning** — Members mark individual songs as learnt; setlists display band-wide completion percentages.
- **Rehearsals** — Schedule one-time, weekly, or biweekly rehearsals; members mark their availability per occurrence.
- **Calendar** — Visual calendar showing all upcoming rehearsal occurrences across every band a user belongs to.
- **Band Chat** — Per-band messaging so bandmates can communicate.
- **Profile** — Google account info and an "always available" toggle that automatically marks a user as available for all rehearsals.

---

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Framework    | Next.js 16 (App Router)                     |
| Language     | TypeScript                                  |
| Styling      | Tailwind CSS v4                             |
| Database     | MongoDB                                     |
| Auth         | NextAuth.js v4 — Google OAuth, JWT sessions |
| External API | Deezer (song/artist search)                 |

### MongoDB Collections

`users`, `bands`, `songs`, `covers`, `setlists`, `learnt-songs`, `rehearsals`, `rehearsal-availability`, `messages`

---

## How to Run

### Prerequisites

- Node.js 18+
- A MongoDB database (local or Atlas)
- A Google OAuth app (Client ID + Secret)

### Environment Variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

```bash
npm run build   # production build
npm run start   # start production server
npm run lint    # run ESLint
```

---

## Main Logic

### Authentication (`src/app/lib/auth.ts`)

NextAuth.js with Google OAuth. On every sign-in, the user is upserted into the `users` collection so their profile (name, email, avatar) stays in sync.

### Rehearsal Recurrence (`src/app/lib/rehearsalUtils.ts`)

- `doesRehearsalOccurOnDate` — determines whether a rehearsal (once / weekly / biweekly) falls on a given date, respecting excluded dates and an optional end date.
- `getNextOccurrence` — scans the next 60 days to find a rehearsal's next upcoming date.
- `updateRehearsalAvatars` — immutably updates the list of available member avatars, handling single-occurrence and recurring rehearsals separately.

### Setlist Progress (`src/app/lib/setlistUtils.ts`)

- `getProgress` — computes overall setlist completion as `(total songs learnt across all members) / (song count × member count) × 100`.
- `currentUserLearnt` — checks whether the current user has marked a specific song as learnt.
- `formatDuration` — formats a duration in seconds to `mm:ss`.

### API Routes (`src/app/api/`)

REST-style Next.js route handlers for all resources. Protected endpoints check the session via `getServerSession` before accessing MongoDB.
