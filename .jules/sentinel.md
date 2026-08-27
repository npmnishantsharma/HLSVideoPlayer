## 2026-08-26 - Added Next.js Security Headers
**Vulnerability:** Missing fundamental HTTP security headers.
**Learning:** Next.js applications require explicit configuration in `next.config.ts` to add standard headers (HSTS, nosniff, etc.).
**Prevention:** Always include a baseline `headers()` function in the `next.config.ts` file for all routes.
## 2024-05-24 - [Path Traversal / Symlink Attack Prevention]
**Vulnerability:** The API routes for serving files (`/api/hls` and `/api/stream`) were vulnerable to symlink-based path traversal attacks. While they validated that the logical path stayed within the allowed directory, they did not resolve symbolic links.
**Learning:** `fs.readFile` follows symlinks. Simply using `path.resolve` and `.startsWith()` on string representations is insufficient to prevent an attacker from reading arbitrary files by supplying a symlink file that points outside the directory.
**Prevention:** To validate that paths don't escape bounds via symlinks, use `fs.realpath` to resolve the final absolute path of the target and the base directory, then compare them. Wrap `fs.realpath` in a `try...catch` block to handle files that may not yet exist (falling back to strict logical path checks for them).
