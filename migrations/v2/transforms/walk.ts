import type { Node } from "oxc-parser";

/**
 * Recursively walk an AST node, visiting every descendant node.
 * Iterates over all values of a node: arrays have each element with a `type`
 * property walked; objects with a `type` property are walked directly.
 *
 * @param node    - The root AST node to start walking from
 * @param visitor - Called for every node encountered (including root)
 */
export function walkNode(node: Node, visitor: (node: Node) => void): void {
  visitor(node);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && typeof item === "object" && typeof item.type === "string") {
          walkNode(item as Node, visitor);
        }
      }
    } else if (value !== null && typeof value === "object" && typeof value.type === "string") {
      walkNode(value as Node, visitor);
    }
  }
}
