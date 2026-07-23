import { Highlight } from '@/store/highlightStore';

const colorMap: Record<string, string> = {
  yellow: 'rgba(255, 235, 59, 0.4)',
  green: 'rgba(76, 175, 80, 0.4)',
  blue: 'rgba(66, 165, 245, 0.4)',
  pink: 'rgba(240, 98, 146, 0.4)'
};

const NOTE_UNDERLINE_WIDTH = '3px';
const solidColorMap: Record<string, string> = {
  yellow: '#FDD835',
  green: '#43A047',
  blue: '#1E88E5',
  pink: '#E91E63'
};

const applyHighlightStyle = (element: HTMLElement, style: Highlight['style'], color: string) => {
  element.style.backgroundColor = '';
  element.style.borderBottom = '';
  element.style.borderBottomStyle = '';
  element.style.borderBottomWidth = '';
  element.style.paddingBottom = '';
  element.style.textDecorationLine = '';
  element.style.textDecorationStyle = '';
  element.style.textDecorationColor = '';
  element.style.textDecorationThickness = '';
  element.style.textUnderlineOffset = '';

  if (style === 'highlight') {
    element.style.backgroundColor = colorMap[color] || colorMap.yellow;
    return;
  }

  if (style === 'note') {
    const noteColor = solidColorMap[color] || solidColorMap.yellow;
    element.style.textDecorationLine = 'underline';
    element.style.textDecorationStyle = 'wavy';
    element.style.textDecorationColor = noteColor;
    element.style.textDecorationThickness = NOTE_UNDERLINE_WIDTH;
    element.style.textUnderlineOffset = '4px';
    element.style.paddingBottom = '1px';
    return;
  }

  element.style.borderBottom = `${NOTE_UNDERLINE_WIDTH} solid ${solidColorMap[color] || solidColorMap.yellow}`;
  element.style.paddingBottom = '1px';
};

interface NodeMapEntry {
  node: Text;
  start: number;
  end: number;
}

interface TextMatch {
  start: number;
  end: number;
}

/**
 * Selection.toString() inserts separators between visual lines/block elements,
 * while a TreeWalker only exposes the text nodes themselves. Fall back to a
 * whitespace-insensitive lookup so selections spanning paragraphs still map
 * back to offsets in the original DOM text buffer.
 */
function findTextMatch(
  fullText: string,
  selectedText: string,
  contextBefore: string,
  contextAfter: string
): TextMatch | null {
  const fullPattern = contextBefore + selectedText + contextAfter;
  const fullIndex = fullText.indexOf(fullPattern);
  if (fullIndex !== -1) {
    const start = fullIndex + contextBefore.length;
    return { start, end: start + selectedText.length };
  }

  const selectedIndex = fullText.indexOf(selectedText);
  if (selectedIndex !== -1) {
    return { start: selectedIndex, end: selectedIndex + selectedText.length };
  }

  const originalOffsets: number[] = [];
  let compactText = '';
  for (let index = 0; index < fullText.length; index += 1) {
    if (/\s/u.test(fullText[index])) continue;
    compactText += fullText[index];
    originalOffsets.push(index);
  }

  const compact = (text: string) => text.replace(/\s/gu, '');
  const compactSelected = compact(selectedText);
  if (!compactSelected) return null;

  const compactContextBefore = compact(contextBefore);
  const compactPattern = compactContextBefore + compactSelected + compact(contextAfter);
  const compactPatternIndex = compactText.indexOf(compactPattern);
  const compactStart =
    compactPatternIndex === -1
      ? compactText.indexOf(compactSelected)
      : compactPatternIndex + compactContextBefore.length;

  if (compactStart === -1) return null;

  const compactEnd = compactStart + compactSelected.length - 1;
  return {
    start: originalOffsets[compactStart],
    end: originalOffsets[compactEnd] + 1
  };
}

export function applyHighlights(iframeDoc: Document, highlights: Highlight[]): void {
  if (!highlights.length) return;

  // Build a continuous text buffer from all text nodes
  const walker = iframeDoc.createTreeWalker(iframeDoc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentNode as Element;
      if (parent?.classList?.contains('epub-user-highlight')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodeMap: NodeMapEntry[] = [];
  let fullText = '';
  let textNode: Node | null;

  while ((textNode = walker.nextNode())) {
    const text = textNode.textContent || '';
    nodeMap.push({
      node: textNode as Text,
      start: fullText.length,
      end: fullText.length + text.length
    });
    fullText += text;
  }

  // Process each highlight - collect all operations first, then apply in reverse order
  const operations: {
    node: Text;
    wrapStart: number;
    wrapEnd: number;
    highlight: Highlight;
  }[] = [];

  for (const highlight of highlights) {
    const match = findTextMatch(
      fullText,
      highlight.selectedText,
      highlight.contextBefore,
      highlight.contextAfter
    );
    if (!match) continue;

    const { start: matchStart, end: matchEnd } = match;

    // Find affected text nodes
    for (const entry of nodeMap) {
      if (entry.end <= matchStart || entry.start >= matchEnd) continue;

      const wrapStart = Math.max(0, matchStart - entry.start);
      const wrapEnd = Math.min(entry.end - entry.start, matchEnd - entry.start);

      operations.push({ node: entry.node, wrapStart, wrapEnd, highlight });
    }
  }

  // Apply operations in reverse document order to avoid offset invalidation
  operations.reverse();

  for (const { node, wrapStart, wrapEnd, highlight } of operations) {
    // Skip if node is no longer in the document
    if (!node.parentNode) continue;

    try {
      const range = iframeDoc.createRange();
      range.setStart(node, wrapStart);
      range.setEnd(node, wrapEnd);

      const span = iframeDoc.createElement('span');
      span.className = 'epub-user-highlight';
      span.dataset.highlightId = highlight.id;
      applyHighlightStyle(span, highlight.style, highlight.color);

      range.surroundContents(span);
    } catch {
      // surroundContents fails on cross-element ranges; wrap text manually
      const text = node.textContent || '';
      const before = text.slice(0, wrapStart);
      const middle = text.slice(wrapStart, wrapEnd);
      const after = text.slice(wrapEnd);

      const parent = node.parentNode;
      if (!parent) continue;

      const frag = iframeDoc.createDocumentFragment();
      if (before) frag.appendChild(iframeDoc.createTextNode(before));

      const span = iframeDoc.createElement('span');
      span.className = 'epub-user-highlight';
      span.dataset.highlightId = highlight.id;
      applyHighlightStyle(span, highlight.style, highlight.color);
      span.textContent = middle;
      frag.appendChild(span);

      if (after) frag.appendChild(iframeDoc.createTextNode(after));

      parent.replaceChild(frag, node);
    }
  }
}

export function removeHighlightFromDOM(iframeDoc: Document, highlightId: string): void {
  const spans = iframeDoc.querySelectorAll(
    `span.epub-user-highlight[data-highlight-id="${highlightId}"]`
  );
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });
  iframeDoc.normalize();
}
