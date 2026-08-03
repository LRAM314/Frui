---
name: Supabase connection from Replit
description: Direct Supabase connection fails from Replit; pooler URL required. Also, pg-connection-string can't parse URLs with special chars in password.
---

# Supabase Connection from Replit

## Rule
Always use the **Session Pooler** URL for Supabase connections from Replit. The direct connection host (`db.xxx.supabase.co`) fails with `ENOTFOUND`.

**Why:** Replit's network cannot resolve Supabase's direct connection hostnames. The pooler uses `aws-0-REGION.pooler.supabase.com` which is publicly resolvable.

**How to apply:** When requesting the user's Supabase URL, explicitly ask for the Session Pooler connection string from Supabase → Project Settings → Database → Connection string → "Session pooler" tab. URL format: `postgresql://postgres.REF:PASS@aws-0-REGION.pooler.supabase.com:5432/postgres`.

## Password Special Characters
`pg-connection-string` (used by the `pg` npm package) fails to parse connection strings whose passwords contain unencoded special characters. Fix in `lib/db/src/index.ts`: use a `parseConnectionString` helper that falls back to regex extraction and passes individual params (`host`, `port`, `user`, `password`, `database`, `ssl`) directly to `new Pool({...})` instead of using `connectionString`.

The same issue affects `drizzle-kit push`. Fix: a wrapper script at `lib/db/scripts/push.mjs` reads the URL, encodes the password with `encodeURIComponent`, then runs `drizzle-kit` with the encoded URL.

## Secret Key
Store as `SUPABASE_DATABASE_URL` (not `DATABASE_URL` — that is runtime-managed by Replit and can't be `requestSecrets`'d). The db lib reads `SUPABASE_DATABASE_URL ?? DATABASE_URL`.
