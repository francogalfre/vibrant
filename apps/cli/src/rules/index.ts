import type { Rule } from "../core/types.js";

import genericVariableName from "./generic-variable-name.js";
import noExplicitAny from "./no-explicit-any.js";
import consoleLogDebugging from "./console-log-debugging.js";
import emptyFunctionBody from "./empty-function-body.js";
import magicNumbers from "./magic-numbers.js";
import unimplementedError from "./unimplemented-error.js";
import hardcodedCredentials from "./hardcoded-credentials.js";
import genericComment from "./generic-comment.js";
import emptyCatchBlock from "./empty-catch-bloc.js";

export const rules: Record<string, Rule> = {
  "generic-comment": genericComment,
  "generic-variable-name": genericVariableName,
  "no-explicit-any": noExplicitAny,
  "console-log-debugging": consoleLogDebugging,
  "empty-function-body": emptyFunctionBody,
  "magic-numbers": magicNumbers,
  "unimplemented-error": unimplementedError,
  "hardcoded-credentials": hardcodedCredentials,
  "empty-catch-block": emptyCatchBlock,
};

export default rules;
