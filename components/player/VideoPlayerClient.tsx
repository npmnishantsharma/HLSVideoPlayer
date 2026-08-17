"use client";

import dynamic from "next/dynamic";

const VideoPlayer = dynamic(
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
        <md-circular-progress indeterminate />
      </div>
    ),
  }
);

export default VideoPlayer;