let tsModule: typeof import("typescript") | null = null;

export async function getTypeScript(): Promise<typeof import("typescript")> {
  if (!tsModule) {
    tsModule = await import("typescript");
  }
  return tsModule;
}

export function getTypeScriptSync(): typeof import("typescript") {
  throw new Error("TypeScript must be loaded asynchronously. Use await getTypeScript()");
}
