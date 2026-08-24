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
        drm={{
          widevineLicenseUrl:"https://cwip-shaka.widevine.com/proxy",
          widevineServerCertificateUrl:"https://cwip-shaka.widevine.com/cert/sample_cert.bin",
          level:"L1"
        }}
      />
    </main>
  );
}