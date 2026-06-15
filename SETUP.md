# Naatya — Setup Guide (v4: Full Feature Set)

## 1. Database setup

### Fresh Supabase project (never ran any SQL yet)
Run `supabase/schema.sql` — it now creates EVERYTHING in one go:
members, inventory, rehearsals, profiles (roles + member linking),
scripts + private storage bucket, activity_log, productions,
rehearsal attendance, characters, notes, invite codes, plus sample
data and a bootstrap invite code.

### Upgrading an existing database
Run whichever you haven't run yet, in order:
1. `supabase/migration_v2_rbac_scripts.sql`  (roles + scripts)
2. `supabase/migration_v3_team_activity.sql` (team page + activity feed)
3. `supabase/migration_v4_full.sql`          (everything below)

## 2. Create your Director account

Signup is now **invite-only** — you need a code. The SQL seeds one
Director bootstrap code: **`DIRECTOR-START`**.

1. Open the app → click **Sign up** → enter email + password +
   invite code `DIRECTOR-START`.
   - If "Confirm email" is ON in Supabase (Authentication → Providers
     → Email), check your inbox to confirm, then log in. For quick
     testing you can turn it OFF so login is instant.
2. That code carries the **Director** role, so your account becomes a
   Director automatically — full control, no dashboard editing needed.
3. From then on, invite everyone else from the in-app **Team** page:
   generate Cast or Director codes and share them. Each code works once.

(If you ever need to fix a role by hand: Supabase → Table Editor →
`profiles` → change `role`, or run
`update profiles set role = 'Director' where email = 'you@example.com';`)

## 3. Run the project

```bash
npm install
npm run dev
```

---

## What's new in v4

### Multiple Productions (#9)
- A production switcher sits in the top bar. Pick a production to see
  only its members, props, rehearsals, and scripts — or "All
  Productions" to see everything.
- Directors create/delete productions from the **Team** page.

### My Profile (#1)
- New "My Profile" page: shows your email, access role, and your
  linked Cast & Crew record. You can update your own availability
  (Free / Busy / On Leave) from here.

### Rehearsal RSVP / Attendance (#2)
- Each rehearsal row has Yes / Maybe / No buttons. Everyone sets their
  own RSVP, and a live tally (✅ / ❓ / ❌) shows who's coming.

### Calendar View (#4)
- The Rehearsals page has a Table ⇄ Calendar toggle. The calendar
  shows a real month grid with each rehearsal on its day; navigate
  months with the arrows.

### Characters & Casting (#5)
- New "Characters" page: Directors define characters and assign an
  actor to each. Props now have an optional **Act/Scene** field so you
  can note where each prop is used.

### Invite-only Signup (#6)
- No more open signup. Directors generate one-time invite codes (Cast
  or Director) on the Team page; new users must enter a valid code to
  register. Bootstrap code: `DIRECTOR-START`.

### Notes / Comments (#7)
- Every member, prop, and rehearsal row has a notes button. Anyone can
  add internal notes (e.g. "Golden Crown sent for repair"); Directors
  can delete them.

### Export / Print (#8)
- Cast list, inventory, and rehearsal schedule each have **Export
  (CSV)** and **Print** buttons.

## What's new in v3

### Team & Access Management (new "Team" page, Director-only)
- See every signed-up user, their role, and when they joined.
- Change anyone's role between **Director** and **Cast** directly
  from the app — no more going into the Supabase dashboard.
- Link each login to a Cast & Crew record (so the platform knows
  "this account = Priya Sharma, Lead Actress").
- A Director can't accidentally demote themselves.

### Real Activity Feed
- The Dashboard's "Recent Activities" now shows real events: who
  added/edited/removed members, props, rehearsals, and scripts, with
  relative timestamps ("2 mins ago", "Yesterday", etc.) — pulled from
  a real `activity_log` table instead of hardcoded sample data.

## What's new in v2

### Roles (RBAC)
- **Director**: full access — add/edit/delete members, props,
  rehearsals, and upload/delete scripts.
- **Cast**: read-only — can view dashboard, cast list, inventory,
  rehearsal schedule, and scripts, but no Add/Edit/Delete buttons.
- Enforced both in the UI (buttons hidden) **and** in the database
  (Row Level Security policies) — a Cast user can't bypass it even
  via the API.

### Script Library (new "Scripts" page)
- **Director** can upload script files (PDF/TXT/MD) with a title and
  description. Files are stored in a **private** Supabase Storage
  bucket — not publicly accessible.
- **All logged-in users** can open scripts via **View**, which opens
  an in-app viewer (no direct download link is ever shown).
- Every script view is stamped with a **dynamic watermark** — your
  email + the current timestamp, tiled diagonally across the page —
  so any screenshot/leak can be traced back to the viewer.

### Existing anti-leak security (unchanged, still active everywhere)
- Right-click disabled, copy/cut blocked, F12 / dev-tools shortcuts
  blocked, screen blurs when the tab loses focus.

## How the platform works (per the ArtisteConnect synopsis)

1. **Sign up / Login** — each cast & crew member has their own
   account.
2. **Dashboard** — live counts of members, props, rehearsals.
3. **Cast & Crew** — Director manages the troupe directory and each
   member's availability (Free/Busy/On Leave).
4. **Inventory** — props/costumes tracked with status (Available, In
   Use, Damaged).
5. **Rehearsals** — scheduling matrix with date/time/venue.
6. **Scripts** — secure script library with view-only access and
   watermarking to prevent leaks before premiere.
7. **Security** — documents all the anti-leak measures in place.

## Future ideas (from the synopsis' "Future Scope")
- Native mobile wrapper for hardware-level screenshot blocking
  (`FLAG_SECURE`).
- Per-member RSVP/attendance for rehearsals.
- Email notifications for new rehearsals/scripts.
