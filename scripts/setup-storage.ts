/**
 * Creates the rider-reports storage bucket in Supabase if it doesn't exist.
 * Run: npm run setup-storage (loads .env.local)
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const bucketsToCreate = [
    { name: "rider-reports", desc: "Delivery reports and claim proof photos" },
    {
      name: "government-ids",
      desc: "KYC gov ID uploads (Aadhaar, PAN, etc.)",
    },
    {
      name: "face-photos",
      desc: "Face liveness verification photos for onboarding",
    },
  ];

  const { data: existing } = await supabase.storage.listBuckets();
  const existingNames = new Set((existing ?? []).map((b) => b.name));

  for (const { name, desc } of bucketsToCreate) {
    if (existingNames.has(name)) {
      console.log(`Bucket "${name}" already exists`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });

    if (error) {
      console.error(`Failed to create bucket "${name}":`, error.message);
      process.exit(1);
    }

    console.log(`Bucket "${name}" (${desc}) created successfully`);
  }
}

main();
