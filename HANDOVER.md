# Room Allocation App — Handover Document

## Project
Wedding room allocation app for **Dharshan & Amulya (05 Jul 2026)**.
Mobile-first React app with Supabase backend, hosted on Netlify.

**Project folder:** `C:\Users\paras\Projects\Antigravity\RoomAllocationApp`
**Supabase project ref:** `wcgdzmalriglzchxxcfu`
**Supabase URL:** `https://wcgdzmalriglzchxxcfu.supabase.co`
**Admin email:** `dharshanaitemp@gmail.com`

---

## What's been built

### Frontend (complete, compiles cleanly)
- **React 19 + Vite 8 + TypeScript + Tailwind v4** scaffold
- **Lucide React** for all icons
- Auth flow: Login → Pending → Home (routes by session + profile status)
- Pages created:
  - `src/pages/Login.tsx` — Google sign-in button
  - `src/pages/Pending.tsx` — waiting for admin approval screen
  - `src/pages/Home.tsx` — dashboard with stats + lodge list (mock data for now)
  - `src/pages/ConfigNeeded.tsx` — shown if anon key is missing
- `src/contexts/AuthContext.tsx` — session, user profile (role + status), sign out, refreshProfile
- `src/lib/supabase.ts` — Supabase client (graceful fallback if env vars missing)

### Database schema (NOT yet applied to Supabase)
File: `schema.sql` (also copied to `supabase/migrations/20260619153659_create_room_allocation_schema.sql`)

Tables:
| Table | Purpose |
|---|---|
| `lodges` | Lodge name, address, maps_link |
| `rooms` | Room no, room_type, bed_config, floor, category (TRT/MPT), extra_bed |
| `guests` | Guest name, phone, party_size, hometown, side (bride/groom/both) |
| `room_guests` | Junction: room ↔ guest + keys_given (not_given/given/collected) |
| `users` | Extends auth.users: role (admin/coordinator), status (pending/approved) |
| `room_access` | Per-room access grant: user_id ↔ room_id |

Key design decisions:
- **RLS on all tables** — coordinators only see/edit their assigned rooms
- **`is_admin()` SECURITY DEFINER function** — avoids infinite RLS recursion on the users table
- **Signup trigger** — auto-creates profile on first Google login. `dharshanaitemp@gmail.com` auto-becomes admin+approved; everyone else starts pending
- **Per-room access model** — `room_access` table; admin can bulk-grant a whole lodge or individual rooms

---

## What still needs to be done (in order)

### Step 1 — Apply the database schema
Option A (recommended — MCP, from this folder):
```
# Open Claude Code in RoomAllocationApp folder, then I can apply via MCP
```

Option B (terminal):
```powershell
supabase login
supabase link --project-ref wcgdzmalriglzchxxcfu
supabase db push
```

Option C (dashboard):
- Go to https://app.supabase.com/project/wcgdzmalriglzchxxcfu/sql/new
- Paste contents of `schema.sql` → Run

### Step 2 — Add the Supabase anon key
1. Get key from: https://app.supabase.com/project/wcgdzmalriglzchxxcfu/settings/api
2. Open `.env` and replace `your-anon-key-here` with the actual anon key:
   ```
   VITE_SUPABASE_URL=https://wcgdzmalriglzchxxcfu.supabase.co
   VITE_SUPABASE_ANON_KEY=<paste here>
   ```

### Step 3 — Enable Google OAuth in Supabase
1. Go to: https://app.supabase.com/project/wcgdzmalriglzchxxcfu/auth/providers
2. Enable **Google** provider
3. Add Google Client ID + Secret (from Google Cloud Console)
4. Redirect URI to add in Google Cloud Console:
   `https://wcgdzmalriglzchxxcfu.supabase.co/auth/v1/callback`

### Step 4 — Set Supabase redirect URLs
- Go to: https://app.supabase.com/project/wcgdzmalriglzchxxcfu/auth/url-configuration
- Add: `http://localhost:5173` (for local dev)
- Add: `https://your-netlify-url.netlify.app` (after deploy)

### Step 5 — Build remaining screens
These pages need to be created (all with real Supabase data):
- `LodgesList.tsx` — list of lodges with maps link + navigate button
- `LodgeDetail.tsx` — room grid (colour-coded: blue=vacant, green=assigned, orange=key given)
- `RoomDetail.tsx` — key status toggle + editable guest fields + call button
- `GuestsList.tsx` — searchable guest list
- `GuestDetail.tsx` — guest info + assigned room
- `AdminPanel.tsx` — approve pending users, manage per-room access, settings toggles

### Step 6 — Wire up navigation
- Replace `useState` nav in `Home.tsx` with React Router or a simple screen state manager
- All navigation from the prototype should work with real data

### Step 7 — Deploy to Netlify
```powershell
# Build
npm run build

# Deploy via Netlify CLI or drag dist/ folder to netlify.com
```
- Set env vars in Netlify dashboard: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

---

## UI Reference
The full interactive HTML prototype is at:
`C:\Users\paras\Projects\Antigravity\SaveMyDateRSVP\room-alloc-prototype.html`

Use this as the exact visual reference for all screens. Key design decisions:
- White + blue (`#2563eb`) colour scheme
- Mobile-first, max-width 430px
- Lucide React for all icons
- Bottom navigation (Home / Lodges / Guests / Admin)
- Room grid view (chips, colour-coded by status)
- Key status: 3-state toggle (Not given → Key given → Collected)
- Call button: green circle with phone icon, `href="tel:..."` — opens dialler directly
- Maps banner on lodge detail: green banner linking to Google Maps URL
- Room Type field on rooms (Standard/Deluxe/AC/Non-AC/Suite/Custom)

---

## Tech stack
| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin — NOT the v3 PostCSS way) |
| Icons | lucide-react |
| Backend/DB | Supabase (Postgres + Auth + Realtime + RLS) |
| Auth | Google OAuth via Supabase |
| Hosting | Netlify (frontend only) |

**Important Tailwind note:** This project uses Tailwind v4. The import in `index.css` is `@import "tailwindcss"` (not `@tailwind base/components/utilities`). There is no `tailwind.config.js` or `postcss.config.js` — config is handled via the Vite plugin in `vite.config.ts`.

---

## MCP / Supabase connection
- `.mcp.json` is in `C:\Users\paras\Projects\Antigravity\RoomAllocationApp\`
- Supabase MCP is authenticated (OAuth done by Dharshan)
- To use MCP tools, Claude session must be opened FROM this project folder
- Supabase agent skills installed at `.agents/skills/supabase`

---

## Prototype screens (already designed, need to be coded)
Refer to the HTML prototype for exact layout of each screen. Key interactions:
1. Login → Google sign-in → Pending (if not approved) or Home (if approved)
2. Home → stats + lodge list
3. Lodges → lodge list with maps navigation button per row
4. Lodge detail → room grid + maps banner at top
5. Room detail → key toggle + editable guest form + call button
6. Guests → searchable list
7. Guest detail → edit form + assigned room link
8. Admin → pending users (approve/reject) + coordinator room access management + settings toggles
