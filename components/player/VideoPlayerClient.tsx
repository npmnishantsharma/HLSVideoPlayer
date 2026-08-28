"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";
import type VideoPlayerComponent from "./VideoPlayer";

const VideoPlayer = dynamic<ComponentProps<typeof VideoPlayerComponent>>(
  () => import("./VideoPlayer"),
  {
    ssr: false,
    loading: () => (
      <div
        className="stream-player stream-player--loading"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          width: "100%",
          height: "100vh",
        }}
      >
        <md-circular-progress aria-label="Loading video player" indeterminate />
      </div>
    ),
  }
);

export default VideoPlayer;