export const HLS_CONFIG = {
  segmentDuration: 6,
  segmentType: "mpegts",
  segmentExtension: ".ts",
  playlistExtension: ".m3u8",
};

export const QUALITY_LADDER = [
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

export function getAvailableQualities(sourceHeight: number) {
  return QUALITY_LADDER.filter(
    (quality) => quality.height <= sourceHeight
  );
}

export function getMaxQuality(sourceHeight: number) {
  const available = getAvailableQualities(sourceHeight);

  if (available.length === 0) {
    return null;
  }

  return available[available.length - 1];
}

export type DrmSecurityLevel = "L1" | "L3" | "auto";

export type WidevineDrmConfig = {
  widevineLicenseUrl: string;
  widevineServerCertificateUrl?: string;
  level?: DrmSecurityLevel;
};