import z from "zod";

export const issueSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  severity: z.enum(["error", "warning", "warn", "info"]).transform(s => s === "warning" ? "warn" : s),
  ruleId: z.string(),
  message: z.string(),
  suggestion: z.string().optional().default(""),
});

export const analysisSchema = z.object({
  issues: z.array(issueSchema),
  summary: z.string().optional(),
  highlights: z.optional(z.array(z.string())),
  recommendations: z.optional(z.array(z.string())),
});

export type Issue = z.infer<typeof issueSchema>;
export type AnalysisResult = z.infer<typeof analysisSchema>;
