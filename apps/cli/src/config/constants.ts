export const RULE_META: Record<
  string,
  { description: string; severity: "error" | "warning" | "info" }
> = {
  "generic-comment": {
    description: "Generic comments (TODO: implement, Fix this, etc.)",
    severity: "warning",
  },
  "generic-variable-name": {
    description: "Overly generic variable names (data, result, temp, etc.)",
    severity: "info",
  },
  "no-explicit-any": {
    description: "Explicit use of the `any` type",
    severity: "warning",
  },
};
