import JSZip from 'jszip';
import { BookBasicInfoType } from '@/store/bookInfoStore';

export type ChapterDocument = {
  content: string;
  basePath: string;
};

type SpineItem = {
  path: string;
  linear: boolean;
};

const XML_MIME_TYPE = 'application/xml';
const spineItemsCache = new WeakMap<JSZip, Promise<SpineItem[]>>();

const normalizePath = (path: string) => {
  const decodedPath = decodeURIComponent(path).split('#')[0];
  const parts: string[] = [];

  decodedPath.split('/').forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  });

  return parts.join('/');
};

const dirname = (path: string) => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
};

const getContentOpfPath = async (zip: JSZip) => {
  const containerContent = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerContent) return null;

  const containerDoc = new DOMParser().parseFromString(containerContent, XML_MIME_TYPE);
  return containerDoc.querySelector('rootfile')?.getAttribute('full-path') || null;
};

const parseSpineItems = async (zip: JSZip): Promise<SpineItem[]> => {
  const opfPath = await getContentOpfPath(zip);
  if (!opfPath) return [];

  const opfContent = await zip.file(opfPath)?.async('string');
  if (!opfContent) return [];

  const opfDoc = new DOMParser().parseFromString(opfContent, XML_MIME_TYPE);
  const manifest = new Map<string, string>();
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest.set(id, href);
  });

  const opfBasePath = dirname(opfPath);
  return Array.from(opfDoc.querySelectorAll('spine > itemref'))
    .map((itemref) => {
      const href = manifest.get(itemref.getAttribute('idref') || '');
      if (!href) return null;
      return {
        path: normalizePath(`${opfBasePath}/${href}`),
        linear: itemref.getAttribute('linear')?.toLowerCase() !== 'no'
      };
    })
    .filter((item): item is SpineItem => item !== null);
};

const getSpineItems = (zip: JSZip): Promise<SpineItem[]> => {
  const cachedItems = spineItemsCache.get(zip);
  if (cachedItems) return cachedItems;

  const items = parseSpineItems(zip);
  spineItemsCache.set(zip, items);
  void items.catch(() => {
    if (spineItemsCache.get(zip) === items) {
      spineItemsCache.delete(zip);
    }
  });
  return items;
};

const getTocItemPath = (bookInfo: BookBasicInfoType, chapter: number) => {
  const item = bookInfo.toc[chapter];
  if (!item) return '';
  return normalizePath(`${item.path}/${item.file}`);
};

const isExtensionless = (path: string) => {
  const filename = path.split('/').pop() || '';
  return !filename.includes('.');
};

const isSplitChapterContinuation = (titlePath: string, candidatePath: string) => {
  if (dirname(titlePath) !== dirname(candidatePath)) return false;

  const titleFilename = titlePath.split('/').pop() || '';
  const candidateFilename = candidatePath.split('/').pop() || '';
  const escapedTitle = titleFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedTitle}_\\d+\\.xhtml$`, 'i').test(candidateFilename);
};

// Some malformed EPUBs put only the chapter heading in an extensionless TOC target,
// then store the actual body in the following spine item without adding it to the TOC.
const isTitleOnlyDocument = (content: string, tocTitle: string) => {
  const document = new DOMParser().parseFromString(content, XML_MIME_TYPE);
  if (document.querySelector('parsererror')) return false;

  const body = document.querySelector('body');
  const normalizeText = (text: string) => text.replace(/\s+/g, '').trim();
  const text = normalizeText(body?.textContent || '');
  const headingText = normalizeText(
    Array.from(body?.querySelectorAll('h1, h2, h3, h4, h5, h6') || [])
      .map((heading) => heading.textContent || '')
      .join('')
  );
  const paragraphText = Array.from(body?.querySelectorAll('p') || [])
    .map((paragraph) => paragraph.textContent || '')
    .join('')
    .replace(/\s+/g, '');
  const normalizedTitle = normalizeText(tocTitle);

  return (
    normalizedTitle.length > 0 &&
    paragraphText.length === 0 &&
    text === headingText &&
    headingText === normalizedTitle
  );
};

export const loadChapterContent = async (
  zip: JSZip,
  bookInfo: BookBasicInfoType,
  currentChapter: number
) => {
  const tocPath = getTocItemPath(bookInfo, currentChapter);
  const spineItems = await getSpineItems(zip);
  const startIndex = spineItems.findIndex((item) => item.path === tocPath);
  const nextTocPath = getTocItemPath(bookInfo, currentChapter + 1);
  const nextIndex = nextTocPath ? spineItems.findIndex((item) => item.path === nextTocPath) : -1;
  const tocFile = zip.file(tocPath);
  const tocContent = await tocFile?.async('string');
  const hasSafeBoundary = currentChapter === bookInfo.toc.length - 1 || nextIndex > startIndex;
  const hasFollowingLinearDocument =
    startIndex >= 0 &&
    spineItems
      .slice(startIndex + 1, nextIndex > startIndex ? nextIndex : undefined)
      .some((item) => item.linear && isSplitChapterContinuation(tocPath, item.path));

  // Keep standards-compliant EPUBs on the original single-file path. Only activate
  // split-chapter recovery for the narrow malformed pattern described above.
  const shouldMergeSplitChapter =
    startIndex >= 0 &&
    hasSafeBoundary &&
    hasFollowingLinearDocument &&
    isExtensionless(tocPath) &&
    Boolean(tocContent) &&
    isTitleOnlyDocument(tocContent || '', bookInfo.toc[currentChapter]?.text || '');

  // Only include linear continuation files named after the title page. This also keeps
  // unlisted end matter from being absorbed when the malformed chapter is the final TOC item.
  const chapterPaths = shouldMergeSplitChapter
    ? [
        tocPath,
        ...spineItems
          .slice(startIndex + 1, nextIndex > startIndex ? nextIndex : undefined)
          .filter((item) => item.linear && isSplitChapterContinuation(tocPath, item.path))
          .map((item) => item.path)
      ]
    : [tocPath];

  const chapterDocuments = (
    await Promise.all(
      chapterPaths.map(async (path): Promise<ChapterDocument | null> => {
        const chapterFile = zip.file(path);
        if (!chapterFile) return null;
        return {
          content: await chapterFile.async('string'),
          basePath: dirname(path)
        };
      })
    )
  ).filter((document): document is ChapterDocument => document !== null);

  if (!chapterDocuments.length) {
    throw new Error('Content file not found');
  }

  return { chapterDocuments };
};
