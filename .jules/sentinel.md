## 2026-08-26 - Added Next.js Security Headers
**Vulnerability:** Missing fundamental HTTP security headers.
**Learning:** Next.js applications require explicit configuration in `next.config.ts` to add standard headers (HSTS, nosniff, etc.).
**Prevention:** Always include a baseline `headers()` function in the `next.config.ts` file for all routes.

## 2026-08-27 - Fixed Symlink Path Traversal in File APIs
**Vulnerability:** Path traversal possible via symlinks in file-serving Next.js API routes (`/api/hls` and `/api/stream`).
**Learning:** Simple string-based `.startsWith()` checks on file paths (e.g. `requestedPath.startsWith(baseDir)`) are insufficient to prevent directory traversal if the requested path contains or is a symlink pointing outside the intended directory.
**Prevention:** Always resolve the absolute, physical path using `fs.realpath` wrapped in a `try...catch` block (to handle non-existent files safely by returning a 404), and perform directory boundary checks on the resolved real paths.

## 2026-08-28 - Inadequate Validation for Path Traversal and Arbitrary File Deletion
**Vulnerability:** Relying on `path.basename(id) === id` is insufficient to prevent path traversal, which could lead to unauthorized file access in API routes and arbitrary file deletion when executing `fs.rm` in worker scripts.
**Learning:** `path.basename('..')` evaluates to `'..'`, meaning this check fails to filter out malicious traversal inputs.
**Prevention:** Always validate identifiers (like `videoId`) using a strict alphanumeric regex (e.g., `/^[a-zA-Z0-9_-]+$/`) before using them in file system operations.
