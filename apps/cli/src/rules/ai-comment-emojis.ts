import ts from "typescript";
import type { Rule, RuleContext, RuleListener, RuleMeta } from "../core/types.js";

const meta: RuleMeta = {
  type: "suggestion",
  docs: {
    description: "Detect excessive emojis in comments - likely AI-generated",
    category: "AI Telltales",
    recommended: true,
    url: "https://vibrant.dev/rules/ai-comment-emojis",
  },
  fixable: "whitespace",
  hasSuggestions: true,
  schema: [],
  messages: {
    aiEmojiComment: "Comment contains emojis - this pattern is common in AI-generated code. Consider using plain text comments for production code.",
    suggestRemove: "Remove emoji characters from comment",
  },
};

function create(context: RuleContext): RuleListener {
  return {
    Comment(node: ts.Node) {
      const text = node.getText();
      
      // Count emojis in the comment
      const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]/gu;
      const emojis = text.match(emojiPattern);
      
      if (emojis && emojis.length >= 1) {
        context.report({
          node,
          messageId: "aiEmojiComment",
          suggest: [
            {
              messageId: "suggestRemove",
              fix(fixer) {
                const text = node.getText();
                const cleaned = text.replace(emojiPattern, "").replace(/\s+/g, " ").trim();
                if (cleaned.length > 0) {
                  return fixer.replaceText(node, cleaned);
                }
                return fixer.remove(node);
              },
            },
          ],
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
