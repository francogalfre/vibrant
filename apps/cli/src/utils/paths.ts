import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export function getAppDir(): string {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return dirname(process.execPath);
  }
}

export function getCwd(): string {
  return process.cwd();
}
