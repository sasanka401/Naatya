# 🎭 Naatya — Full-Stack Setup Guide

Ye app ek **React + TypeScript + Vite** frontend hai jo **Supabase** (database +
auth + storage + realtime + edge functions) pe chalti hai. Email ab **Resend**
ke through actually send hota hai (pehle sirf mock alert tha — wahi bug fix kiya
gaya hai).

Niche steps follow karo, app 15-20 minute mein chal jayegi.

---

## ✅ Pehle ye check karo (Requirements)

| Cheez | Version | Kahan se |
|---|---|---|
| Node.js | 18 ya upar | https://nodejs.org |
| Supabase account | free | https://supabase.com |
| Resend account | free | https://resend.com (email ke liye) |

Node install hai ya nahi check karne ke liye terminal mein: `node -v`

---

## STEP 1 — Project chalao (frontend)

```bash
# project folder ke andar jao
cd Naatya

# dependencies install karo
npm install

# dev server chalao
npm run dev
```

Browser mein `http://localhost:5173` khulega. Abhi app Supabase se connect nahi
hai isliye login kaam nahi karega — wo agle step mein theek hoga.

---

## STEP 2 — Supabase project banao

1. https://supabase.com pe jao → **New Project** banao.
2. Project ban jaye, to **Project Settings → API** pe jao. Wahan do cheez milegi:
   - **Project URL** (jaise `https://abcd.supabase.co`)
   - **anon public key** (lamba sa key)
3. Project folder mein `.env.example` ko copy karke `.env` banao, aur dono value
   bharo:

```bash
cp .env.example .env
```

`.env` ab aisa dikhega:
```
VITE_SUPABASE_URL=https://abcd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi....(tumhara key)
```

> ⚠️ `.env` file kabhi public/GitHub pe mat daalo. Usme tumhare secret keys hote
> hain.

---

## STEP 3 — Database setup (SQL chalao)

Supabase dashboard mein **SQL Editor** kholo.

### Agar fresh project hai (kabhi SQL nahi chalaya):

Sirf ek file chalao — `supabase/schema.sql`. Uska poora content copy karke SQL
Editor mein paste karo aur **Run** dabao. Ye sab tables, storage bucket, sample
data aur bootstrap invite code bana dega.

Uske baad ye chaar migration bhi chalao (in order):
1. `supabase/migration_v9_scripts_extensions.sql`
2. `supabase/migration_v10_notifications.sql`
3. `supabase/migration_v11_enforce_role_selection.sql`  ← role-picker fix
4. `supabase/migration_v12_fix_table_permissions.sql`   ← "permission denied" fix

### Agar pehle se database hai (upgrade):

Jo migration abhi tak nahi chalaye, wo order mein chalao:
`migration_v2` → `v3` → `v4` → `v5` → `v6` → `v7` → `v8` → `v9` → `v10` → `v11` → `v12`

> Har file ko alag-alag Run karo. Error aaye to ignore karo agar wo "already
> exists" type ka hai — matlab wo part pehle ban chuka.

---

## STEP 4 — Email setup (ye naya hai — bug fix) 📧

Pehle invite code aur OTP sirf screen pe `alert()` mein dikhte the — real email
kabhi nahi jaata tha. Ab ek **Supabase Edge Function** (`send-email`) banaya gaya
hai jo **Resend** se asli email bhejta hai.

### 4a. Resend account + API key

1. https://resend.com pe free account banao.
2. **API Keys** → **Create API Key** → key copy karo (jaise `re_xxxxx`).
3. Testing ke liye Resend ka default sender `onboarding@resend.dev` chalega.
   (Apna domain baad mein add kar sakte ho production ke liye.)

### 4b. Supabase CLI install karo

```bash
npm install -g supabase
```

### 4c. Project link karo aur function deploy karo

```bash
# Supabase mein login (browser khulega)
supabase login

# apne project se link karo (ref tumhare URL mein hai: https://<REF>.supabase.co)
supabase link --project-ref YOUR-PROJECT-REF

# email function ke secrets set karo
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set EMAIL_FROM="Naatya <onboarding@resend.dev>"

# function deploy karo
supabase functions deploy send-email
```

Bas! Ab invite code aur OTP dono real email mein jayenge.

> **Agar abhi email setup nahi karna** — koi baat nahi. App phir bhi chalegi:
> code screen pe (toast/UI mein) dikh jayega taaki testing kar sako. Email
> configure karte hi automatically real inbox mein jaane lagega. Koi code change
> nahi karna padega.

---

## STEP 5 — Apna Director account banao

Signup **invite-only** hai. SQL ne ek bootstrap code seed kiya hai:
**`DIRECTOR-START`**

1. App mein **Sign Up** pe jao → email + password + invite code `DIRECTOR-START`
   daalo.
2. Supabase mein **Authentication → Providers → Email** mein agar "Confirm email"
   ON hai, to apne inbox se confirm karo, fir login karo. (Quick testing ke liye
   ise OFF kar sakte ho — login instant ho jayega.)
3. Ye code Director role deta hai, to tumhara account automatically Director ban
   jayega.
4. Uske baad baaki sabko in-app **Team** page se invite karo — Cast ya Director
   codes generate karke share karo. Har code ek baar chalta hai.

Role haath se badalna ho to: Supabase → Table Editor → `profiles` → `role` change
karo.

---

## 🎬 Features jo already bani hui hain

Tere dost ne kaafi kuch bana diya hai — ye sab kaam karta hai:

- **Login / Signup** (email + Google) — invite-code based
- **Onboarding** — Cast vs Crew role selection
- **Admin approval** — Directors/Writers ko approve karna
- **Project Rooms (Productions)** — har production ka alag data
- **Script Vault** — script upload, version tracking
- **Character-filtered view** — Cast ko sirf apne character ki lines
- **One-time invite codes** — ab email se jaate hain ✅
- **OTP verification** — script room mein dobara ghusne pe — ab email se ✅
- **Live presence** — kaun script dekh raha hai, realtime
- **Kick button** — Director instantly access revoke kar sakta hai
- **Screenshot detection** + alert
- **Watermark** — leak trace karne ke liye
- **Right-click / copy / dev-tools block + tab-switch blur**
- **Rehearsals, attendance (RSVP), inventory, notes, activity feed**
- **In-app notifications**

---

## 🐛 Jo bug fix hua

| Pehle | Ab |
|---|---|
| Invite code sirf `alert()` mein dikhta tha | Recipient ke email pe asli invite email jaata hai |
| OTP sirf screen pe dikhta tha | User ke inbox mein asli OTP email jaata hai |
| Koi email backend nahi tha | `send-email` Edge Function (Resend) add kiya |

Email configure na ho to app crash nahi hoti — code screen pe fallback ke taur pe
dikh jaata hai.

---

## 📦 Project structure (short)

```
Naatya/
├── src/
│   ├── pages/          # Login, Dashboard, Scripts, Team, etc.
│   ├── components/     # Sidebar, Modal, Watermark, Toast...
│   └── lib/
│       ├── supabase.ts   # Supabase client
│       ├── email.ts      # NEW — email helper (calls edge function)
│       ├── auth-context.tsx
│       └── types.ts
├── supabase/
│   ├── schema.sql                  # full fresh-install schema
│   ├── migration_v2..v10.sql       # step-by-step upgrades
│   └── functions/
│       └── send-email/index.ts     # NEW — sends real emails via Resend
├── .env.example        # copy to .env
└── package.json
```

---

## 🆘 Common problems

**"Missing Supabase environment variables"** → `.env` file nahi bani ya value
galat hai. Step 2 dobara karo, fir `npm run dev` restart karo.

**Login pe "Invalid invite code"** → SQL schema chala? `DIRECTOR-START` code
schema.sql se aata hai. Step 3 check karo.

**Email nahi aa raha** → Step 4 check karo: `supabase functions deploy send-email`
chala? `RESEND_API_KEY` set hai? Resend dashboard mein "Logs" dekho ki email
gaya ya nahi. Tab tak code screen pe fallback mein dikhega.

**`supabase: command not found`** → `npm install -g supabase` chalao.

**"permission denied for table inventory / rehearsals"** → Yeh table-level GRANT
missing hone se aata hai (RLS ka issue nahi). `migration_v12_fix_table_permissions.sql`
SQL Editor mein chalao — turant theek ho jayega.

---

Koi cheez atke to bata dena — main exact step ke saath help kar dunga. All the
best! 🎭
