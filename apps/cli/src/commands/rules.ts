import pc from "picocolors";
import { PRIMARY } from "../ui/vibrascope.js";
import { RULE_META } from "../config/constants.js";

export async function listRules(): Promise<void> {
  console.log();
  console.log(PRIMARY(pc.bold("  Available Rules")));
  console.log();

  const rules = Object.entries(RULE_META);
  const maxIdLength = Math.max(...rules.map(([id]) => id.length));

  for (const [id, meta] of rules) {
    const icon = meta.severity === "error" ? pc.red("✖") : pc.yellow("⚠");
    const paddedId = id.padEnd(maxIdLength);
    
    console.log(`  ${icon} ${pc.dim(paddedId)}  ${meta.description}`);
  }

  console.log();
}
