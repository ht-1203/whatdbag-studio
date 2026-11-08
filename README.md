# whatdbag Studio — Private Content Manager

A private, responsive web app for planning whatdbag content shoots: a reusable shot checklist, a Reels production board, a publishing calendar, and an AI editing prompt generator. Data is synced per account through Supabase with Row Level Security, so it works the same on iPhone and MacBook.

## Features

- **Dashboard**: shot progress per group, a Reels pipeline by status, and upcoming publish dates.
- **Shot List**: 50 starter shots in 5 groups, with filters, search, notes, and adding or removing your own shots.
- **Reels Planner**: 12 starter concepts. Enter shot numbers (ranges like `3-6` work) to see the matching shots, then set status, publish date and caption (with a character count), and reorder.
- **Calendar**: a month view plus scheduled, unscheduled and overdue lists.
- **AI Studio**: builds a prompt from a chosen Reel's actual shots and caption, with one-click copy.
- **Campaigns**: create, rename, duplicate and delete campaigns, and back up to or restore from a JSON file (merge or replace).
- **Safe cloud sync**: debounced autosave and a clear Saving, Synced or Not saved status with a retry button. It detects when another device changed the data first and asks which version to keep, so nothing is silently overwritten. It also warns before you close the tab with unsaved changes and pulls the latest data when you return to the tab.
- **Accounts**: email and password sign-in, password reset by email, and an optional switch to hide sign-up.
- **Settings**: light, dark or system theme; English or Thai; first day of the week; the page to open on; change password; sign out of all devices; backup, restore and delete-all; install steps; privacy and terms. Settings sync across your devices.
- **Installable**: add it to your iPhone home screen for an app-like experience.

## Project structure

```
src/
  main.jsx               entry point
  App.jsx                auth gate + app shell / navigation
  hooks/useStudioSync.js load, autosave, conflict detection
  lib/supabase.js        Supabase client + env config
  lib/data.js            defaults, factories, data validation
  components/            Auth screens, SyncBadge, ProgressBar
  pages/                 Dashboard, ShotList, ReelsPlanner, Calendar, AIStudio, Campaigns
  styles.css
supabase.sql             table + RLS policies (safe to re-run)
```

## Setup

1. Create a **Supabase project** at https://supabase.com.
2. In the Supabase **SQL Editor**, run [`supabase.sql`](supabase.sql).
3. Under **Authentication → Providers → Email**, enable email sign-in. Under **Authentication → URL Configuration**, set the Site URL and Redirect URLs to your deployed domain (and `http://localhost:5173` for local development). Password reset links need these settings.
4. Copy the env file and fill in your project URL and **anon/publishable** key (never the service-role key):

   ```bash
   cp .env.example .env
   ```

5. Run the app locally:

   ```bash
   npm install
   npm run dev
   ```

6. Create your account in the app. Then, in Supabase, **turn off new sign-ups** and set `VITE_ALLOW_SIGNUP=false` to hide the "Create account" link.

## Deploy (Vercel)

Import this repository into Vercel, choose the **Vite** framework preset (build `npm run build`, output `dist`), and add these environment variables:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your publishable / anon key |
| `VITE_ALLOW_SIGNUP` | `false` once your account exists |

Netlify and Cloudflare Pages work the same way.

## Deploy (GitHub Pages)

The repository includes `.github/workflows/pages.yml`, which builds and publishes the site to `https://<user>.github.io/<repo>/` on every push to `main`.

1. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Go to **Settings → Secrets and variables → Actions → Variables** and add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_ALLOW_SIGNUP`. The anon key is designed to be public, and RLS protects the data.
3. Re-run the workflow from the **Actions** tab, or push a commit.
4. In Supabase, add the Pages URL to the Site URL and Redirect URLs.

## Privacy and limits

- The login page is public, but campaign data is private to each account through Supabase RLS. The site also tells search engines not to index it.
- The app stores shot statuses, notes, Reel details, dates and captions as JSON. It does **not** upload video, edit footage, auto-post to Instagram, or send reminders.
- Backup files contain private data, so store them somewhere secure.
- For extra protection, enable MFA in Supabase Authentication.
