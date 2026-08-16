import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Minimal .env loader for the standalone scripts.
 *
 * Next.js loads .env itself, but `tsx scripts/…` does not, and pulling in a
 * dotenv dependency for twenty lines of parsing is not worth it.
 */
export function loadEnv(file = '.env'): void {
  const target = path.join(process.cwd(), file);
  if (!existsSync(target)) return;

  for (const rawLine of readFileSync(target, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    // Strip matching surrounding quotes, keeping any inside the value.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // A real environment variable always wins over the file.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`\n${key} is not set. Add it to .env (see .env.example).\n`);
    process.exit(1);
  }
  return value;
}
