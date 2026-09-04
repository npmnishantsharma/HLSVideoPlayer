## 2026-08-26 - Added Next.js Security Headers
**Vulnerability:** Missing fundamental HTTP security headers.
**Learning:** Next.js applications require explicit configuration in `next.config.ts` to add standard headers (HSTS, nosniff, etc.).
**Prevention:** Always include a baseline `headers()` function in the `next.config.ts` file for all routes.

## 2026-08-27 - Fixed Symlink Path Traversal in File APIs
**Vulnerability:** Path traversal possible via symlinks in file-serving Next.js API routes (`/api/hls` and `/api/stream`).
**Learning:** Simple string-based `.startsWith()` checks on file paths (e.g. `requestedPath.startsWith(baseDir)`) are insufficient to prevent directory traversal if the requested path contains or is a symlink pointing outside the intended directory.
**Prevention:** Always resolve the absolute, physical path using `fs.realpath` wrapped in a `try...catch` block (to handle non-existent files safely by returning a 404), and perform directory boundary checks on the resolved real paths.

## 2026-09-04 - Fixed Path Traversal & Arbitrary File Deletion
**Vulnerability:** Path traversal possible via identifiers (like `videoId`) used in file operations, potentially leading to arbitrary file deletion in workers and bypassing API boundaries.
**Learning:** Checking identifiers with `path.basename(id) !== id` is inadequate, because `path.basename('..')` is `'..'`, allowing values like `..` to bypass validation.
**Prevention:** Use a strict regex validation (e.g., `/^[a-zA-Z0-9_-]+$/.test(id)`) to enforce that identifiers contain only expected alphanumeric characters, completely preventing path traversal inputs from being processed.
