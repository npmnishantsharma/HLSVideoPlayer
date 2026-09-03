import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

const QUALITY_LADDER = [
  {
    name: "360p",
    height: 360,
    videoBitrate: "800k",
    audioBitrate: "96k",
  },
  {
    name: "480p",
    height: 480,
    videoBitrate: "1400k",
    audioBitrate: "128k",
  },
  {
    name: "720p",
    height: 720,
    videoBitrate: "2800k",
    audioBitrate: "128k",
  },
  {
    name: "1080p",
    height: 1080,
    videoBitrate: "5000k",
    audioBitrate: "192k",
  },
  {
    name: "1440p",
    height: 1440,
    videoBitrate: "8000k",
    audioBitrate: "192k",
  },
  {
    name: "2160p",
    height: 2160,
    videoBitrate: "16000k",
    audioBitrate: "256k",
  },
] as const;

type VideoInfo = {
  width: number;
  height: number;
  duration: number;
};

const STORYBOARD_INTERVAL_SECONDS = 10;
const STORYBOARD_WIDTH = 160;
const STORYBOARD_HEIGHT = 90;
const STORYBOARD_COLUMNS = 5;

async function getVideoInfo(input: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    input,
  ]);

  const data = JSON.parse(stdout);

  const stream = data.streams?.[0];

  if (!stream) {
    throw new Error("No video stream found");
  }

  return {
    width: Number(stream.width),
    height: Number(stream.height),
    duration: Number(data.format?.duration ?? 0),
  };
}

function getAvailableQualities(sourceHeight: number) {
  return QUALITY_LADDER.filter(
    (quality) => quality.height <= sourceHeight
  );
}

function calculateWidth(
  sourceWidth: number,
  sourceHeight: number,
  targetHeight: number
) {
  const width = Math.round(
    (sourceWidth / sourceHeight) * targetHeight
  );

  // H.264 works best with even dimensions.
  return width % 2 === 0 ? width : width - 1;
}

function getBandwidth(videoBitrate: string, audioBitrate: string) {
  const video = Number.parseInt(videoBitrate);
  const audio = Number.parseInt(audioBitrate);

  return (video + audio) * 1000;
}

function formatVttTimestamp(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.000`;
}

async function createStoryboard(
  input: string,
  outputDir: string,
  duration: number
) {
  const frameCount = Math.max(
    1,
    Math.ceil(duration / STORYBOARD_INTERVAL_SECONDS)
  );
  const columns = Math.min(STORYBOARD_COLUMNS, frameCount);
  const rows = Math.ceil(frameCount / columns);
  const spriteName = "storyboard.jpg";

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    `fps=1/${STORYBOARD_INTERVAL_SECONDS},scale=${STORYBOARD_WIDTH}:${STORYBOARD_HEIGHT},tile=${columns}x${rows}`,
    "-frames:v",
    "1",
    path.join(outputDir, spriteName),
  ]);

  const cues = Array.from({ length: frameCount }, (_, index) => {
    const start = index * STORYBOARD_INTERVAL_SECONDS;
    const end = Math.min(
      duration,
      start + STORYBOARD_INTERVAL_SECONDS
    );
    const x = (index % columns) * STORYBOARD_WIDTH;
    const y = Math.floor(index / columns) * STORYBOARD_HEIGHT;

    return [
      `${formatVttTimestamp(start)} --> ${formatVttTimestamp(end)}`,
      `${spriteName}#xywh=${x},${y},${STORYBOARD_WIDTH},${STORYBOARD_HEIGHT}`,
    ].join("\n");
  });

  await fs.writeFile(
    path.join(outputDir, "storyboard.vtt"),
    `WEBVTT\n\n${cues.join("\n\n")}\n`,
    "utf8"
  );
}

function createMasterPlaylist(
  outputDir: string,
  sourceWidth: number,
  sourceHeight: number,
  qualities: typeof QUALITY_LADDER[number][]
) {
  const lines: string[] = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "",
  ];

  for (const quality of qualities) {
    const width = calculateWidth(
      sourceWidth,
      sourceHeight,
      quality.height
    );

    const bandwidth = getBandwidth(
      quality.videoBitrate,
      quality.audioBitrate
    );

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${quality.height},NAME="${quality.name}"`,
      `${quality.name}/playlist.m3u8`,
      ""
    );
  }

  return fs.writeFile(
    path.join(outputDir, "master.m3u8"),
    lines.join("\n"),
    "utf8"
  );
}

async function processQuality(
  input: string,
  outputDir: string,
  sourceWidth: number,
  sourceHeight: number,
  quality: (typeof QUALITY_LADDER)[number]
) {
  const qualityDir = path.join(outputDir, quality.name);

  await fs.mkdir(qualityDir, { recursive: true });

  const width = calculateWidth(
    sourceWidth,
    sourceHeight,
    quality.height
  );

  const playlist = path.join(qualityDir, "playlist.m3u8");

  const segmentPattern = path.join(
    qualityDir,
    "segment_%05d.ts"
  );

  console.log(
    `Processing ${quality.name} → ${width}x${quality.height}`
  );

  await execFileAsync("ffmpeg", [
    "-y",

    "-i",
    input,

    // Video
    "-c:v",
    "libx264",

    "-preset",
    "medium",

    "-vf",
    `scale=${width}:${quality.height}`,

    "-b:v",
    quality.videoBitrate,

    "-maxrate",
    quality.videoBitrate,

    "-bufsize",
    `${Number.parseInt(quality.videoBitrate) * 2}k`,

    // Audio
    "-c:a",
    "aac",

    "-b:a",
    quality.audioBitrate,

    "-ar",
    "48000",

    // HLS
    "-f",
    "hls",

    "-hls_time",
    "6",

    "-hls_playlist_type",
    "vod",

    "-hls_segment_type",
    "mpegts",

    "-hls_segment_filename",
    segmentPattern,

    playlist,
  ]);

  console.log(`Finished ${quality.name}`);
}

async function processVideo(input: string, videoId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) {
    throw new Error(
      "Invalid videoId. Only alphanumeric characters, dashes, and underscores are allowed."
    );
  }

  const info = await getVideoInfo(input);

  console.log("\nVideo information:");
  console.log(`Resolution: ${info.width}x${info.height}`);
  console.log(`Duration: ${info.duration.toFixed(2)} seconds`);

  const qualities = getAvailableQualities(info.height);

  if (qualities.length === 0) {
    throw new Error(
      `Source video is smaller than ${QUALITY_LADDER[0].height}p`
    );
  }

  console.log(
    `Available qualities: ${qualities
      .map((quality) => quality.name)
      .join(", ")}`
  );

  const outputDir = path.resolve(
    "temp",
    videoId
  );

  await fs.rm(outputDir, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(outputDir, {
    recursive: true,
  });

  for (const quality of qualities) {
    await processQuality(
      input,
      outputDir,
      info.width,
      info.height,
      quality
    );
  }

  await createMasterPlaylist(
    outputDir,
    info.width,
    info.height,
    qualities
  );

  await createStoryboard(
    input,
    outputDir,
    info.duration
  );

  console.log("\nHLS processing complete!");
  console.log(`Output: ${outputDir}`);
}

const input = process.argv[2];
const videoId = process.argv[3] ?? "test-video";

if (!input) {
  console.error(
    "Usage: npx tsx worker/processor.ts <input.mp4> <video-id>"
  );

  process.exit(1);
}

processVideo(input, videoId).catch((error) => {
  console.error("\nProcessing failed:");
  console.error(error);

  process.exit(1);
});
