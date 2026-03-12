import ts from "typescript";
import type { Rule, RuleContext, RuleListener, RuleMeta } from "../core/types.js";

const TODO_THRESHOLD = 5;

const TODO_RE = /\b(TODO|FIXME|HACK)\b(?::|\b)/;

const meta: RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Detect excessive TODO/FIXME/HACK comments - often left by AI",
    category: "AI Telltales",
    recommended: false,
    url: "https://vibrant.dev/rules/ai-todo-comments",
  },
  fixable: undefined,
  hasSuggestions: false,
  schema: [],
  messages: {
    excessiveTodos: "Found {{count}} TODO/FIXME/HACK comments. Excessive comments like these are common in AI-generated code. Consider addressing them or removing completed ones.",
    aiTodoDetected: "TODO comment detected: '{{text}}'. AI often leaves many TODO comments that aren't actually implemented.",
    suggestRemove: "Remove this TODO comment",
    suggestComplete: "Complete the implementation or remove if not needed",
  },
};

function create(context: RuleContext): RuleListener {
  const todos: Array<ts.Node> = [];

  return {
    Comment(node: ts.Node) {
      const fullText = node.getText();
      if (!TODO_RE.test(fullText)) return;

      // Avoid reporting in tests/specs/docs where TODOs are common and intentional.
      const filePath = context.getFilename();
      if (filePath.includes(".test.") || filePath.includes(".spec.") || /readme/i.test(filePath)) return;

      todos.push(node);
    },
    
    "Program:exit"() {
      if (todos.length >= TODO_THRESHOLD) {
        context.report({
          node: todos[0],
          messageId: "excessiveTodos",
          data: { count: String(todos.length) },
        });
      }
    },
  };
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta };
