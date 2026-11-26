/**
 * Brave (read-aloud / Speedreader), Google Translate and some extensions wrap or
 * move the page's elements. React still expects them where it left them, so the
 * next screen change throws "removeChild/insertBefore: not a child of this node"
 * and the screen breaks until a reload. These guards make React's two DOM moves
 * tolerate a node that something else has re-parented.
 * See https://github.com/facebook/react/issues/11538
 */
export function installDomGuard() {
  const proto = Node.prototype;
  const originalRemove = proto.removeChild;
  const originalInsert = proto.insertBefore;

  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // Moved into a wrapper: remove it from wherever it now lives.
      if (child.parentNode) originalRemove.call(child.parentNode, child);
      return child;
    }
    return originalRemove.call(this, child) as T;
  };

  proto.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) {
      // The reference got wrapped: insert before its wrapper that is still our child.
      let anchor: Node | null = ref;
      while (anchor && anchor.parentNode !== this) anchor = anchor.parentNode;
      return originalInsert.call(this, node, anchor) as T;
    }
    return originalInsert.call(this, node, ref) as T;
  };
}
