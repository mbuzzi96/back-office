# Smith Buzzi & Associates — Back Office (standalone web app)

This is the standalone version of the practice management tool, wired to
Supabase for real accounts and shared data (instead of the Claude artifact
storage the earlier version used). Once deployed, staff can "install" it
from their browser as a desktop app icon (Chrome/Edge: address bar → Install).

## 1. Create a Supabase project

1. Go to https://supabase.com, sign in, and create a new project (free tier is fine).
2. Once it's ready, open **SQL Editor** → **New query**, paste in the entire
   contents of `supabase/schema.sql`, and run it. This creates all the
   tables and turns on row-level security, including partner-only access
   to Invoices and Time & Billing.
   - If you already ran an earlier version of `schema.sql` before partner
     access existed, instead run `supabase/002-partner-only-billing.sql` —
     it adds the missing pieces without touching your existing data.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Create staff accounts

There's no public sign-up screen on purpose — an admin creates each account.

1. **Authentication → Users → Add user** — create one per staff member
   (email + password, or send a magic-link invite).
2. **Table Editor → employees** — insert one row per staff member: `name`,
   `role`, and set `user_id` to that person's UUID from the Authentication
   page. This is what links their login to "who they are" in the app (their
   timesheets, task assignments, etc.) — without it, Log Time and task
   notifications won't know who they are.
3. Anyone who needs to see the app but doesn't need their own timesheet
   (e.g. an admin) can be added the same way — the `user_id` link is only
   needed for people using Log Time / getting assigned tasks.
4. Check the box for **Billing & Invoices access** on whichever employee
   record(s) should see Time & Billing and Invoices — for example, just
   Michael Buzzi's, leaving it unchecked for everyone else, including other
   partners if they shouldn't see billing (in the Employees tab once you're
   signed in, or `is_partner` directly in Table Editor). Everyone, regardless
   of this flag, still gets Dashboard, Clients, Tasks, Log Time, and
   Documents, and can see and edit their own logged time afterward. Only
   someone who already has this access can grant it to someone else,
   including via the app itself.

## 3. Configure and run locally (optional, to test)

```
cp .env.example .env
# edit .env and paste in your Project URL and anon key
npm install
npm run dev
```

Open the printed localhost URL, sign in with one of the accounts you created.

## 4. Deploy

Push this folder to a GitHub repo, then either:

**Vercel** (recommended, free tier is plenty):
1. https://vercel.com → New Project → import the repo
2. Framework preset: Vite
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (same values as your `.env`)
4. Deploy — you'll get a URL like `your-app.vercel.app`

**Netlify** works the same way (New site from Git, same env vars, build
command `npm run build`, publish directory `dist`).

## 5. "Install" it as a desktop app

Once deployed, open the URL in Chrome or Edge on any staff computer, and use
the browser's **Install app** option (usually an icon in the address bar, or
under the browser's menu). That puts a real desktop/dock icon on their
computer that opens straight into the app with no address bar or tabs.

It'll always load the latest version — there's nothing to reinstall when you
make changes, just redeploy and everyone's icon opens the updated app.

## What changed from the artifact version

- **Real accounts instead of shared passcodes.** The old per-tab passwords on
  Invoices and Time & Billing are gone — a real Supabase login now protects
  the whole app.
- **Invoices and Time & Billing are locked to whoever you specifically grant
  access** (Billing & Invoices access, checked per employee — e.g. just
  Michael Buzzi), enforced in the database itself, not just hidden in the
  UI. Everyone else — including other partners if you leave it unchecked
  for them — gets Dashboard, Clients, Tasks, Log Time, and Documents, and
  can see and edit their own logged time afterward, but cannot see billing
  records, Invoices, or anyone else's hours.
- **Log Time and task notifications know who you are automatically** — no
  more picking your name from a dropdown, since it's tied to your login via
  the `employees.user_id` link.
- **Changes sync live** between everyone signed in — if a colleague logs
  time, a partner will see it appear in Time & Billing without refreshing.
- Everything else — clients grouped by partner, task assignment, invoices
  with the time-entry picker and printable letterhead, Excel timesheet
  export — carried over as-is.

## Extending later

- Tightening row-level security per role (e.g. partner-only invoice access)
- Real notifications (email/Slack) when a task is assigned — needs a
  Supabase Edge Function, this is a good next step if the in-app badge
  isn't enough
- A native desktop wrapper (Electron/Tauri) instead of the installed-web-app
  approach, if fully offline use ever becomes a requirement
