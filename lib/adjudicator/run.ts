/**
 * Thin wrapper around the shared adjudicator core for Node/Next.js callers.
 */

import type { AdjudicatorResult, DemoTriggerOptions } from "@/lib/adjudicator/types";
import { runAdjudicatorCore } from "@/lib/adjudicator/core";

export type { AdjudicatorResult, DemoTriggerOptions };

export async function runAdjudicator(
  demoTrigger?: DemoTriggerOptions,
): Promise<AdjudicatorResult & { run_id: string }> {
  return runAdjudicatorCore(undefined, { demoTrigger });
}

