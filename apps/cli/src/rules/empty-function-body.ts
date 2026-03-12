import ts from "typescript";
import type { Rule, RuleContext, RuleListener } from "../core/types.js";

const meta: import("../core/types.js").RuleMeta = {
  type: "problem",
  docs: {
    description: "Disallow empty function bodies",
    category: "Best Practices",
    recommended: true,
    url: "https://vibrant.dev/rules/empty-function-body",
  },
  fixable: undefined,
  hasSuggestions: true,
  schema: [],
  messages: {
    emptyFunction: "Empty function body detected. This function has no implementation - a common pattern in AI-generated code where stubs are created but never filled in.",
    suggestImplement: "Add implementation or mark as abstract",
    suggestRemove: "Remove unused function",
  },
};

function isAbstract(node: ts.Node): boolean {
  if (ts.isMethodDeclaration(node)) {
    return node.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.AbstractKeyword
    ) ?? false;
  }
  return false;
}

function create(context: RuleContext): RuleListener {
  return {
    FunctionDeclaration(node: ts.Node) {
      checkFunction(node, context);
    },
    MethodDeclaration(node: ts.Node) {
      checkFunction(node, context);
    },
    ArrowFunction(node: ts.Node) {
      checkFunction(node, context);
    },
    FunctionExpression(node: ts.Node) {
      checkFunction(node, context);
    },
  };
}

function getFunctionName(node: ts.FunctionLikeDeclarationBase): string | null {
  if ("name" in node && node.name && ts.isIdentifier(node.name)) return node.name.text;
  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (parent && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  return null;
}

function isCallbackPosition(node: ts.Node): boolean {
  const p = node.parent;
  return !!p && (ts.isCallExpression(p) || ts.isNewExpression(p));
}

function checkFunction(node: ts.Node, context: RuleContext): void {
  if (
    !ts.isFunctionDeclaration(node) &&
    !ts.isMethodDeclaration(node) &&
    !ts.isArrowFunction(node) &&
    !ts.isFunctionExpression(node)
  ) {
    return;
  }

  if (isAbstract(node)) return;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && isCallbackPosition(node)) return;

  const name = getFunctionName(node);
  if (name && /^(noop|noOp|empty|stub|placeholder)$/i.test(name)) return;

  const body = ts.isArrowFunction(node)
    ? ts.isBlock(node.body)
      ? node.body
      : null
    : node.body;

  if (!body || !ts.isBlock(body)) return;

  const isEmpty = body.statements.length === 0;
  if (!isEmpty) return;

  const parent = node.parent;
  if (
    parent &&
    ts.isInterfaceDeclaration(parent)
  ) {
    return;
  }

  context.report({
    node: body,
    messageId: "emptyFunction",
  });
}

const rule: Rule = {
  meta,
  create,
};

export default rule;
export { meta, create };
