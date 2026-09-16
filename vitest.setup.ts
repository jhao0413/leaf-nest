import '@testing-library/jest-dom/vitest';

// jsdom's Blob does not implement text()/arrayBuffer()/stream() (jsdom#2555),
// so assertions like `await blob.text()` fail in the test environment.
// Backfill text() via FileReader when it is missing.
if (typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function (this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
