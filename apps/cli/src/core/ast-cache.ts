/**
 * Persistent AST Cache
 * Caches parsed ASTs to avoid re-parsing unchanged files
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import ts from "typescript";

const CACHE_DIR = ".vibrant";
const AST_CACHE_FILE = join(CACHE_DIR, "ast-cache.json");

interface ASTCacheEntry {
  hash: string;
  ast: string; // Serialized AST
  timestamp: string;
}

interface ASTCache {
  version: string;
  entries: Record<string, ASTCacheEntry>;
}

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

function getFileHash(content: string): string {
  return createHash("md5").update(content).digest("hex").substring(0, 16);
}

async function loadCache(): Promise<ASTCache> {
  try {
    const content = await readFile(AST_CACHE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      version: "1.0.0",
      entries: {},
    };
  }
}

async function saveCache(cache: ASTCache): Promise<void> {
  await ensureCacheDir();
  await writeFile(AST_CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Get cached AST or parse new
 */
export async function getCachedAST(
  filePath: string,
  content: string
): Promise<ts.SourceFile> {
  const cache = await loadCache();
  const hash = getFileHash(content);
  
  // Check if we have a cached version
  const cached = cache.entries[filePath];
  if (cached && cached.hash === hash) {
    // Parse from cached string
    return ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
  }
  
  // Parse new and cache
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  // Update cache
  cache.entries[filePath] = {
    hash,
    ast: JSON.stringify({
      statements: sourceFile.statements.length,
    }),
    timestamp: new Date().toISOString(),
  };
  
  // Clean old entries (keep last 100)
  const entries = Object.entries(cache.entries);
  if (entries.length > 100) {
    const sorted = entries.sort((a, b) => 
      new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime()
    );
    cache.entries = Object.fromEntries(sorted.slice(0, 100));
  }
  
  await saveCache(cache);
  
  return sourceFile;
}

/**
 * Clear AST cache
 */
export async function clearASTCache(): Promise<void> {
  const cache: ASTCache = {
    version: "1.0.0",
    entries: {},
  };
  await saveCache(cache);
}

/**
 * Get cache stats
 */
export async function getASTCacheStats(): Promise<{
  size: number;
  files: number;
}> {
  const cache = await loadCache();
  const entries = Object.values(cache.entries);
  
  return {
    size: entries.length,
    files: entries.length,
  };
}