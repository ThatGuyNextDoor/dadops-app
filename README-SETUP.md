# DadOps — Setup Guide

This is a real Vite + React + Supabase build. It replaces the in-memory
prototype with persisted, realtime data shared across every device that
opens it.

## 1. Open in VS Code

Unzip this folder, then in VS Code: **File → Open Folder** → select `dadops-app`.

## 2. Create the Supabase project (5 min)

1. Go to supabase.com → New Project (free tier is fine to start).
2. Once it's created, open **SQL Editor → New query**, paste in the
   entire contents of `supabase-schema.sql` from this folder, and click **Run**.
   This creates the feeds/nappies/sleeps/temps/daily_log/milestones tables
   and turns on realtime sync.
3. Go to **Project Settings → API**. You need two values:
   - **Project URL**
   - **anon public** key (NOT the service_role key — never put that one in client code)

## 3. Connect the app to Supabase

In the project folder:

```
cp .env.example .env
```

Open `.env` and paste in your URL and anon key:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 4. Run it locally

In VS Code's terminal (`` Ctrl+` ``):

```
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Log a feed, then
refresh the page — it should still be there. That's the persistence working.

To test it on your phone while it's running on the laptop, use the
**Network** URL Vite prints (something like `http://192.168.x.x:5173`) —
your phone needs to be on the same wifi.

## 5. Put it on phones for real (no app store needed)

This is a PWA — "Add to Home Screen" gives Matt, Jhomaira and Omaira a real
app icon, full-screen, no browser bar. But it needs to be reachable over the
internet first (localhost only works on the laptop). Easiest path:

### Deploy to Vercel (free, ~3 min)
1. Push this folder to a GitHub repo (private is fine).
2. Go to vercel.com → New Project → import that repo.
3. Vercel auto-detects Vite. Before deploying, add the two env vars
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project
   settings — same values as your `.env`.
4. Deploy. You'll get a URL like `dadops.vercel.app`.

### Install on each phone
1. Open that URL in Chrome (Android) or Safari (iPhone).
2. Android Chrome: menu (⋮) → **Add to Home screen**.
3. iPhone Safari: Share icon → **Add to Home Screen**.
4. Open the new icon — it launches full-screen, looks and feels like a
   native app, and works offline for the app shell (data syncs live
   whenever there's a connection).

Send the same URL to Jhomaira and Omaira — same steps on their phones.
Everyone shares the same Supabase data, so a feed logged on one phone
shows up live on the others and on the tablet.

### The tablet
Same URL, same "Add to Home Screen" step in Chrome. Because the app is
already screen-width aware, opening it on the tablet automatically loads
the always-on family dashboard layout instead of the phone view — no
separate build needed.

## 6. What's persisted vs. what isn't yet

**Persisted (Supabase):** feeds, nappies, sleeps, temperature readings,
milestones, Daily Log entries (private per person, not shown on the
tablet or to other people).

**Still local/static (next phase):** shift schedule (currently fixed
demo data), Insights smart suggestions (currently stubbed), the AMA
assistant (currently stubbed — needs a server-side Claude API call,
should not be called directly from the browser since that would expose
your API key).

## 7. Security note before this goes further than your household

Right now every table has an open policy so the app works with zero
login screens — fine while the anon key only ever lives in your own
deployed app and isn't shared publicly. Before treating this as
permanent infrastructure, the next step is real Supabase Auth (a simple
PIN or magic-link per person) with row-level security scoped per person,
matching the roles in the original spec (Matt/Jhomaira full access,
Omaira helper-only, tablet dashboard-only). Flag it to me when you want
that built — it's a focused, contained piece of work on top of this.
