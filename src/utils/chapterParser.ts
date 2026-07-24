import { resolvePath } from '@/utils/utils';
import JSZip from 'jszip';
import { ChapterDocument } from '@/utils/chapterLoader';

const processChapterDocument = async (
  document: ChapterDocument,
  zip: JSZip,
  assetUrlCache: Map<string, string>
) => {
  const parser = new DOMParser();
  const chapterDoc = parser.parseFromString(document.content, 'application/xml');

  if (!chapterDoc) {
    throw new Error('Failed to parse chapter content');
  }

  const xmlDoc = parser.parseFromString(chapterDoc.documentElement.outerHTML, 'application/xml');

  // process link tags
  const links = xmlDoc.querySelectorAll('link[rel="stylesheet"]');
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') || '';
    const resolvedPath = resolvePath(document.basePath, href);
    const linkCssFile = zip.file(resolvedPath);
    if (linkCssFile) {
      let blobUrl = assetUrlCache.get(resolvedPath);
      if (!blobUrl) {
        const linkCss = await linkCssFile.async('blob');
        blobUrl = URL.createObjectURL(linkCss);
        assetUrlCache.set(resolvedPath, blobUrl);
      }
      link.setAttribute('href', blobUrl);
    }
  }

  // process img tags
  const images = xmlDoc.querySelectorAll('img');
  for (const img of Array.from(images)) {
    const src = img.getAttribute('src') || '';
    const resolvedPath = resolvePath(document.basePath, src);
    const imgFile = zip.file(resolvedPath);
    if (imgFile) {
      let blobUrl = assetUrlCache.get(resolvedPath);
      if (!blobUrl) {
        const imgBlob = await imgFile.async('blob');
        blobUrl = URL.createObjectURL(imgBlob);
        assetUrlCache.set(resolvedPath, blobUrl);
      }
      img.setAttribute('src', blobUrl);
    }
  }

  return xmlDoc;
};

export const parseAndProcessChapter = async (chapterDocuments: ChapterDocument[], zip: JSZip) => {
  const assetUrlCache = new Map<string, string>();
  const processedDocuments = [];
  for (const document of chapterDocuments) {
    processedDocuments.push(await processChapterDocument(document, zip, assetUrlCache));
  }

  const chapterDoc = processedDocuments[0];
  const body = chapterDoc.querySelector('body');
  const head = chapterDoc.querySelector('head');
  const stylesheetHrefs = new Set<string>();
  const inlineStyles = new Set<string>();
  head
    ?.querySelectorAll('link[rel="stylesheet"]')
    .forEach((link) => stylesheetHrefs.add(link.getAttribute('href') || ''));
  head?.querySelectorAll('style').forEach((style) => inlineStyles.add(style.textContent || ''));

  for (const extraDocument of processedDocuments.slice(1)) {
    const extraHead = extraDocument.querySelector('head');
    const extraBody = extraDocument.querySelector('body');

    if (head && extraHead) {
      extraHead.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (stylesheetHrefs.has(href)) return;
        stylesheetHrefs.add(href);
        head.appendChild(chapterDoc.importNode(link, true));
      });
      extraHead.querySelectorAll('style').forEach((style) => {
        const css = style.textContent || '';
        if (inlineStyles.has(css)) return;
        inlineStyles.add(css);
        head.appendChild(chapterDoc.importNode(style, true));
      });
    }

    if (!body || !extraBody) continue;
    Array.from(extraBody.childNodes).forEach((node) => {
      body.appendChild(chapterDoc.importNode(node, true));
    });
  }

  return new XMLSerializer().serializeToString(chapterDoc);
};
