/**
 * Auto-Cache System for Incremental Analysis
 * Automatically tracks file changes and only analyzes modified files
 * Transparent to users - works automatically
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { createHash } from "crypto";
import type { AIFileContent } from "./types";

const CACHE_DIR = ".vibrant";
const ANALYSIS_CACHE_FILE = join(CACHE_DIR, "analysis-cache.json");

interface FileCacheEntry {
  hash: string;
  lastAnalyzed: string;
  issues: number;
}

interface AnalysisCache {
  version: string;
  lastRun: string;
  files: Record<string, FileCacheEntry>;
}

// Ensure cache directory exists
async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

// Calculate hash of file content
function calculateHash(content: string): string {
  return createHash("md5").update(content).digest("hex").substring(0, 12);
}

/**
 * Load the analysis cache
 */
async function loadCache(): Promise<AnalysisCache> {
  try {
    const content = await readFile(ANALYSIS_CACHE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      version: "1.0.0",
      lastRun: new Date().toISOString(),
      files: {},
    };
  }
}

/**
 * Save the analysis cache
 */
async function saveCache(cache: AnalysisCache): Promise<void> {
  await ensureCacheDir();
  await writeFile(ANALYSIS_CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Filter files to only analyze modified ones
 */
export async function getModifiedFiles(
  files: AIFileContent[]
): Promise<{ modified: AIFileContent[]; cached: AIFileContent[]; stats: { total: number; modified: number; cached: number } }> {
  const cache = await loadCache();
  const modified: AIFileContent[] = [];
  const cached: AIFileContent[] = [];
  
  for (const file of files) {
    const currentHash = calculateHash(file.content);
    const cachedEntry = cache.files[file.path];
    
    if (!cachedEntry || cachedEntry.hash !== currentHash) {
      modified.push(file);
    } else {
      cached.push(file);
    }
  }
  
  return {
    modified,
    cached,
    stats: {
      total: files.length,
      modified: modified.length,
      cached: cached.length,
    },
  };
}

/**
 * Update cache with analysis results
 */
export async function updateCache(
  files: AIFileContent[],
  issueCounts: Record<string, number>
): Promise<void> {
  const cache = await loadCache();
  
  for (const file of files) {
    cache.files[file.path] = {
      hash: calculateHash(file.content),
      lastAnalyzed: new Date().toISOString(),
      issues: issueCounts[file.path] || 0,
    };
  }
  
  cache.lastRun = new Date().toISOString();
  await saveCache(cache);
}

/**
 * Clear the analysis cache
 */
export async function clearCache(): Promise<void> {
  const cache: AnalysisCache = {
    version: "1.0.0",
    lastRun: new Date().toISOString(),
    files: {},
  };
  await saveCache(cache);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  lastRun: string | null;
  cacheSize: string;
}> {
  try {
    const cache = await loadCache();
    const fileContent = await readFile(ANALYSIS_CACHE_FILE, "utf-8");
    const sizeKB = (fileContent.length / 1024).toFixed(2);
    
    return {
      totalCached: Object.keys(cache.files).length,
      lastRun: cache.lastRun,
      cacheSize: `${sizeKB} KB`,
    };
  } catch {
    return {
      totalCached: 0,
      lastRun: null,
      cacheSize: "0 KB",
    };
  }
}