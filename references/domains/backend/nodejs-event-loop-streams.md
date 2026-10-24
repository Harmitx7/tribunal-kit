# Node.js Event Loop, Concurrency & Stream Architecture

> **Authority**: Node.js Official Runtime Documentation (`https://nodejs.org/api/`)  
> **Applicable Domains**: Backend Engineering, Node.js Runtimes, High-Throughput APIs  
> **Status**: Verified Production Specification  

---

## 1. Event Loop Phases & Microtask Priority

Node.js event loop runs single-threaded libuv execution across deterministic phases. Microtasks execute immediately after the current operation finishes, before moving to the next phase:

```
   ┌───────────────────────────┐
┌─>│           timers          │  (setTimeout, setInterval callbacks)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  (I/O callbacks deferred to next loop iteration)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │        idle, prepare      │  (internal libuv housekeeping)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │            poll           │  (retrieve new I/O events; execute I/O callbacks)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │            check          │  (setImmediate callbacks)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │      close callbacks      │  (socket.on('close'), handle terminations)
└──┴───────────────────────────┘
```

### Microtask Queue Precedence:
1. `process.nextTick()`: Drains completely before any Promise microtask or next loop phase. Overuse causes I/O starvation.
2. `Promise.then()` / `await` / `queueMicrotask()`: Drains after `nextTick` queue empties.

---

## 2. Stream Pipelines & Safe Backpressure Handling

Never use `.pipe()` in production code. It does not automatically destroy streams or propagate errors if an intermediate stream errors, causing silent memory leaks and socket hangs. Always use `node:stream/promises.pipeline`:

```typescript
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

export async function compressAndArchive(sourcePath: string, destPath: string): Promise<void> {
  const source = createReadStream(sourcePath);
  const transform = createGzip();
  const destination = createWriteStream(destPath);

  // pipeline handles proper cleanup, error propagation, and closes all file descriptors
  await pipeline(source, transform, destination);
}
```

### Backpressure Rule
When authoring custom `Transform` or `Writable` streams, check the return value of `stream.write(chunk)`. If `false`, buffer limit (`highWaterMark`) has been reached; wait for the `'drain'` event before resuming writes.

---

## 3. Preventing Event Loop Starvation

Blocking the main thread stops all incoming network requests and timer ticks:

```typescript
// ❌ WRONG: Blocks main thread for 400ms synchronously
function hashSync(payloads: string[]): string[] {
  return payloads.map(p => crypto.pbkdf2Sync(p, 'salt', 100000, 64, 'sha512').toString('hex'));
}

// ✅ CORRECT: Offload heavy CPU bound work to Worker Threads or async libuv threadpool
import { pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';
const pbkdf2Async = promisify(pbkdf2);

async function hashConcurrent(payloads: string[]): Promise<string[]> {
  return Promise.all(
    payloads.map(p => pbkdf2Async(p, 'salt', 100000, 64, 'sha512').then(b => b.toString('hex')))
  );
}
```

---

## 4. EventEmitter Memory Leaks & Cancellation

Unregistered listeners on long-lived objects (sockets, processes, singletons) are the #1 cause of Node.js heap leaks:

```typescript
import { EventEmitter, on } from 'node:events';

// Safe consumption using Async Iterators & AbortController
export async function monitorEvents(emitter: EventEmitter, signal: AbortSignal): Promise<void> {
  try {
    for await (const [eventData] of on(emitter, 'telemetry', { signal })) {
      processTelemetry(eventData);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return;
    throw err;
  }
}
```

---

## 5. Production Node.js Runtime Verification Checklist

- [ ] All file and HTTP streaming utilizes `node:stream/promises` (`pipeline`).
- [ ] No synchronous filesystem APIs (`fs.readFileSync`, `fs.writeFileSync`) inside request cycles.
- [ ] Libuv threadpool size (`UV_THREADPOOL_SIZE`) tuned when executing crypto or compression under load (default: 4).
- [ ] Process termination handles both `SIGTERM` and `SIGINT` with a graceful teardown timeout.
- [ ] Global unhandled rejections explicitly log and exit: `process.on('unhandledRejection', ...);`.
