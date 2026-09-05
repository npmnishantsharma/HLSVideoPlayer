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

    let realBaseDir: string;
    let realVideoDir: string;
    let realRequestedPath: string;
    try {
      realBaseDir = await fs.realpath(baseDir);
      realVideoDir = await fs.realpath(videoDir);
      realRequestedPath = await fs.realpath(requestedPath);
    } catch {
      // If the file does not exist, realpath will throw an error.
      // Since this is a file reading endpoint, we can return 404.
      return new NextResponse("File not found", {
        status: 404,
      });
    }

    const isValidVideoId = /^[a-zA-Z0-9_-]+$/.test(videoId);
    if (
      !isValidVideoId ||
      !realVideoDir.startsWith(`${realBaseDir}${path.sep}`) ||
      !realRequestedPath.startsWith(`${realVideoDir}${path.sep}`)
    ) {
      return new NextResponse("Forbidden", {
        status: 403,
      });
    }

    const file = await fs.readFile(requestedPath);
    const extension = path.extname(
      requestedPath
    ).toLowerCase();

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
    console.error("Stream file error:", error);

    return new NextResponse("File not found", {
      status: 404,
    });
  }
}
