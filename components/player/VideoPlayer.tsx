"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Hls from "hls.js";

type VideoPlayerProps = {
  src: string;
};

type Quality = {
  index: number;
  height: number;
  width: number;
  bitrate: number;
};

export default function VideoPlayer({
  src,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [buffered, setBuffered] = useState(0);

  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);

  const [playbackRate, setPlaybackRate] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const handleVolume = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const value = Number(event.target.value);

    video.volume = value;

    if (value > 0) {
      video.muted = false;
      setMuted(false);
    }

    setVolume(value);
  };

  const handleSeek = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const value = Number(event.target.value);

    video.currentTime = value;
    setCurrentTime(value);
  };

  const handleQualityChange = (qualityIndex: number) => {
    const hls = hlsRef.current;

    if (!hls) {
      return;
    }

    hls.currentLevel = qualityIndex;

    setCurrentQuality(qualityIndex);
    setShowSettings(false);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.playbackRate = speed;

    setPlaybackRate(speed);
    setShowSettings(false);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (
        document.pictureInPictureEnabled
      ) {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error(
        "Picture-in-picture failed:",
        error
      );
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) {
      return "00:00";
    }

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(secs).padStart(2, "0")}`;
    }

    return `${minutes}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setLoading(true);
    setError(null);

    if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      video.src = src;

      return;
    }

    if (!Hls.isSupported()) {
      setError(
        "HLS is not supported by this browser."
      );

      setLoading(false);

      return;
    }

    const hls = new Hls({
      enableWorker: true,

      // Small buffer for our development player.
      maxBufferLength: 30,
    });

    hlsRef.current = hls;

    hls.loadSource(src);
    hls.attachMedia(video);

   hls.on(
  Hls.Events.MANIFEST_PARSED,
  (_event, data) => {
    console.log("HLS manifest parsed");
    console.log("Available HLS levels:", data.levels);

    const availableQualities: Quality[] =
      data.levels.map((level, index) => ({
        index,
        height: level.height,
        width: level.width,
        bitrate: level.bitrate,
      }));

    console.log(
      "Available qualities:",
      availableQualities
    );

    setQualities(availableQualities);

    hls.currentLevel = -1;
    setCurrentQuality(-1);

    setLoading(false);
  }
);

    hls.on(Hls.Events.ERROR, (_event, data) => {
      console.error("HLS error:", data);

      if (data.fatal) {
        setError(
          "Unable to play this video."
        );
      }
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
if (!video) {
      return;
    }
    console.log("VIDEO PLAYER INITIALIZED");
console.log("HLS URL:", src);
console.log("Hls.isSupported():", Hls.isSupported());
console.log(
  "Native HLS:",
  video?.canPlayType(
    "application/vnd.apple.mpegurl"
  )
);

    

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      if (video.buffered.length > 0) {
        const bufferedEnd =
          video.buffered.end(
            video.buffered.length - 1
          );

        setBuffered(bufferedEnd);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
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

    video.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
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

    return () => {
      video.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
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
    };
  }, []);

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent
    ) => {
      const target = event.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;

        case "m":
          toggleMute();
          break;

        case "f":
          toggleFullscreen();
          break;

        case "arrowleft": {
          const video = videoRef.current;

          if (video) {
            video.currentTime = Math.max(
              0,
              video.currentTime - 5
            );
          }

          break;
        }

        case "arrowright": {
          const video = videoRef.current;

          if (video) {
            video.currentTime = Math.min(
              video.duration,
              video.currentTime + 5
            );
          }

          break;
        }
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
    togglePlay,
    toggleMute,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
    >
      {/* VIDEO */}

      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading */}

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      )}

      {/* Error */}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-white">
          <div>
            <p className="text-lg font-medium">
              {error}
            </p>

            <button
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-black"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Center play button */}

      {!playing && !loading && !error && (
        <button
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition hover:scale-105"
        >
          ▶
        </button>
      )}

      {/* Controls */}

      {!error && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-10">
          {/* Progress */}

          <div className="relative mb-3">
            <div
              className="absolute inset-y-0 left-0 h-1.5 rounded-full bg-white/20"
              style={{
                width:
                  duration > 0
                    ? `${(buffered / duration) * 100}%`
                    : "0%",
              }}
            />

            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="relative z-10 w-full cursor-pointer accent-white"
            />
          </div>

          {/* Controls row */}

          <div className="flex items-center gap-3 text-white">
            {/* Play */}

            <button
              onClick={togglePlay}
              className="text-xl"
              aria-label={
                playing
                  ? "Pause"
                  : "Play"
              }
            >
              {playing ? "❚❚" : "▶"}
            </button>

            {/* Volume */}

            <button
              onClick={toggleMute}
              aria-label="Mute"
            >
              {muted || volume === 0
                ? "🔇"
                : "🔊"}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={handleVolume}
              className="w-20 accent-white"
            />

            {/* Time */}

            <span className="text-sm tabular-nums">
              {formatTime(currentTime)} /{" "}
              {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Settings */}

            <div className="relative">
              <button
                onClick={() =>
                  setShowSettings(
                    (value) => !value
                  )
                }
                className="text-lg"
              >
                ⚙
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 w-52 rounded-xl border border-white/10 bg-black/95 p-2 shadow-xl backdrop-blur">
                  {/* Quality */}

                  <div className="px-3 py-2 text-xs text-white/50">
                    QUALITY
                  </div>

                  <button
                    onClick={() =>
                      handleQualityChange(-1)
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10 ${
                      currentQuality === -1
                        ? "bg-white/10"
                        : ""
                    }`}
                  >
                    <span>Auto</span>

                    {currentQuality ===
                      -1 && (
                      <span>✓</span>
                    )}
                  </button>

                  {qualities
                    .sort(
                      (a, b) =>
                        b.height -
                        a.height
                    )
                    .map((quality) => (
                      <button
                        key={quality.index}
                        onClick={() =>
                          handleQualityChange(
                            quality.index
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10 ${
                          currentQuality ===
                          quality.index
                            ? "bg-white/10"
                            : ""
                        }`}
                      >
                        <span>
                          {quality.height}p
                        </span>

                        {currentQuality ===
                          quality.index && (
                          <span>✓</span>
                        )}
                      </button>
                    ))}

                  {/* Speed */}

                  <div className="mt-2 border-t border-white/10 px-3 py-2 text-xs text-white/50">
                    SPEED
                  </div>

                  {[
                    0.5,
                    0.75,
                    1,
                    1.25,
                    1.5,
                    2,
                  ].map((speed) => (
                    <button
                      key={speed}
                      onClick={() =>
                        handleSpeedChange(
                          speed
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10 ${
                        playbackRate ===
                        speed
                          ? "bg-white/10"
                          : ""
                      }`}
                    >
                      <span>
                        {speed}x
                      </span>

                      {playbackRate ===
                        speed && (
                        <span>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture in picture */}

            <button
              onClick={
                togglePictureInPicture
              }
              aria-label="Picture in picture"
            >
              ▣
            </button>

            {/* Fullscreen */}

            <button
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}