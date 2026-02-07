import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const EXT = [".ts", ".tsx", ".js", ".jsx"];
const DEFAULT_IGNORE = ["node_modules", ".git", "dist", ".next", "build", ".turbo"];

function hasValidExt(path: string): boolean {
  return EXT.some((ext) => path.endsWith(ext));
}

function shouldIgnore(relativePath: string, ignore: string[]): boolean {
  const parts = relativePath.split(/[/\\]/);
  const allIgnore = [...DEFAULT_IGNORE, ...ignore];
  return allIgnore.some((dir) => parts.includes(dir));
}

export async function globFiles(
  root: string,
  ignore: string[] = []
): Promise<string[]> {
  const files: string[] = [];
  const rootResolved = resolvePath(root);

  let isDir: boolean;
  try {
    const st = await stat(rootResolved);
    isDir = st.isDirectory();
  } catch {
    return [];
  }

  if (!isDir && hasValidExt(rootResolved)) return [rootResolved];

  async function walk(dir: string, relativePrefix: string): Promise<void> {
    let entries: { name: string; isDirectory: () => boolean }[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const rel = relativePrefix ? `${relativePrefix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (shouldIgnore(rel, ignore)) continue;
        await walk(join(dir, ent.name), rel);
      } else if (hasValidExt(ent.name)) {
        files.push(join(dir, ent.name));
      }
    }
  }

  await walk(rootResolved, "");
  return files;
}

function resolvePath(p: string): string {
  if (p.startsWith("/")) return p;
  return join(process.cwd(), p);
}
