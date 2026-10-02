#!/usr/bin/env node
/**
 * Wrapper around drizzle-kit push that pre-encodes special characters in the
 * Supabase connection string password before handing the URL to drizzle-kit.
 */
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const raw = process.env.SUPABASE_DATABASE_URL ?? "";
if (!raw) {
  console.error("SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

function encodedUrl(url) {
  try {
    new URL(url);
    return url; // already valid
  } catch {
    // Extract and encode the password portion.
    // Format: scheme://user:PASSWORD@host:port/db
    // Match the last '@' as the user/host separator.
    const m = url.match(/^(postgresql?:\/\/)([^:@]+):(.+)@([^/].*)$/);
    if (!m) return url;
    const [, scheme, user, password, rest] = m;
    return `${scheme}${user}:${encodeURIComponent(password)}@${rest}`;
  }
}

const encoded = encodedUrl(raw);
const configPath = join(__dirname, "../drizzle.config.ts");

// Export as both DATABASE_URL and SUPABASE_DATABASE_URL so the config reads it.
const env = {
  ...process.env,
  DATABASE_URL: encoded,
  SUPABASE_DATABASE_URL: encoded,
};

try {
  execSync(`npx drizzle-kit push --config "${configPath}"`, {
    env,
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });
} catch {
  process.exit(1);
}
