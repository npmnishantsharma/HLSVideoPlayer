"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Hls from "hls.js";

import type { WidevineDrmConfig, DrmSecurityLevel } from "@/lib/video";

type VideoPlayerProps = {
  src: string;
  storyboardSrc?: string;
  drm?: WidevineDrmConfig;
};

type StoryboardCue = {
  start: number;
  end: number;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ScrubPreview = {
  cue: StoryboardCue;
  time: number;
  position: number;
};

type AmbientColors = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

type Quality = {
  index: number;
  height: number;
  width: number;
  bitrate: number;
};

type MaterialMenuElement = HTMLElement & {
  show: () => void;
  close: () => void;
};

type MaterialSliderElement = HTMLElement & {
  value: number;
  min: number;
  max: number;
  step: number;
};

type PlayerTheme =
  | "pink"
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "red"
  | "cyan"
  | "custom";

type ThemeColors = {
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  glow: string;
};

type StoredSettings = {
  muted: boolean;
  volume: number;
  theme: PlayerTheme;
  customColor: string;
  ambientMode: boolean;
  showMetrics: boolean;
};

type VideoMetrics = {
  fps: number | null;
  decodedFrames: number;
  droppedFrames: number;
  resolution: string | null;
  bufferAhead: number;
};

type Bookmark = {
  id: string;
  name: string;
  time: number;
  createdAt: number;
};

type BookmarkDialog = {
  time: number;
  name: string;
};

const SETTINGS_STORAGE_KEY =
  "stream-player-controls";

const BOOKMARKS_STORAGE_KEY =
  "stream-player-bookmarks";

const DEFAULT_SETTINGS: StoredSettings = {
  muted: false,
  volume: 1,
  theme: "pink",
  customColor: "#ff80ab",
  ambientMode: false,
  showMetrics: false,
};

const PLAYER_THEME_NAMES: PlayerTheme[] = [
  "pink",
  "blue",
  "purple",
  "green",
  "orange",
  "red",
  "cyan",
  "custom",
];

const PLAYBACK_RATES = [
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  2,
];

const parseVttTimestamp = (value: string) => {
  const parts = value.trim().split(":").map(Number);

  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
};

const parseStoryboardVtt = (
  source: string,
  vttUrl: string
): StoryboardCue[] => {
  const vttBaseUrl = new URL(
    vttUrl,
    window.location.href
  );

  return source
    .replace(/^\uFEFF?WEBVTT[^\n]*\n?/i, "")
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .flatMap((block) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const timingIndex = lines.findIndex((line) => line.includes("-->"));

      if (timingIndex === -1 || !lines[timingIndex + 1]) {
        return [];
      }

      const [startValue, endValue] = lines[timingIndex]
        .split("-->")
        .map((value) => value.trim().split(/\s+/)[0]);
      const start = parseVttTimestamp(startValue);
      const end = parseVttTimestamp(endValue);
      const match = lines[timingIndex + 1].match(
        /^(.*)#xywh=(\d+),(\d+),(\d+),(\d+)$/
      );

      if (start === null || end === null || !match || end <= start) {
        return [];
      }

      return [{
        start,
        end,
        imageUrl: new URL(
          match[1],
          vttBaseUrl
        ).toString(),
        x: Number(match[2]),
        y: Number(match[3]),
        width: Number(match[4]),
        height: Number(match[5]),
      }];
    });
};

const getStoredSettings = (): StoredSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(
      SETTINGS_STORAGE_KEY
    );

    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const settings = JSON.parse(
      stored
    ) as Partial<StoredSettings>;

    return {
      muted: settings.muted === true,
      volume:
        typeof settings.volume === "number"
          ? Math.min(1, Math.max(0, settings.volume))
          : DEFAULT_SETTINGS.volume,
      theme:
        PLAYER_THEME_NAMES.includes(
          settings.theme as PlayerTheme
        )
          ? (settings.theme as PlayerTheme)
          : DEFAULT_SETTINGS.theme,
      customColor:
        typeof settings.customColor === "string" &&
        /^#[0-9a-f]{6}$/i.test(settings.customColor)
          ? settings.customColor
          : DEFAULT_SETTINGS.customColor,
      ambientMode: settings.ambientMode === true,
      showMetrics: settings.showMetrics === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const getStoredBookmarks = (
  src: string
): Bookmark[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(
      BOOKMARKS_STORAGE_KEY
    );
    const bookmarksBySource = stored
      ? (JSON.parse(stored) as Record<
          string,
          unknown
        >)
      : {};
    const bookmarks = bookmarksBySource[src];

    if (!Array.isArray(bookmarks)) {
      return [];
    }

    return bookmarks
      .filter(
        (bookmark): bookmark is Bookmark =>
          typeof bookmark === "object" &&
          bookmark !== null &&
          typeof (bookmark as Bookmark).id ===
            "string" &&
          typeof (bookmark as Bookmark).time ===
            "number" &&
          Number.isFinite(
            (bookmark as Bookmark).time
          ) &&
          typeof (bookmark as Bookmark).createdAt ===
            "number"
      )
      .map((bookmark) => ({
        ...bookmark,
        name:
          typeof bookmark.name === "string"
            ? bookmark.name
            : "",
      }))
      .sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
};

const PLAYER_THEMES: Record<
  Exclude<PlayerTheme, "custom">,
  ThemeColors
> = {
  pink: {
    primary: "#ff80ab",
    primaryContainer: "#7d2949",
    onPrimary: "#ffd9e2",
    glow: "rgba(255, 128, 171, 0.65)",
  },

  blue: {
    primary: "#8ab4f8",
    primaryContainer: "#244777",
    onPrimary: "#d7e3ff",
    glow: "rgba(138, 180, 248, 0.65)",
  },

  purple: {
    primary: "#d0bcff",
    primaryContainer: "#4f378b",
    onPrimary: "#eaddff",
    glow: "rgba(208, 188, 255, 0.65)",
  },

  green: {
    primary: "#7ddc9a",
    primaryContainer: "#285c3b",
    onPrimary: "#c8f8d1",
    glow: "rgba(125, 220, 154, 0.65)",
  },

  orange: {
    primary: "#ffb870",
    primaryContainer: "#74451d",
    onPrimary: "#ffddbb",
    glow: "rgba(255, 184, 112, 0.65)",
  },

  red: {
    primary: "#ff8a80",
    primaryContainer: "#7f2d2d",
    onPrimary: "#ffdad6",
    glow: "rgba(255, 138, 128, 0.65)",
  },

  cyan: {
    primary: "#70d7e8",
    primaryContainer: "#20515b",
    onPrimary: "#b8f2fa",
    glow: "rgba(112, 215, 232, 0.65)",
  },
};

export default function VideoPlayer({
  src,
  storyboardSrc = src.replace(/master\.m3u8(?:\?.*)?$/, "storyboard.vtt"),
  drm,
}: VideoPlayerProps) {
  /*
   * =========================================
   * REFS
   * =========================================
   */

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const playerRef =
    useRef<HTMLDivElement>(null);

  const hlsRef =
    useRef<Hls | null>(null);

  const settingsMenuRef =
    useRef<MaterialMenuElement | null>(null);

  const volumeRef =
    useRef<MaterialSliderElement | null>(null);

  const ambientCanvasRef =
    useRef<HTMLCanvasElement>(null);

  const ambientAnimationRef =
    useRef<number | null>(null);

  const volumeControlHideTimerRef =
    useRef<number | null>(null);

  /*
   * =========================================
   * PLAYBACK STATE
   * =========================================
   */

  const [playing, setPlaying] =
    useState(false);

  const [storedSettings] =
    useState(getStoredSettings);

  const storedSettingsRef =
    useRef<StoredSettings>(storedSettings);

  const [muted, setMuted] =
    useState(storedSettings.muted);

  const [volume, setVolume] =
    useState(storedSettings.volume);

  const [volumeControlVisible, setVolumeControlVisible] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [buffered, setBuffered] =
    useState(0);

  const [storyboardCues, setStoryboardCues] =
    useState<StoryboardCue[]>([]);

  const [scrubPreview, setScrubPreview] =
    useState<ScrubPreview | null>(null);

  const [bookmarks, setBookmarks] =
    useState<Bookmark[]>(() =>
      getStoredBookmarks(src)
    );

  const [bookmarkDialog, setBookmarkDialog] =
    useState<BookmarkDialog | null>(null);

  /*
   * =========================================
   * HLS STATE
   * =========================================
   */

  const [qualities, setQualities] =
    useState<Quality[]>([]);

  const [currentQuality, setCurrentQuality] =
    useState(-1);

  const [currentHeight, setCurrentHeight] =
    useState<number | null>(null);

  const [networkSpeed, setNetworkSpeed] =
    useState<number | null>(null);

  const [videoMetrics, setVideoMetrics] =
    useState<VideoMetrics>({
      fps: null,
      decodedFrames: 0,
      droppedFrames: 0,
      resolution: null,
      bufferAhead: 0,
    });

  /*
   * =========================================
   * PLAYER STATE
   * =========================================
   */

  const [playbackRate, setPlaybackRate] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * =========================================
   * THEME
   * =========================================
   */

  const [theme, setTheme] =
    useState<PlayerTheme>(storedSettings.theme);

  const [customColor, setCustomColor] =
    useState(storedSettings.customColor);

  /*
   * =========================================
   * AMBIENT MODE
   * =========================================
   */

  const [ambientMode, setAmbientMode] =
    useState(storedSettings.ambientMode);

  const [showMetrics, setShowMetrics] =
    useState(storedSettings.showMetrics);

  const [ambientColors, setAmbientColors] =
  useState<AmbientColors>({
    top: "rgb(255, 128, 171)",
    right: "rgb(255, 128, 171)",
    bottom: "rgb(255, 128, 171)",
    left: "rgb(255, 128, 171)",
  });

  /*
   * =========================================
   * SETTINGS MENU PAGE
   *
   * root    -> main settings
   * quality -> quality selector
   * speed   -> playback speed selector
   * theme   -> player theme selector
   * =========================================
   */

  const [settingsPage, setSettingsPage] =
    useState<
      | "root"
      | "quality"
      | "speed"
      | "theme"
      | "bookmarks"
    >("root");

  /*
   * =========================================
   * ACTIVE THEME
   * =========================================
   */

  const activeTheme: ThemeColors =
    theme === "custom"
      ? {
          primary: customColor,
          primaryContainer: customColor,
          onPrimary: "#ffffff",
          glow: `${customColor}99`,
        }
      : PLAYER_THEMES[theme];

  useEffect(() => {
    const nextSettings = {
      muted,
      volume,
      theme,
      customColor,
      ambientMode,
      showMetrics,
    };

    storedSettingsRef.current = nextSettings;

    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(nextSettings)
      );
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [
    ambientMode,
    customColor,
    muted,
    showMetrics,
    theme,
    volume,
  ]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        BOOKMARKS_STORAGE_KEY
      );
      const bookmarksBySource = stored
        ? (JSON.parse(stored) as Record<
            string,
            Bookmark[]
          >)
        : {};

      bookmarksBySource[src] = bookmarks;

      localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify(bookmarksBySource)
      );
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [bookmarks, src]);

  useEffect(() => {
    return () => {
      if (
        volumeControlHideTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          volumeControlHideTimerRef.current
        );
      }
    };
  }, []);

  const showVolumeControl = () => {
    if (
      volumeControlHideTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        volumeControlHideTimerRef.current
      );

      volumeControlHideTimerRef.current = null;
    }

    setVolumeControlVisible(true);
  };

  const hideVolumeControlLater = () => {
    if (
      volumeControlHideTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        volumeControlHideTimerRef.current
      );
    }

    volumeControlHideTimerRef.current =
      window.setTimeout(() => {
        setVolumeControlVisible(false);
        volumeControlHideTimerRef.current = null;
      }, 3500);
  };

  /*
   * =========================================
   * PLAY / PAUSE
   * =========================================
   */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().catch((playError) => {
      });
    } else {
      video.pause();
    }
  }, []);

  /*
   * =========================================
   * MUTE
   * =========================================
   */

  const toggleMute = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextMuted = !video.muted;

    video.muted = nextMuted;

    storedSettingsRef.current.muted =
      nextMuted;

    setMuted(nextMuted);
  }, []);

  /*
   * =========================================
   * VOLUME
   * =========================================
   */

  const setVideoVolume = (
    value: number
  ) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextVolume = Math.min(
      1,
      Math.max(0, value)
    );

    video.volume = nextVolume;

    storedSettingsRef.current.volume =
      nextVolume;

    if (nextVolume > 0) {
      video.muted = false;
      storedSettingsRef.current.muted = false;
      setMuted(false);
    }

    if (nextVolume === 0) {
      video.muted = true;
      storedSettingsRef.current.muted = true;
      setMuted(true);
    }

    setVolume(nextVolume);
  };

  /*
   * =========================================
   * SEEK
   * =========================================
   */

  const seek = (value: number) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!Number.isFinite(value)) {
      return;
    }

    const nextTime = Math.max(
      0,
      Math.min(
        value,
        video.duration || value
      )
    );

    video.currentTime = nextTime;

    setCurrentTime(nextTime);
  };

  const addBookmark = () => {
    if (!Number.isFinite(currentTime)) {
      return;
    }

    if (
      bookmarks.some(
        (bookmark) =>
          Math.abs(bookmark.time - currentTime) < 1
      )
    ) {
      return;
    }

    const defaultName = `Bookmark at ${formatTime(
      currentTime
    )}`;

    setBookmarkDialog({
      time: currentTime,
      name: defaultName,
    });
  };

  const saveBookmark = () => {
    if (!bookmarkDialog) {
      return;
    }

    const name =
      bookmarkDialog.name.trim() ||
      `Bookmark at ${formatTime(bookmarkDialog.time)}`;

    setBookmarks((previous) => {
      if (
        previous.some(
          (bookmark) =>
            Math.abs(
              bookmark.time - bookmarkDialog.time
            ) < 1
        )
      ) {
        return previous;
      }

      const bookmark: Bookmark = {
        id: crypto.randomUUID(),
        name,
        time: bookmarkDialog.time,
        createdAt: Date.now(),
      };

      return [...previous, bookmark]
        .sort((a, b) => a.time - b.time)
        .slice(0, 50);
    });

    setBookmarkDialog(null);
  };

  const removeBookmark = (id: string) => {
    setBookmarks((previous) =>
      previous.filter(
        (bookmark) => bookmark.id !== id
      )
    );
  };

  const updateScrubPreview = (
    clientX: number,
    timeline: HTMLElement
  ) => {
    if (!duration || storyboardCues.length === 0) {
      setScrubPreview(null);
      return;
    }

    const rect = timeline.getBoundingClientRect();
    const position = Math.min(
      1,
      Math.max(0, (clientX - rect.left) / rect.width)
    );
    const time = position * duration;
    const cue = storyboardCues.find(
      (item) => time >= item.start && time < item.end
    ) ?? storyboardCues.at(-1);

    setScrubPreview(
      cue
        ? { cue, time, position }
        : null
    );
  };

  const updateScrubPreviewForTime = (
    time: number
  ) => {
    if (!duration || storyboardCues.length === 0) {
      return;
    }

    const position = Math.min(
      1,
      Math.max(0, time / duration)
    );
    const cue = storyboardCues.find(
      (item) => time >= item.start && time < item.end
    ) ?? storyboardCues.at(-1);

    setScrubPreview(
      cue
        ? { cue, time, position }
        : null
    );
  };

  /*
   * =========================================
   * QUALITY SWITCHING
   * =========================================
   */

  const changeQuality = (
    qualityIndex: number
  ) => {
    const hls = hlsRef.current;

    if (!hls) {

      return;
    }

    /*
     * AUTO
     */

    if (qualityIndex === -1) {
      

      hls.currentLevel = -1;

      setCurrentQuality(-1);

      setCurrentHeight(null);

      settingsMenuRef.current?.close();

      return;
    }

    /*
     * MANUAL QUALITY
     */

    const level =
      hls.levels[qualityIndex];

    if (!level) {

      return;
    }

    

    hls.nextLevel = qualityIndex;

    setCurrentQuality(
      qualityIndex
    );

    setCurrentHeight(
      level.height
    );

    settingsMenuRef.current?.close();
  };

  /*
   * =========================================
   * PLAYBACK SPEED
   * =========================================
   */

  const changeSpeed = (
    speed: number
  ) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.playbackRate = speed;

    setPlaybackRate(speed);

    settingsMenuRef.current?.close();
  };

  /*
   * =========================================
   * FULLSCREEN
   * =========================================
   */

  const toggleFullscreen =
    async () => {
      const player =
        playerRef.current;

      if (!player) {
        return;
      }

      try {
        if (
          !document.fullscreenElement
        ) {
          await player.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (fullscreenError) {
      }
    };

  /*
   * =========================================
   * PICTURE IN PICTURE
   * =========================================
   */

  const togglePiP = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      if (
        document.pictureInPictureElement
      ) {
        await document.exitPictureInPicture();
      } else if (
        document.pictureInPictureEnabled
      ) {
        await video.requestPictureInPicture();
      }
    } catch (pipError) {
    }
  };

  /*
   * =========================================
   * FORMAT TIME
   * =========================================
   */

  const formatTime = (
    seconds: number
  ) => {
    if (
      !Number.isFinite(seconds)
    ) {
      return "00:00";
    }

    const hours = Math.floor(
      seconds / 3600
    );

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    const secs = Math.floor(
      seconds % 60
    );

    if (hours > 0) {
      return `${hours}:${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        secs
      ).padStart(
        2,
        "0"
      )}`;
    }

    return `${minutes}:${String(
      secs
    ).padStart(
      2,
      "0"
    )}`;
  };

  const formatNetworkSpeed = (
    bitsPerSecond: number
  ) => {
    if (bitsPerSecond >= 1_000_000) {
      return `${(
        bitsPerSecond / 1_000_000
      ).toFixed(1)} Mbps`;
    }

    return `${Math.round(
      bitsPerSecond / 1_000
    )} Kbps`;
  };

  /*
   * =========================================
   * STORYBOARD WEBVTT
   * =========================================
   */

  useEffect(() => {
    let cancelled = false;

    fetch(storyboardSrc)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Storyboard is unavailable");
        }

        return response.text();
      })
      .then((vtt) => {
        if (cancelled) {
          return;
        }

        setScrubPreview(null);
        setStoryboardCues(
          parseStoryboardVtt(vtt, storyboardSrc)
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        // Storyboards are progressive enhancement; playback still works without one.
        setStoryboardCues([]);
      });

    return () => {
      cancelled = true;
    };
  }, [storyboardSrc]);

  /*
   * =========================================
   * HLS INITIALIZATION
   * =========================================
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

   

    setLoading(true);
    setError(null);

    video.muted =
      storedSettingsRef.current.muted;
    video.volume =
      storedSettingsRef.current.volume;
    video.playbackRate = 1;

    setQualities([]);

    setCurrentQuality(-1);

    setCurrentHeight(null);

    setNetworkSpeed(null);

    /*
     * DESTROY PREVIOUS HLS
     */

    if (hlsRef.current) {

      hlsRef.current.destroy();

      hlsRef.current = null;
    }

    /*
     * =====================================
     * HLS.JS
     * =====================================
     */

    if (Hls.isSupported()) {

      const hlsConfig: Record<string, unknown> = {
        enableWorker: true,
        maxBufferLength: 30,
        capLevelToPlayerSize: false,
      };

      if (drm?.widevineLicenseUrl) {
        const level: DrmSecurityLevel = drm.level ?? "auto";
        let videoRobustness = "";

        if (level === "L1") {
          videoRobustness = "HW_SECURE_ALL";
        } else if (level === "L3") {
          videoRobustness = "SW_SECURE_DECRYPTION";
        }

        hlsConfig.emeEnabled = true;
        hlsConfig.widevineLicenseUrl = drm.widevineLicenseUrl;
        hlsConfig.drmSystems = {
          "com.widevine.alpha": {
            licenseUrl: drm.widevineLicenseUrl,
            serverCertificateUrl: drm.widevineServerCertificateUrl,
          },
        };

        if (videoRobustness) {
          hlsConfig.drmSystemOptions = {
            videoRobustness,
          };
        }
      }

      console.log(
        "Initializing hls.js with config:",
        hlsConfig
      );

      const hls = new Hls(hlsConfig);
      

      hlsRef.current = hls;

      /*
       * MEDIA ATTACHED
       */

      hls.on(
        Hls.Events.MEDIA_ATTACHED,
        () => {}
      );

      /*
       * MANIFEST LOADING
       */

      hls.on(
        Hls.Events.MANIFEST_LOADING,
        (_event, data) => {}
      );

      /*
       * MANIFEST LOADED
       */

      hls.on(
        Hls.Events.MANIFEST_LOADED,
        (_event, data) => {
          
        }
      );

      /*
       * MANIFEST PARSED
       */

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        (_event, data) => {
         

         

          const levels =
            data.levels
              .map(
                (
                  level,
                  index
                ) => ({
                  index,
                  width:
                    level.width,
                  height:
                    level.height,
                  bitrate:
                    level.bitrate,
                })
              )
              .filter(
                (level) =>
                  level.height > 0
              );


          setQualities(levels);

          hls.currentLevel = -1;

          setCurrentQuality(-1);

          setLoading(false);
        }
      );

      /*
       * LEVEL LOADED
       */

      hls.on(
        Hls.Events.LEVEL_LOADED,
        (_event, data) => {
         
        }
      );

      /*
       * LEVEL SWITCHING
       */

      hls.on(
        Hls.Events.LEVEL_SWITCHING,
        (_event, data) => {
          const level =
            hls.levels[
              data.level
            ];

          if (level) {
            

            setCurrentHeight(
              level.height
            );
          }
        }
      );

      /*
       * LEVEL SWITCHED
       */

      hls.on(
        Hls.Events.LEVEL_SWITCHED,
        (_event, data) => {
          const level =
            hls.levels[
              data.level
            ];

          if (level) {
            

            setCurrentHeight(
              level.height
            );
          }
        }
      );

      /*
       * FRAGMENT LOADING
       */

      hls.on(
        Hls.Events.FRAG_LOADING,
        (_event, data) => {
          
        }
      );

      /*
       * FRAGMENT LOADED
       */

      hls.on(
        Hls.Events.FRAG_LOADED,
        (_event, data) => {
          const { loaded, loading } =
            data.frag.stats;

          const loadDuration =
            loading.end - loading.start;

          if (loaded > 0 && loadDuration > 0) {
            setNetworkSpeed(
              (loaded * 8 * 1000) /
                loadDuration
            );
          }

          
        }
      );

      /*
       * BUFFER APPENDED
       */

      hls.on(
        Hls.Events.BUFFER_APPENDED,
        () => {
          setLoading(false);
        }
      );

      /*
       * HLS ERROR
       */

      hls.on(
        Hls.Events.ERROR,
        (_event, data) => {
         

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                
                hls.recoverMediaError();
                break;
              default:
               
                setError(
                  `HLS error: ${data.details}`
                );
                hls.destroy();
                break;
            }
          }
        }
      );

      /*
       * LOAD MASTER PLAYLIST
       */

      hls.loadSource(src);

      /*
       * ATTACH HLS
       */

      hls.attachMedia(video);

      /*
       * CLEANUP
       */

      return () => {
        

        hls.destroy();

        if (
          hlsRef.current === hls
        ) {
          hlsRef.current = null;
        }
      };
    }

    /*
     * =====================================
     * NATIVE HLS
     * =====================================
     */

    if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      

      video.src = src;

      setLoading(false);

      return () => {
        video.removeAttribute(
          "src"
        );

        video.load();
      };
    }

    /*
     * =====================================
     * HLS NOT SUPPORTED
     * =====================================
     */


    setError(
      "HLS is not supported by this browser."
    );

    setLoading(false);
  }, [src, drm]);

  /*
   * =========================================
   * VIDEO EVENTS
   * =========================================
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const handleTimeUpdate =
      () => {
        setCurrentTime(
          video.currentTime
        );

        if (
          video.buffered.length > 0
        ) {
          const bufferedEnd =
            video.buffered.end(
              video.buffered.length - 1
            );

          setBuffered(
            bufferedEnd
          );
        }
      };

    const handleProgress =
      () => {
        if (
          video.buffered.length > 0
        ) {
          const bufferedEnd =
            video.buffered.end(
              video.buffered.length - 1
            );

          setBuffered(
            bufferedEnd
          );
        }
      };

    const handleMetadata =
      () => {
      

        setDuration(
          video.duration
        );
      };

    const handlePlay = () => {
      setPlaying(true);
    };

    const handlePause = () => {
      setPlaying(false);
    };

    const handleWaiting = () => {
      
      setLoading(true);
    };

    const handlePlaying = () => {
      

      setLoading(false);
    };

    const handleEnded = () => {
      setPlaying(false);
    };

    video.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    video.addEventListener(
      "progress",
      handleProgress
    );

    video.addEventListener(
      "loadedmetadata",
      handleMetadata
    );

    video.addEventListener(
      "play",
      handlePlay
    );

    video.addEventListener(
      "pause",
      handlePause
    );

    video.addEventListener(
      "waiting",
      handleWaiting
    );

    video.addEventListener(
      "playing",
      handlePlaying
    );

    video.addEventListener(
      "ended",
      handleEnded
    );

    return () => {
      video.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      video.removeEventListener(
        "progress",
        handleProgress
      );

      video.removeEventListener(
        "loadedmetadata",
        handleMetadata
      );

      video.removeEventListener(
        "play",
        handlePlay
      );

      video.removeEventListener(
        "pause",
        handlePause
      );

      video.removeEventListener(
        "waiting",
        handleWaiting
      );

      video.removeEventListener(
        "playing",
        handlePlaying
      );

      video.removeEventListener(
        "ended",
        handleEnded
      );
    };
  }, []);

  /*
   * =========================================
   * VIDEO METRICS
   * =========================================
   */

  useEffect(() => {
    if (!showMetrics) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    let previousFrameCount = 0;
    let previousSampleTime = performance.now();

    const sampleMetrics = () => {
      const now = performance.now();
      const quality = video.getVideoPlaybackQuality?.();
      const decodedFrames = quality?.totalVideoFrames ?? 0;
      const elapsed = now - previousSampleTime;
      const fps =
        elapsed > 0 && decodedFrames >= previousFrameCount
          ? ((decodedFrames - previousFrameCount) * 1000) /
            elapsed
          : null;
      let bufferAhead = 0;

      for (let index = 0; index < video.buffered.length; index++) {
        const start = video.buffered.start(index);
        const end = video.buffered.end(index);

        if (
          video.currentTime >= start &&
          video.currentTime <= end
        ) {
          bufferAhead = Math.max(
            0,
            end - video.currentTime
          );
          break;
        }
      }

      setVideoMetrics({
        fps,
        decodedFrames,
        droppedFrames: quality?.droppedVideoFrames ?? 0,
        resolution:
          video.videoWidth > 0 && video.videoHeight > 0
            ? `${video.videoWidth} × ${video.videoHeight}`
            : null,
        bufferAhead,
      });

      previousFrameCount = decodedFrames;
      previousSampleTime = now;
    };

    const intervalId = window.setInterval(
      sampleMetrics,
      500
    );

    return () => window.clearInterval(intervalId);
  }, [showMetrics]);

  /*
   * =========================================
   * VOLUME SLIDER
   * =========================================
   */

  useEffect(() => {
    const slider =
      volumeRef.current;

    if (!slider) {
      return;
    }

    const handleInput =
      () => {
        setVideoVolume(
          Number(slider.value)
        );
      };

    slider.addEventListener(
      "input",
      handleInput
    );

    return () => {
      slider.removeEventListener(
        "input",
        handleInput
      );
    };
  }, []);

  /*
   * =========================================
   * AMBIENT MODE
   *
   * Subtle YouTube-style ambient glow:
   * - samples the four video edges
   * - uses a tiny canvas for low CPU use
   * - smoothly interpolates color changes
   * - samples about 8 times/sec
   * =========================================
   */

  useEffect(() => {
    if (!ambientMode) {
      if (
        ambientAnimationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          ambientAnimationRef.current
        );

        ambientAnimationRef.current =
          null;
      }

      return;
    }

    const video = videoRef.current;
    const canvas = ambientCanvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const context = canvas.getContext(
      "2d",
      { willReadFrequently: true }
    );

    if (!context) {
      return;
    }

    canvas.width = 64;
    canvas.height = 36;

    let lastSample = 0;

    let previous: AmbientColors = {
      top: activeTheme.glow,
      right: activeTheme.glow,
      bottom: activeTheme.glow,
      left: activeTheme.glow,
    };

    const parseRgb = (
      color: string
    ): [number, number, number] => {
      const match = color.match(
        /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
      );

      if (!match) {
        return [255, 128, 171];
      }

      return [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      ];
    };

    const sampleRegion = (
      x: number,
      y: number,
      width: number,
      height: number
    ): [number, number, number] => {
      const imageData = context.getImageData(
        x,
        y,
        width,
        height
      );

      const pixels = imageData.data;

      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (
        let i = 0;
        i < pixels.length;
        i += 16
      ) {
        r += pixels[i];
        g += pixels[i + 1];
        b += pixels[i + 2];
        count++;
      }

      if (!count) {
        return [255, 128, 171];
      }

      return [
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count),
      ];
    };

    const smooth = (
      oldColor: [number, number, number],
      newColor: [number, number, number]
    ): [number, number, number] => {
      const factor = 0.12;

      return [
        Math.round(
          oldColor[0] +
            (newColor[0] - oldColor[0]) *
              factor
        ),
        Math.round(
          oldColor[1] +
            (newColor[1] - oldColor[1]) *
              factor
        ),
        Math.round(
          oldColor[2] +
            (newColor[2] - oldColor[2]) *
              factor
        ),
      ];
    };

    const toRgb = (
      color: [number, number, number]
    ) =>
      `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

    const sampleAmbient = (
      timestamp: number
    ) => {
      if (
        timestamp - lastSample >= 120
      ) {
        lastSample = timestamp;

        /*
         * Also works while paused so the
         * current frame can provide the glow.
         */
        if (video.readyState >= 2) {
          try {
            context.drawImage(
              video,
              0,
              0,
              64,
              36
            );

            /*
             * Sample only the edges of the frame.
             */
            const top = sampleRegion(
              8,
              0,
              48,
              7
            );

            const right = sampleRegion(
              57,
              7,
              7,
              22
            );

            const bottom = sampleRegion(
              8,
              29,
              48,
              7
            );

            const left = sampleRegion(
              0,
              7,
              7,
              22
            );

            const next: AmbientColors = {
              top: toRgb(
                smooth(
                  parseRgb(previous.top),
                  top
                )
              ),
              right: toRgb(
                smooth(
                  parseRgb(previous.right),
                  right
                )
              ),
              bottom: toRgb(
                smooth(
                  parseRgb(previous.bottom),
                  bottom
                )
              ),
              left: toRgb(
                smooth(
                  parseRgb(previous.left),
                  left
                )
              ),
            };

            previous = next;
            setAmbientColors(next);
          } catch {
            /*
             * Canvas/CORS fallback.
             */
            const fallback =
              activeTheme.glow;

            previous = {
              top: fallback,
              right: fallback,
              bottom: fallback,
              left: fallback,
            };

            setAmbientColors(previous);
          }
        }
      }

      ambientAnimationRef.current =
        requestAnimationFrame(
          sampleAmbient
        );
    };

    setAmbientColors({
      top: activeTheme.glow,
      right: activeTheme.glow,
      bottom: activeTheme.glow,
      left: activeTheme.glow,
    });

    ambientAnimationRef.current =
      requestAnimationFrame(
        sampleAmbient
      );

    return () => {
      if (
        ambientAnimationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          ambientAnimationRef.current
        );

        ambientAnimationRef.current =
          null;
      }
    };
  }, [
    ambientMode,
    activeTheme.glow,
  ]);

  /*
   * =========================================
   * KEYBOARD CONTROLS
   * =========================================
   */

  useEffect(() => {
    const handleKeyboard =
      (
        event: KeyboardEvent
      ) => {
        const target =
          event.target as HTMLElement;

        if (
          event.defaultPrevented ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          target.isContentEditable ||
          target.closest(
            "button, input, textarea, select, md-slider, md-menu, md-icon-button, [contenteditable='true']"
          )
        ) {
          return;
        }

        const seekAmount = event.shiftKey ? 10 : 5;

        switch (event.key.toLowerCase()) {
          case " ":
          case "k":
            event.preventDefault();
            togglePlay();
            break;

          case "m":
            event.preventDefault();
            toggleMute();
            break;

          case "f":
            event.preventDefault();
            toggleFullscreen();
            break;

          case "p":
            event.preventDefault();
            togglePiP();
            break;

          case "arrowleft":
            event.preventDefault();
            seek(currentTime - seekAmount);
            break;

          case "arrowright":
            event.preventDefault();
            seek(currentTime + seekAmount);
            break;

          case "j":
            event.preventDefault();
            seek(currentTime - 10);
            break;

          case "l":
            event.preventDefault();
            seek(currentTime + 10);
            break;

          case "arrowup":
            event.preventDefault();
            setVideoVolume(volume + 0.05);
            break;

          case "arrowdown":
            event.preventDefault();
            setVideoVolume(volume - 0.05);
            break;

          case "home":
          case "0":
            event.preventDefault();
            seek(0);
            break;

          case "end":
            event.preventDefault();
            seek(duration);
            break;
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    currentTime,
    duration,
    togglePlay,
    toggleMute,
    volume,
  ]);

  /*
   * =========================================
   * SORT QUALITIES
   * =========================================
   */

  const sortedQualities =
    [...qualities].sort(
      (a, b) =>
        b.height - a.height
    );

  /*
   * =========================================
   * VIEWPORT-FIT PLAYER
   *
   * Keeps the complete 16:9 video and its
   * subtle ambient glow visible without page
   * scrolling on the player screen.
   * =========================================
   */

  /*
   * We intentionally leave a small amount of
   * vertical room for a page title/header.
   */
  const viewportFitStyle = `
    .stream-player--viewport-fit {
      /*
       * Desktop:
       * fit the complete player inside the viewport
       * while preserving 16:9.
       */
      width: min(
        100%,
        calc((100dvh - 96px) * 16 / 9)
      );

      max-width: 100%;
      max-height: calc(100dvh - 96px);

      aspect-ratio: 16 / 9;

      margin-inline: auto;
    }

    .stream-player--viewport-fit > video {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    /*
     * Ambient mode extends only a little beyond
     * the video, so keep the glow subtle without
     * creating a large page overflow.
     */
    .stream-player--viewport-fit.stream-player--ambient {
      margin: 0 auto;
    }

    /*
     * Phones are usually height-constrained.
     * Fit the player to the available width first.
     */
    @media (max-width: 700px) {
      .stream-player--viewport-fit {
        width: 100%;
        max-width: 100%;

        max-height:
          calc(
            100dvh - 72px
          );

        aspect-ratio: 16 / 9;
      }
    }

    /*
     * Very short screens: prioritize fitting the
     * complete player vertically.
     */
    @media (max-height: 600px) {
      .stream-player--viewport-fit {
        width: min(
          100%,
          calc((100dvh - 32px) * 16 / 9)
        );

        max-height:
          calc(
            100dvh - 32px
          );
      }
    }
  `;

  /*
   * =========================================
   * RENDER
   * =========================================
   */

  return (
    <div
      ref={playerRef}
      className={`stream-player stream-player--viewport-fit ${
        ambientMode
          ? "stream-player--ambient"
          : ""
      }`}
      style={
        {
          "--player-primary":
            activeTheme.primary,

          "--player-primary-container":
            activeTheme.primaryContainer,

          "--player-on-primary":
            activeTheme.onPrimary,

          "--player-glow":
            activeTheme.glow,

          "--ambient-top":
            ambientColors.top,

          "--ambient-right":
            ambientColors.right,

          "--ambient-bottom":
            ambientColors.bottom,

          "--ambient-left":
            ambientColors.left,
        } as React.CSSProperties
      }
    >
      <style>{viewportFitStyle}</style>

      {/* =================================
          AMBIENT CANVAS
          ================================= */}

      <canvas
        ref={ambientCanvasRef}
        width={32}
        height={18}
        style={{
          display: "none",
        }}
      />

      {/* =================================
          VIDEO
          ================================= */}

      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        onDoubleClick={
          toggleFullscreen
        }
      />

      {/* =================================
          CURRENT QUALITY
          ================================= */}

      {(currentHeight || networkSpeed !== null) && (
        <div className="stream-player__status-labels">
          {currentHeight && (
            <div className="stream-player__quality-label">
              {currentHeight}p
            </div>
          )}

          {networkSpeed !== null && (
            <div className="stream-player__network-speed-label">
              {formatNetworkSpeed(networkSpeed)}
            </div>
          )}
        </div>
      )}

      {showMetrics && (
        <aside
          className="stream-player__metrics"
          aria-label="Video performance metrics"
        >
          <div>
            <span>FPS</span>
            <strong>
              {videoMetrics.fps === null
                ? "—"
                : videoMetrics.fps.toFixed(1)}
            </strong>
          </div>
          <div>
            <span>Resolution</span>
            <strong>
              {videoMetrics.resolution ?? "—"}
            </strong>
          </div>
          <div>
            <span>Frames</span>
            <strong>
              {videoMetrics.decodedFrames.toLocaleString()}
              {" decoded"}
            </strong>
          </div>
          <div>
            <span>Dropped</span>
            <strong>
              {videoMetrics.droppedFrames.toLocaleString()}
            </strong>
          </div>
          <div>
            <span>Buffer</span>
            <strong>
              {videoMetrics.bufferAhead.toFixed(1)}s
            </strong>
          </div>
          <div>
            <span>Network</span>
            <strong>
              {networkSpeed === null
                ? "—"
                : formatNetworkSpeed(networkSpeed)}
            </strong>
          </div>
        </aside>
      )}

      {/* =================================
          LOADING
          ================================= */}

      {loading && !error && (
        <div className="stream-player__loading">
          <md-circular-progress
            indeterminate
          />
        </div>
      )}

      {/* =================================
          ERROR
          ================================= */}

      {error && (
        <div className="stream-player__error">
          <div className="stream-player__error-card">
            <div
              style={{
                marginBottom: 16,
                opacity: 0.7,
                color:
                  "var(--player-primary)",
              }}
            >
              <md-icon>
                error
              </md-icon>
            </div>

            <h3
              style={{
                marginTop: 0,
              }}
            >
              Unable to play video
            </h3>

            <p
              style={{
                opacity: 0.75,
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              {error}
            </p>

            <md-filled-tonal-button
              onClick={() => {
                window.location.reload();
              }}
            >
              <md-icon slot="icon">
                refresh
              </md-icon>

              Retry
            </md-filled-tonal-button>
          </div>
        </div>
      )}

      {/* =================================
          CENTER PLAY BUTTON
          ================================= */}

      {!playing &&
        !loading &&
        !error && (
          <div className="stream-player__center-play">
            <md-icon-button
              aria-label="Play video"
              onClick={
                togglePlay
              }
            >
              <md-icon>
                play_arrow
              </md-icon>
            </md-icon-button>
          </div>
        )}

      {/* =================================
          CONTROLS
          ================================= */}

      {!error && (
        <div className="stream-player__overlay">
          {/* =================================
              PROGRESS
              ================================= */}

          <div className="stream-player__progress">
            {/* BUFFER */}
            <md-linear-progress
              className="stream-player__buffer-progress"
              value={
                duration > 0
                  ? Math.min(
                      1,
                      buffered /
                        duration
                    )
                  : 0
              }
            />

            {/* CURRENT PLAYBACK */}
            <md-linear-progress
              className="stream-player__current-progress"
              value={
                duration > 0
                  ? Math.min(
                      1,
                      currentTime /
                        duration
                    )
                  : 0
              }
            />

            {duration > 0 &&
              bookmarks.map((bookmark) => {
                const position = Math.min(
                  100,
                  Math.max(
                    0,
                    (bookmark.time / duration) * 100
                  )
                );
                const label = `${bookmark.name} — ${formatTime(
                  bookmark.time
                )}`;

                return (
                  <button
                    key={bookmark.id}
                    className="stream-player__bookmark-marker"
                    style={{ left: `${position}%` }}
                    aria-label={`Jump to ${label}`}
                    data-tooltip={label}
                    title={label}
                    onClick={(event) => {
                      event.stopPropagation();
                      seek(bookmark.time);
                    }}
                  />
                );
              })}

            {scrubPreview && (
              <div
                className="stream-player__scrub-preview"
                style={{
                  left: `${scrubPreview.position * 100}%`,
                }}
                aria-hidden="true"
              >
                <div
                  className="stream-player__scrub-image"
                  style={{
                    width: scrubPreview.cue.width,
                    height: scrubPreview.cue.height,
                    backgroundImage: `url("${scrubPreview.cue.imageUrl}")`,
                    backgroundPosition: `-${scrubPreview.cue.x}px -${scrubPreview.cue.y}px`,
                  }}
                />
                <span>
                  {formatTime(scrubPreview.time)}
                </span>
              </div>
            )}

            {/* SEEK */}
            <div
              className="stream-player__progress-hitbox"
              role="slider"
              tabIndex={0}
              aria-label="Video timeline"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              onPointerMove={(event) => {
                updateScrubPreview(
                  event.clientX,
                  event.currentTarget
                );
              }}
              onPointerLeave={() => {
                setScrubPreview(null);
              }}
              onFocus={() => {
                updateScrubPreviewForTime(currentTime);
              }}
              onBlur={() => {
                setScrubPreview(null);
              }}
              onClick={(event) => {
                if (!duration) {
                  return;
                }

                const rect =
                  event.currentTarget.getBoundingClientRect();

                const percentage =
                  (event.clientX -
                    rect.left) /
                  rect.width;

                seek(
                  percentage *
                    duration
                );
              }}
              onKeyDown={(event) => {
                if (!duration) {
                  return;
                }

                const seekStep = event.shiftKey ? 10 : 5;
                let nextTime: number | null = null;

                if (event.key === "ArrowLeft") {
                  nextTime = currentTime - seekStep;
                } else if (event.key === "ArrowRight") {
                  nextTime = currentTime + seekStep;
                } else if (event.key === "Home") {
                  nextTime = 0;
                } else if (event.key === "End") {
                  nextTime = duration;
                }

                if (nextTime !== null) {
                  event.preventDefault();
                  seek(nextTime);
                  updateScrubPreviewForTime(nextTime);
                }
              }}
            />
          </div>

          {/* =================================
              CONTROL ROW
              ================================= */}

          <div className="stream-player__controls">
            {/* PLAY */}

            <md-icon-button
              aria-label={
                playing
                  ? "Pause"
                  : "Play"
              }
              onClick={
                togglePlay
              }
            >
              <md-icon>
                {playing
                  ? "pause"
                  : "play_arrow"}
              </md-icon>
            </md-icon-button>

            {/* MUTE */}

            <div
              className={`stream-player__sound-controls ${
                volumeControlVisible
                  ? "stream-player__sound-controls--expanded"
                  : ""
              }`}
              onMouseEnter={showVolumeControl}
              onMouseLeave={hideVolumeControlLater}
              onFocusCapture={showVolumeControl}
              onBlurCapture={hideVolumeControlLater}
            >
              <md-icon-button
                aria-label={
                  muted
                    ? "Unmute"
                    : "Mute"
                }
                onClick={
                  toggleMute
                }
              >
                <md-icon>
                  {muted ||
                  volume === 0
                    ? "volume_off"
                    : "volume_up"}
                </md-icon>
              </md-icon-button>

              {/* VOLUME */}

              <div
                className="stream-player__volume-control"
              >
                <md-slider
                  className="stream-player__volume-slider"
                  ref={
                    volumeRef as React.RefObject<HTMLElement>
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  value={
                    muted
                      ? 0
                      : volume
                  }
                />
              </div>
            </div>

            {/* TIME */}

            <span className="stream-player__time">
              {formatTime(
                currentTime
              )}{" "}
              /{" "}
              {formatTime(
                duration
              )}
            </span>

            <md-icon-button
              aria-label={`Add bookmark at ${formatTime(currentTime)}`}
              title="Add bookmark"
              disabled={!duration}
              onClick={addBookmark}
            >
              <md-icon>
                bookmark_add
              </md-icon>
            </md-icon-button>

            <div className="stream-player__spacer" />

            {/* =================================
                SETTINGS
                ================================= */}

            <md-icon-button
              id="player-settings-button"
              aria-label="Settings"
              onClick={() => {
                setSettingsPage("root");
                settingsMenuRef.current?.show();
              }}
            >
              <md-icon>
                settings
              </md-icon>
            </md-icon-button>

            {/* =================================
                SETTINGS MENU
                YouTube-style hierarchical menu
                ================================= */}

            <md-menu
              ref={
                settingsMenuRef as React.RefObject<HTMLElement>
              }
              id="player-settings-menu"
              anchor="player-settings-button"
              positioning="popover"
              quick
              x-offset={0}
              y-offset={8}
            >
              {/* ===============================
                  ROOT SETTINGS
                  =============================== */}

              {settingsPage === "root" && (
                <>
                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("quality")
                    }
                  >
                    <md-icon slot="start">
                      hd
                    </md-icon>

                    <div slot="headline">
                      Quality
                    </div>

                    <div slot="supporting-text">
                      {currentQuality === -1
                        ? "Auto"
                        : `${currentHeight ?? ""}p`}
                    </div>

                    <md-icon slot="end">
                      chevron_right
                    </md-icon>
                  </md-menu-item>

                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("bookmarks")
                    }
                  >
                    <md-icon slot="start">
                      bookmarks
                    </md-icon>

                    <div slot="headline">
                      Bookmarks
                    </div>

                    <div slot="supporting-text">
                      {bookmarks.length === 1
                        ? "1 saved timestamp"
                        : `${bookmarks.length} saved timestamps`}
                    </div>

                    <md-icon slot="end">
                      chevron_right
                    </md-icon>
                  </md-menu-item>

                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("speed")
                    }
                  >
                    <md-icon slot="start">
                      speed
                    </md-icon>

                    <div slot="headline">
                      Playback speed
                    </div>

                    <div slot="supporting-text">
                      {playbackRate}x
                    </div>

                    <md-icon slot="end">
                      chevron_right
                    </md-icon>
                  </md-menu-item>

                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("theme")
                    }
                  >
                    <md-icon slot="start">
                      palette
                    </md-icon>

                    <div slot="headline">
                      Player theme
                    </div>

                    <div slot="supporting-text">
                      {theme === "custom"
                        ? "Custom"
                        : theme
                            .charAt(0)
                            .toUpperCase() +
                          theme.slice(1)}
                    </div>

                    <md-icon slot="end">
                      chevron_right
                    </md-icon>
                  </md-menu-item>

                  <md-menu-item
                    onClick={() =>
                      setAmbientMode(
                        (value) => !value
                      )
                    }
                  >
                    <md-icon slot="start">
                      {ambientMode
                        ? "auto_awesome"
                        : "blur_on"}
                    </md-icon>

                    <div slot="headline">
                      Ambient mode
                    </div>

                    <div slot="supporting-text">
                      {ambientMode
                        ? "On"
                        : "Off"}
                    </div>

                    {ambientMode && (
                      <md-icon slot="end">
                        check
                      </md-icon>
                    )}
                  </md-menu-item>

                  <md-menu-item
                    onClick={() =>
                      setShowMetrics(
                        (value) => !value
                      )
                    }
                  >
                    <md-icon slot="start">
                      monitoring
                    </md-icon>

                    <div slot="headline">
                      Video metrics
                    </div>

                    <div slot="supporting-text">
                      {showMetrics ? "On" : "Off"}
                    </div>

                    {showMetrics && (
                      <md-icon slot="end">
                        check
                      </md-icon>
                    )}
                  </md-menu-item>
                </>
              )}

              {/* ===============================
                  QUALITY PAGE
                  =============================== */}

              {settingsPage === "quality" && (
                <>
                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("root")
                    }
                  >
                    <md-icon slot="start">
                      arrow_back
                    </md-icon>

                    <div slot="headline">
                      Quality
                    </div>
                  </md-menu-item>

                  <md-menu-item
                    onClick={() =>
                      changeQuality(-1)
                    }
                  >
                    <md-icon slot="start">
                      auto_awesome
                    </md-icon>

                    <div slot="headline">
                      Auto
                    </div>

                    <div slot="supporting-text">
                      Adaptive quality
                    </div>

                    {currentQuality === -1 && (
                      <md-icon slot="end">
                        check
                      </md-icon>
                    )}
                  </md-menu-item>

                  {sortedQualities.map(
                    (quality) => (
                      <md-menu-item
                        key={quality.index}
                        onClick={() =>
                          changeQuality(
                            quality.index
                          )
                        }
                      >
                        <md-icon slot="start">
                          high_quality
                        </md-icon>

                        <div slot="headline">
                          {quality.height}p
                        </div>

                        {quality.width > 0 && (
                          <div slot="supporting-text">
                            {quality.width} ×{" "}
                            {quality.height}
                          </div>
                        )}

                        {currentQuality ===
                          quality.index && (
                          <md-icon slot="end">
                            check
                          </md-icon>
                        )}
                      </md-menu-item>
                    )
                  )}
                </>
              )}

              {/* ===============================
                  SPEED PAGE
                  =============================== */}

              {settingsPage === "speed" && (
                <>
                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("root")
                    }
                  >
                    <md-icon slot="start">
                      arrow_back
                    </md-icon>

                    <div slot="headline">
                      Playback speed
                    </div>
                  </md-menu-item>

                  {PLAYBACK_RATES.map(
                    (speed) => (
                      <md-menu-item
                        key={speed}
                        onClick={() =>
                          changeSpeed(speed)
                        }
                      >
                        <div slot="headline">
                          {speed}x
                        </div>

                        {playbackRate ===
                          speed && (
                          <md-icon slot="end">
                            check
                          </md-icon>
                        )}
                      </md-menu-item>
                    )
                  )}
                </>
              )}

              {/* ===============================
                  THEME PAGE
                  =============================== */}

              {settingsPage === "theme" && (
                <>
                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("root")
                    }
                  >
                    <md-icon slot="start">
                      arrow_back
                    </md-icon>

                    <div slot="headline">
                      Player theme
                    </div>
                  </md-menu-item>

                  {(
                    [
                      ["pink", "#FF80AB"],
                      ["blue", "#8AB4F8"],
                      ["purple", "#D0BCFF"],
                      ["green", "#7DDC9A"],
                      ["orange", "#FFB870"],
                      ["red", "#FF8A80"],
                      ["cyan", "#70D7E8"],
                    ] as const
                  ).map(
                    ([name, color]) => (
                      <md-menu-item
                        key={name}
                        onClick={() =>
                          setTheme(name)
                        }
                      >
                        <md-icon
                          slot="start"
                          style={{ color }}
                        >
                          circle
                        </md-icon>

                        <div slot="headline">
                          {name
                            .charAt(0)
                            .toUpperCase() +
                            name.slice(1)}
                        </div>

                        <div slot="supporting-text">
                          {color}
                        </div>

                        {theme === name && (
                          <md-icon slot="end">
                            check
                          </md-icon>
                        )}
                      </md-menu-item>
                    )
                  )}

                  <md-menu-item
                    keep-open
                    onClick={() => {
                      setTheme("custom");

                      document
                        .getElementById(
                          "player-color-picker"
                        )
                        ?.click();
                    }}
                  >
                    <md-icon
                      slot="start"
                      style={{
                        color: customColor,
                      }}
                    >
                      colorize
                    </md-icon>

                    <div slot="headline">
                      Custom
                    </div>

                    <div slot="supporting-text">
                      {customColor.toUpperCase()}
                    </div>

                    {theme === "custom" && (
                      <md-icon slot="end">
                        check
                      </md-icon>
                    )}
                  </md-menu-item>
                </>
              )}

              {/* ===============================
                  BOOKMARKS PAGE
                  =============================== */}

              {settingsPage === "bookmarks" && (
                <>
                  <md-menu-item
                    keep-open
                    onClick={() =>
                      setSettingsPage("root")
                    }
                  >
                    <md-icon slot="start">
                      arrow_back
                    </md-icon>

                    <div slot="headline">
                      Bookmarks
                    </div>
                  </md-menu-item>

                  {bookmarks.length === 0 && (
                    <md-menu-item>
                      <md-icon slot="start">
                        bookmark_border
                      </md-icon>

                      <div slot="headline">
                        No bookmarks yet
                      </div>

                      <div slot="supporting-text">
                        Save the current time with the bookmark button.
                      </div>
                    </md-menu-item>
                  )}

                  {bookmarks.map((bookmark) => (
                    <md-menu-item
                      key={bookmark.id}
                      keep-open
                      onClick={() => {
                        seek(bookmark.time);
                        settingsMenuRef.current?.close();
                      }}
                    >
                      <md-icon slot="start">
                        bookmark
                      </md-icon>

                      <div slot="headline">
                        {bookmark.name ||
                          `Bookmark at ${formatTime(bookmark.time)}`}
                      </div>

                      <div slot="supporting-text">
                        {formatTime(bookmark.time)}
                      </div>

                      <md-icon-button
                        slot="end"
                        aria-label={`Remove bookmark at ${formatTime(bookmark.time)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeBookmark(bookmark.id);
                        }}
                      >
                        <md-icon>
                          delete
                        </md-icon>
                      </md-icon-button>
                    </md-menu-item>
                  ))}
                </>
              )}
            </md-menu>

            {/* =================================
                PICTURE IN PICTURE
                ================================= */}

            <md-icon-button
              aria-label="Picture in picture"
              onClick={
                togglePiP
              }
            >
              <md-icon>
                picture_in_picture_alt
              </md-icon>
            </md-icon-button>
            <md-icon-button
              aria-label="Fullscreen"
              onClick={
                toggleFullscreen
              }
            >
              <md-icon>
                fullscreen
              </md-icon>
            </md-icon-button>
          </div>
        </div>
      )}

      {bookmarkDialog && (
        <div
          className="stream-player__bookmark-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setBookmarkDialog(null);
            }
          }}
        >
          <form
            className="stream-player__bookmark-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bookmark-dialog-title"
            onSubmit={(event) => {
              event.preventDefault();
              saveBookmark();
            }}
          >
            <div className="stream-player__bookmark-dialog-icon">
              <md-icon>
                bookmark_add
              </md-icon>
            </div>

            <h2 id="bookmark-dialog-title">
              Add bookmark
            </h2>

            <p>
              Save {formatTime(bookmarkDialog.time)} with a memorable name.
            </p>

            <label htmlFor="bookmark-name">
              Bookmark name
            </label>

            <input
              id="bookmark-name"
              autoFocus
              value={bookmarkDialog.name}
              maxLength={80}
              onChange={(event) => {
                setBookmarkDialog((dialog) =>
                  dialog
                    ? {
                        ...dialog,
                        name: event.target.value,
                      }
                    : null
                );
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setBookmarkDialog(null);
                }
              }}
            />

            <div className="stream-player__bookmark-dialog-actions">
              <button
                type="button"
                onClick={() => setBookmarkDialog(null)}
              >
                Cancel
              </button>
              <button type="submit">
                Save bookmark
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================
          CUSTOM COLOR PICKER
          ================================= */}

      <input
        id="player-color-picker"
        type="color"
        value={customColor}
        onChange={(event) => {
          setCustomColor(
            event.target.value
          );

          setTheme("custom");
        }}
        aria-label="Choose custom player color"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents:
            "none",
        }}
      />
    </div>
  );
}
