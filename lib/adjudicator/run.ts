/**
 * Thin wrapper around the shared adjudicator core for Node/Next.js callers.
 */

import type {
  AdjudicatorResult,
  DemoTriggerOptions,
  RunAdjudicatorCallOptions,
} from "@/lib/adjudicator/types";
import { runAdjudicatorCore } from "@/lib/adjudicator/core";

export type { AdjudicatorResult, DemoTriggerOptions, RunAdjudicatorCallOptions };

export async function runAdjudicator(
  arg?: DemoTriggerOptions | RunAdjudicatorCallOptions,
): Promise<AdjudicatorResult & { run_id: string }> {
  if (!arg) return runAdjudicatorCore(undefined, {});
  if ("demoTrigger" in arg && arg.demoTrigger != null) {
    return runAdjudicatorCore(undefined, {
      demoTrigger: arg.demoTrigger,
      suppressSystemLog: arg.suppressSystemLog,
      demoLogExtras: arg.demoLogExtras,
    });
  }
  return runAdjudicatorCore(undefined, { demoTrigger: arg as DemoTriggerOptions });
}

