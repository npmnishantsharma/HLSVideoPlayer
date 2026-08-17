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

    const baseDir = path.resolve("temp");
    const requestedPath = path.resolve(
      baseDir,
      videoId,
      ...filePath
    );

    // Prevent path traversal.
    if (
      requestedPath !== baseDir &&
      !requestedPath.startsWith(`${baseDir}${path.sep}`)
    ) {
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
