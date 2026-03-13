# VendorPlus — Free Hosting Setup Guide
## Netlify (free) + Supabase (free)

---

## FILES IN THIS PACKAGE

| File | Purpose |
|------|---------|
| `client.html` | Customer-facing payment page (public) |
| `admin.html` | Admin dashboard (protected) |
| `agent.html` | Agent portal (protected) |
| `vp-supabase.js` | Shared auth + database library |
| `supabase-setup.sql` | Run once in Supabase to create tables |

---

## STEP 1 — Create Your Supabase Project (5 min)

1. Go to **https://supabase.com** → Sign up free
2. Click **New Project** → name it `vendorplus`
3. Set a strong database password → click Create
4. Wait ~2 minutes for it to provision

**Get your credentials:**
- Go to **Settings → API**
- Copy **Project URL** (looks like `https://xyzabc.supabase.co`)
- Copy **anon public** key (long string starting with `eyJ...`)

---

## STEP 2 — Run the Database Setup

1. In Supabase dashboard → click **SQL Editor** → **New query**
2. Open `supabase-setup.sql`, copy everything, paste it in
3. Click **Run** — you should see "Success"

---

## STEP 3 — Add Your Credentials to vp-supabase.js

Open `vp-supabase.js` and replace lines 8-9:

```js
const VP_SUPABASE_URL  = 'https://YOUR-PROJECT.supabase.co';
const VP_SUPABASE_ANON = 'eyJ...your-anon-key...';
```

Save the file.

---

## STEP 4 — Create Your Admin Account

1. Go to your hosted site (or open `admin.html` in browser)
2. Click the **Agent** tab → **Sign up** tab
3. Register with your email + a strong password + your name
4. In Supabase → **SQL Editor** → run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE name = 'YOUR NAME HERE';
```

Now your account has admin access. Log in via the Admin tab.

---

## STEP 5 — Deploy to Netlify (Free)

1. Go to **https://netlify.com** → Sign up free with GitHub/email
2. Click **Add new site → Deploy manually**
3. Drag & drop your entire project folder (all 5 files)
4. Netlify gives you a free URL like `https://vendorplus-abc123.netlify.app`
5. Done! Share `client.html` URL with customers

**Custom domain (optional & free on Netlify):**
- Site settings → Domain management → Add custom domain

---

## HOW THE 3 PAGES COORDINATE

```
Client submits txn → stored in Supabase DB
                           ↓
              Agent sees it in real-time (Supabase Realtime)
                           ↓
              Agent confirms → status updates in DB
                           ↓
              Client's tracker refreshes automatically
```

All coordination is now **server-side** via Supabase — not localStorage.
This means it works across different devices and browsers.

---

## SECURITY SUMMARY

| Threat | Protection |
|--------|-----------|
| Someone faking admin login | Supabase JWT tokens — unfakeable |
| Reading passwords from source code | Passwords never stored in code |
| Accessing admin panel from console | Server verifies role on every page load |
| Stealing sessions | Supabase auto-expires tokens |
| Hardcoded demo accounts | Removed — all accounts in Supabase Auth |

---

## DEFAULT ACCOUNTS

After setup, create accounts via the signup form. Then use SQL to promote admin:

```sql
-- Make someone admin:
UPDATE profiles SET role = 'admin' WHERE name = 'James';

-- List all users:
SELECT name, role, online FROM profiles;

-- Reset an agent to agent role:
UPDATE profiles SET role = 'agent' WHERE name = 'Sarah';
```

---

## NEED HELP?

- Supabase docs: https://supabase.com/docs
- Netlify docs: https://docs.netlify.com
- Supabase Discord: https://discord.supabase.com
