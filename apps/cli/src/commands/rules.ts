import { c, theme } from "../ui/theme.js";
import * as logger from "../ui/logger.js";
import { RULE_META } from "../config/constants.js";

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "error":
      return theme.severity.error(theme.icons.error);
    case "warning":
      return theme.severity.warning(theme.icons.warning);
    case "info":
      return theme.severity.info(theme.icons.info);
    default:
      return theme.icons.bullet;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "error":
      return c.red;
    case "warning":
      return c.yellow;
    case "info":
      return c.blue;
    default:
      return c.white;
  }
}

export async function listRules(): Promise<void> {
  logger.newLine();
  logger.log(c.bold.blue("Available Rules\n"));
  
  const rules = Object.entries(RULE_META);
  const maxIdLength = Math.max(...rules.map(([id]) => id.length));

  for (const [id, meta] of rules) {
    const severityIcon = getSeverityIcon(meta.severity);
    const severityLabel = getSeverityColor(meta.severity)(meta.severity.toUpperCase().padEnd(7));
    const paddedId = id.padEnd(maxIdLength);
    
    logger.log(`${severityIcon} ${severityLabel} ${c.bold(paddedId)} ${c.dim(meta.description)}`);
  }
  
  logger.newLine();
}
