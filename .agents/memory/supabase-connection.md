---
name: Supabase connection from Replit
description: Session Pooler requirement, paused-project errors, and connection-string parsing constraints.
---

# Supabase Connection from Replit

## Rule
Always use the **Session Pooler** URL for Supabase connections from Replit. The direct connection host (`db.xxx.supabase.co`) fails with `ENOTFOUND`.

**Why:** Replit's network cannot resolve Supabase's direct connection hostnames. The pooler uses `aws-0-REGION.pooler.supabase.com` which is publicly resolvable.

**How to apply:** When requesting the user's Supabase URL, explicitly ask for the Session Pooler connection string from Supabase → Project Settings → Database → Connection string → "Session pooler" tab. URL format: `postgresql://postgres.REF:PASS@aws-0-REGION.pooler.supabase.com:5432/postgres`.

## Password Special Characters
Connection-string consumers can reject unencoded special characters in passwords.

**Why:** The user's original working Supabase URL needed robust parsing rather than a generic URL assumption.

**How to apply:** Preserve robust parsing/encoding in database tooling; do not print credentials to diagnose parsing.

## Paused Project Errors
The Supabase pooler can return `tenant/user not found` while a project is paused. Resuming it can restore the existing URL without changing credentials.

**Why:** A Phase 2 migration failed with this error, then succeeded unchanged after the user resumed Supabase.

**How to apply:** Ask whether the project is active and retry after resumption before requesting a replacement connection string. Never substitute another database.
