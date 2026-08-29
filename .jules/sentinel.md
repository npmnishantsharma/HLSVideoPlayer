## 2026-08-26 - Added Next.js Security Headers
**Vulnerability:** Missing fundamental HTTP security headers.
**Learning:** Next.js applications require explicit configuration in `next.config.ts` to add standard headers (HSTS, nosniff, etc.).
**Prevention:** Always include a baseline `headers()` function in the `next.config.ts` file for all routes.

## 2026-08-27 - Fixed Symlink Path Traversal in File APIs
**Vulnerability:** Path traversal possible via symlinks in file-serving Next.js API routes (`/api/hls` and `/api/stream`).
**Learning:** Simple string-based `.startsWith()` checks on file paths (e.g. `requestedPath.startsWith(baseDir)`) are insufficient to prevent directory traversal if the requested path contains or is a symlink pointing outside the intended directory.
**Prevention:** Always resolve the absolute, physical path using `fs.realpath` wrapped in a `try...catch` block (to handle non-existent files safely by returning a 404), and perform directory boundary checks on the resolved real paths.

## 2026-08-29 - Fixed Path Traversal causing Arbitrary File Deletion in CLI worker
**Vulnerability:** Path traversal in `videoId` argument passed to `worker/processor.ts`.
**Learning:** Using unsanitized inputs like CLI arguments directly in `path.resolve` and passing the result to dangerous functions like `fs.rm(..., { recursive: true, force: true })` allows an attacker to delete arbitrary directories on the server by supplying inputs like `../../`.
**Prevention:** Ensure directory name inputs are validated. Use a strict regex like `/^[a-zA-Z0-9_-]+$/` to ensure the input only contains valid ID characters.
