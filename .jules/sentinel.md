## 2026-08-26 - Added Next.js Security Headers
**Vulnerability:** Missing fundamental HTTP security headers.
**Learning:** Next.js applications require explicit configuration in `next.config.ts` to add standard headers (HSTS, nosniff, etc.).
**Prevention:** Always include a baseline `headers()` function in the `next.config.ts` file for all routes.

## 2026-08-27 - Fixed Symlink Path Traversal in File APIs
**Vulnerability:** Path traversal possible via symlinks in file-serving Next.js API routes (`/api/hls` and `/api/stream`).
**Learning:** Simple string-based `.startsWith()` checks on file paths (e.g. `requestedPath.startsWith(baseDir)`) are insufficient to prevent directory traversal if the requested path contains or is a symlink pointing outside the intended directory.
**Prevention:** Always resolve the absolute, physical path using `fs.realpath` wrapped in a `try...catch` block (to handle non-existent files safely by returning a 404), and perform directory boundary checks on the resolved real paths.

## 2026-09-03 - Fixed Path Traversal and Arbitrary File Deletion
**Vulnerability:** Path traversal causing arbitrary file deletion in `fs.rm` via unvalidated `videoId`.
**Learning:** Relying solely on `path.basename(id) === id` is insufficient to filter out inputs like `..`, as `path.basename("..")` evaluates to `..`. This weakness allowed arbitrary directory deletion when using such parameters in filesystem operations.
**Prevention:** Validate identifiers (like IDs) against a strict regex (e.g., `/^[a-zA-Z0-9_-]+$/`) rather than depending entirely on Node.js path utility functions for input validation.
