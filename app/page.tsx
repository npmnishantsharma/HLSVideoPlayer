import VideoPlayer from "@/components/player/VideoPlayerClient";

export default function TestPlayerPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: "#111",
        color: "white",
      }}
    >      <VideoPlayer
        src="/api/stream/test-720/master.m3u8"
      />
    </main>
  );
}
