import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import epubStructureParser from './epubStructureParser';

const CONTAINER_XML = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const TOC_NCX = `<?xml version="1.0"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <navMap>
    <navPoint id="p1"><navLabel><text>Chapter 1</text></navLabel><content src="chapter1.xhtml"/></navPoint>
  </navMap>
</ncx>`;

function createOpf({ metadata = '', manifest = '' }: { metadata?: string; manifest?: string }) {
  return `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
    ${metadata}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
  </manifest>
</package>`;
}

async function createEpub(opf: string, extraFiles: Record<string, string> = {}) {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', CONTAINER_XML);
  zip.file('OEBPS/content.opf', opf);
  zip.file('OEBPS/toc.ncx', TOC_NCX);
  Object.entries(extraFiles).forEach(([path, content]) => zip.file(path, content));
  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  return new File([buffer], 'book.epub', { type: 'application/epub+zip' });
}

describe('epubStructureParser', () => {
  it('parses an EPUB without a cover and leaves the cover empty', async () => {
    const file = await createEpub(createOpf({}));

    const info = await epubStructureParser(file);

    expect(info.coverBlob).toBeUndefined();
    expect(info.coverPath).toBe('');
    expect(info.toc).toHaveLength(1);
  });

  it('ignores a cover declaration whose image is missing from the archive', async () => {
    const file = await createEpub(
      createOpf({
        metadata: '<meta name="cover" content="cover-img"/>',
        manifest: '<item id="cover-img" href="images/cover.jpg" media-type="image/jpeg"/>'
      })
    );

    const info = await epubStructureParser(file);

    expect(info.coverBlob).toBeUndefined();
    expect(info.coverPath).toBe('');
  });

  it('reads an EPUB3 cover declared via manifest properties', async () => {
    const file = await createEpub(
      createOpf({
        manifest:
          '<item id="c" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>'
      }),
      { 'OEBPS/images/cover.jpg': 'cover' }
    );

    const info = await epubStructureParser(file);

    expect(info.coverPath).toBe('images/cover.jpg');
    expect(new TextDecoder().decode(info.coverBlob)).toBe('cover');
  });
});
