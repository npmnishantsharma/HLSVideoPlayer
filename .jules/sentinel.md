## 2026-08-26 - Added Next.js Security Headers
**Vulnerability:** Missing fundamental HTTP security headers.
**Learning:** Next.js applications require explicit configuration in `next.config.ts` to add standard headers (HSTS, nosniff, etc.).
**Prevention:** Always include a baseline `headers()` function in the `next.config.ts` file for all routes.

## 2026-08-27 - Fixed Symlink Path Traversal in File APIs
**Vulnerability:** Path traversal possible via symlinks in file-serving Next.js API routes (`/api/hls` and `/api/stream`).
**Learning:** Simple string-based `.startsWith()` checks on file paths (e.g. `requestedPath.startsWith(baseDir)`) are insufficient to prevent directory traversal if the requested path contains or is a symlink pointing outside the intended directory.
**Prevention:** Always resolve the absolute, physical path using `fs.realpath` wrapped in a `try...catch` block (to handle non-existent files safely by returning a 404), and perform directory boundary checks on the resolved real paths.

## 2024-03-01 - Fixed Path Traversal bypass via `path.basename`
**Vulnerability:** Path traversal possible because `path.basename('..') === '..'` evaluates to true.
**Learning:** Using `path.basename(id) !== id` to prevent directory traversal is insufficient because inputs like `..` pass this check since `path.basename('..')` returns `..`. This allows an attacker to manipulate the file paths to point to unintended directories, like `/api/hls/../some-other-dir/file.txt`. Additionally, in scripts relying on string concatenation for file system operations like `fs.rm`, this could lead to arbitrary file deletion.
**Prevention:** Always validate identifiers (like `videoId`) using a strict alphanumeric and special character regex (e.g., `/^[a-zA-Z0-9_-]+$/`) instead of relying solely on `path.basename()` to filter out malicious input.
