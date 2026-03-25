export function createHandleWorker() {
  return new Worker(new URL('./handleWorker.ts', import.meta.url), { type: 'module' });
}
