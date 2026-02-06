import ts from "typescript";

export interface ParsedFile {
  file: string;
  source: string;
  sourceFile: ts.SourceFile;
}

const scriptKinds = new Set([
  ts.ScriptKind.TS,
  ts.ScriptKind.TSX,
  ts.ScriptKind.JS,
  ts.ScriptKind.JSX,
]);

export function getScriptKind(filename: string): ts.ScriptKind {
  if (filename.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filename.endsWith(".ts")) return ts.ScriptKind.TS;
  if (filename.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filename.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export function parseSource(
  file: string,
  source: string
): ParsedFile | undefined {
  const scriptKind = getScriptKind(file);
  if (!scriptKinds.has(scriptKind)) return undefined;

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  return { file, source, sourceFile };
}

export function parseFile(
  filePath: string,
  content: string
): ParsedFile | undefined {
  return parseSource(filePath, content);
}
