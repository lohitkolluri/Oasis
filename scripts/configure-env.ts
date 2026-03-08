#!/usr/bin/env npx tsx
/**
 * Interactive .env.local configuration.
 * Run via: make configure
 */

import * as fs from "fs";
import * as readline from "readline";

const ENV_EXAMPLE = ".env.local.example";
const ENV_LOCAL = ".env.local";

const PROMPTS: { key: string; label: string; secret?: boolean }[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase project URL (https://<ref>.supabase.co)" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role key", secret: true },
  { key: "ADMIN_EMAILS", label: "Admin emails (comma-separated)" },
  { key: "TOMORROW_IO_API_KEY", label: "Tomorrow.io API key (weather)" },
  { key: "NEWSDATA_IO_API_KEY", label: "NewsData.io API key" },
  { key: "WAQI_API_KEY", label: "WAQI API key (optional, Enter to skip)" },
  { key: "OPENROUTER_API_KEY", label: "OpenRouter API key (LLM)", secret: true },
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret key (sk_test_...)", secret: true },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret (whsec_..., from stripe listen)", secret: true },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", label: "Stripe publishable key (pk_test_..., optional)", secret: false },
  { key: "CRON_SECRET", label: "Cron secret (random string for /api/cron)" },
  { key: "WEBHOOK_SECRET", label: "Webhook secret for /api/webhooks/disruption (optional; falls back to CRON_SECRET)", secret: true },
  { key: "NEXT_PUBLIC_APP_URL", label: "App URL for production (optional, Enter to skip)" },
  { key: "GOV_ID_ENCRYPTION_KEY", label: "Gov ID encryption key (optional)", secret: true },
  { key: "FACE_PHOTO_ENCRYPTION_KEY", label: "Face photo encryption key (optional)", secret: true },
];

function ask(rl: readline.Interface, prompt: string, current: string, isSecret?: boolean): Promise<string> {
  const display = current && !isSecret ? current : current ? "[set]" : "";
  const p = display ? `${prompt} [${display}] ` : `${prompt} `;
  return new Promise((resolve) => rl.question(p, (answer) => resolve(answer.trim())));
}

function parseEnv(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) map.set(match[1], match[2]);
  }
  return map;
}

function updateEnvLines(content: string, updates: Map<string, string>): string {
  return content.split("\n").map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && updates.has(match[1])) {
      const val = updates.get(match[1])!;
      return `${match[1]}=${val}`;
    }
    return line;
  }).join("\n");
}

async function main() {
  if (!fs.existsSync(ENV_EXAMPLE)) {
    console.error("Missing .env.local.example");
    process.exit(1);
  }

  if (!fs.existsSync(ENV_LOCAL)) {
    fs.copyFileSync(ENV_EXAMPLE, ENV_LOCAL);
    console.log("Created .env.local from example.");
  }

  if (!process.stdin.isTTY) {
    console.log("No TTY — skipping interactive prompts. Run 'make configure' in a terminal to edit .env.local.");
    return;
  }

  const content = fs.readFileSync(ENV_LOCAL, "utf-8");
  const current = parseEnv(content);
  const updates = new Map<string, string>();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("Configure .env.local (press Enter to keep current value, type a value to set):\n");

  for (const { key, label, secret } of PROMPTS) {
    const cur = current.get(key) ?? "";
    const answer = await ask(rl, `${label}\n  ${key}:`, cur, secret);
    if (answer !== "") updates.set(key, answer);
  }

  rl.close();

  if (updates.size > 0) {
    const newContent = updateEnvLines(content, updates);
    fs.writeFileSync(ENV_LOCAL, newContent, "utf-8");
    console.log("\nUpdated .env.local with", updates.size, "value(s).");
  } else {
    console.log("\nNo changes made.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
