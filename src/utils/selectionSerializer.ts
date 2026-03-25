export interface SerializedSelection {
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
}

export function serializeSelection(
  iframeDoc: Document,
  selection: Selection
): SerializedSelection | null {
  const selectedText = selection.toString().trim();
  if (!selectedText || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);

  const contextBefore = collectTextBefore(iframeDoc, range.startContainer, range.startOffset, 50);
  const contextAfter = collectTextAfter(iframeDoc, range.endContainer, range.endOffset, 50);

  return { selectedText, contextBefore, contextAfter };
}

function collectTextBefore(doc: Document, node: Node, offset: number, maxChars: number): string {
  let collected = '';

  // Collect from current text node before offset
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    collected = text.slice(0, offset);
  }

  if (collected.length >= maxChars) {
    return collected.slice(-maxChars);
  }

  // Walk backwards through preceding text nodes
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  walker.currentNode = node;

  let prevNode: Node | null;
  while ((prevNode = walker.previousNode())) {
    const text = prevNode.textContent || '';
    collected = text + collected;
    if (collected.length >= maxChars) break;
  }

  return collected.slice(-maxChars);
}

function collectTextAfter(doc: Document, node: Node, offset: number, maxChars: number): string {
  let collected = '';

  // Collect from current text node after offset
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    collected = text.slice(offset);
  }

  if (collected.length >= maxChars) {
    return collected.slice(0, maxChars);
  }

  // Walk forwards through following text nodes
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  walker.currentNode = node;

  let nextNode: Node | null;
  while ((nextNode = walker.nextNode())) {
    const text = nextNode.textContent || '';
    collected = collected + text;
    if (collected.length >= maxChars) break;
  }

  return collected.slice(0, maxChars);
}
