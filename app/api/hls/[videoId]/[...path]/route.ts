import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type RouteContext = {
  params: Promise<{
    videoId: string;
    path: string[];
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { videoId, path: filePath } = await context.params;

    if (!videoId || !filePath || filePath.length === 0) {
      return new NextResponse("Bad Request", {
        status: 400,
      });
    }

    const baseDir = path.resolve("temp");
    const videoDir = path.resolve(baseDir, videoId);
    const requestedPath = path.resolve(
      videoDir,
      ...filePath
    );

        // Prevent path traversal and symlink attacks.
    let isSafe = false;

    try {
      const realRequestedPath = await fs.realpath(requestedPath);
      const realVideoDir = await fs.realpath(videoDir);

      if (
        path.basename(videoId) === videoId &&
        realVideoDir.startsWith(await fs.realpath(baseDir) + path.sep) &&
        realRequestedPath.startsWith(realVideoDir + path.sep)
      ) {
        isSafe = true;
      }
    } catch {
      // If the file doesn't exist yet, we still check the un-symlinked path
      const normalizedVideoDir = path.normalize(videoDir);
      if (
        path.basename(videoId) === videoId &&
        videoDir.startsWith(baseDir + path.sep) &&
        requestedPath.startsWith(normalizedVideoDir + path.sep)
      ) {
        isSafe = true;
      }
    }

    if (!isSafe) {
      return new NextResponse("Forbidden", {
        status: 403,
      });
    }
    const file = await fs.readFile(requestedPath);

    const extension = path.extname(requestedPath).toLowerCase();

    let contentType = "application/octet-stream";

    if (extension === ".m3u8") {
      contentType = "application/vnd.apple.mpegurl";
    } else if (extension === ".ts") {
      contentType = "video/mp2t";
    } else if (extension === ".vtt") {
      contentType = "text/vtt; charset=utf-8";
    } else if (extension === ".jpg" || extension === ".jpeg") {
      contentType = "image/jpeg";
    }

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("HLS file error:", error);

    return new NextResponse("File not found", {
      status: 404,
    });
  }
}
