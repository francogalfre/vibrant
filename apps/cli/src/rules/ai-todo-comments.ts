import ts from "typescript";
import type { Rule, RuleContext, RuleListener, RuleMeta } from "../core/types.js";

const TODO_THRESHOLD = 3;

const meta: RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Detect excessive TODO/FIXME/HACK comments - often left by AI",
    category: "AI Telltales",
    recommended: false,
    url: "https://vibrant.dev/rules/ai-todo-comments",
  },
  fixable: "whitespace",
  hasSuggestions: true,
  schema: [],
  messages: {
    excessiveTodos: "Found {{count}} TODO/FIXME/HACK comments. Excessive comments like these are common in AI-generated code. Consider addressing them or removing completed ones.",
    aiTodoDetected: "TODO comment detected: '{{text}}'. AI often leaves many TODO comments that aren't actually implemented.",
    suggestRemove: "Remove this TODO comment",
    suggestComplete: "Complete the implementation or remove if not needed",
  },
};

function create(context: RuleContext): RuleListener {
  const sourceCode = context.getSourceCode();
  const todos: Array<{ node: ts.Node; text: string }> = [];

  return {
    Comment(node: ts.Node) {
      const text = node.getText().toLowerCase();
      
      // Check for AI-generated TODO patterns
      const aiPatterns = [
        /todo:?\s*(implement|fix|add|create|handle|refactor)/i,
        /todo:?\s*(later|soon|next)/i,
        /fixme:?\s*(later|soon|when)/i,
        /hack:?\s*(temp|temporary|workaround)/i,
        /\btodo\b/i,
        /\bfixme\b/i,
        /\bhack\b/i,
        /\/+\s*🔥|💀|🤖|⚠️|❓/,
      ];
      
      const hasAIPattern = aiPatterns.some(p => p.test(text));
      
      if (hasAIPattern) {
        const fullText = node.getText();
        todos.push({ node, text: fullText });
      }
    },
    
    "Program:exit"() {
      if (todos.length >= TODO_THRESHOLD) {
        context.report({
          node: todos[0].node,
          messageId: "excessiveTodos",
        });
      } else if (todos.length > 0) {
        // Report individual TODOs if less than threshold
        for (const todo of todos) {
          context.report({
            node: todo.node,
            messageId: "aiTodoDetected",
            suggest: [
              {
                messageId: "suggestRemove",
                fix(fixer) {
                  return fixer.remove(todo.node);
                },
              },
            ],
          });
        }
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
