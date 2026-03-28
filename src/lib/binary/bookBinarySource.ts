export interface BookBinarySource {
  getBookBlob: (bookId: string) => Promise<Blob>;
}
