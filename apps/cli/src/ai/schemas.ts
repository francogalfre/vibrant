import z from "zod";

export const issueSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  severity: z.enum(["error", "warning", "info"]),
  ruleId: z.string(),
  message: z.string(),
  suggestion: z.string(),
  explanation: z.optional(z.string()),
});

export const analysisSchema = z.object({
  issues: z.array(issueSchema),
  summary: z.optional(z.string()),
});

export type Issue = z.infer<typeof issueSchema>;
export type AnalysisResult = z.infer<typeof analysisSchema>;
