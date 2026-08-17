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
  const { videoId, path: filePath } =
    await context.params;

  const baseDir = path.resolve("temp");
  const videoDir = path.resolve(baseDir, videoId);
  const requestedPath = path.resolve(
    videoDir,
    ...filePath
  );

  if (
    path.basename(videoId) !== videoId ||
    !videoDir.startsWith(`${baseDir}${path.sep}`) ||
    !requestedPath.startsWith(`${videoDir}${path.sep}`)
  ) {
    return new NextResponse("Forbidden", {
      status: 403,
    });
  }

  try {
    const file = await fs.readFile(requestedPath);
    const extension = path.extname(
      requestedPath
    ).toLowerCase();

    return new NextResponse(file, {
      headers: {
        "Content-Type":
          extension === ".m3u8"
            ? "application/vnd.apple.mpegurl"
        : extension === ".ts"
          ? "video/mp2t"
          : extension === ".vtt"
            ? "text/vtt; charset=utf-8"
            : extension === ".jpg" || extension === ".jpeg"
              ? "image/jpeg"
          : "application/octet-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Stream file error:", error);

    return new NextResponse("File not found", {
      status: 404,
    });
  }
}
