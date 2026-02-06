import type { Rule } from "../types.js";
import { genericComment } from "./generic-comment.js";
import { genericVariableName } from "./generic-variable-name.js";
import { noExplicitAny } from "./no-explicit-any.js";

export const rules: Record<string, Rule> = {
  "generic-comment": genericComment,
  "generic-variable-name": genericVariableName,
  "no-explicit-any": noExplicitAny,
};
