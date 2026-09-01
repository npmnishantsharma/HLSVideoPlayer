## 2026-08-26 - Added Next.js Security Headers
**Vulnerability:** Missing fundamental HTTP security headers.
**Learning:** Next.js applications require explicit configuration in `next.config.ts` to add standard headers (HSTS, nosniff, etc.).
**Prevention:** Always include a baseline `headers()` function in the `next.config.ts` file for all routes.

## 2026-08-27 - Fixed Symlink Path Traversal in File APIs
**Vulnerability:** Path traversal possible via symlinks in file-serving Next.js API routes (`/api/hls` and `/api/stream`).
**Learning:** Simple string-based `.startsWith()` checks on file paths (e.g. `requestedPath.startsWith(baseDir)`) are insufficient to prevent directory traversal if the requested path contains or is a symlink pointing outside the intended directory.
**Prevention:** Always resolve the absolute, physical path using `fs.realpath` wrapped in a `try...catch` block (to handle non-existent files safely by returning a 404), and perform directory boundary checks on the resolved real paths.

## 2026-09-01 - Fixed Path Traversal/Arbitrary Deletion in Worker Script
**Vulnerability:** Arbitrary file and directory deletion possible via path traversal in worker script (`worker/processor.ts`).
**Learning:** Relying on tools like `path.basename()` is insufficient as it allows relative paths like `..`. When a directory path is constructed using unsanitized input and then subjected to recursive removal (`fs.rm(..., { recursive: true })`), an attacker can delete unexpected files outside the target directory.
**Prevention:** Validate filesystem identifiers using a strict alphanumeric regex (e.g., `/^[a-zA-Z0-9_-]+$/`) before utilizing them in file system operations.
