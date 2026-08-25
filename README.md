# Stream Video Player

An advanced, feature-rich, and secure HTML5/HLS video player component built for Modern React and Next.js applications. Features custom Material Design 3 controls, adaptive HLS bitrate streaming, Widevine DRM support, dynamic ambient lighting, customizable themes, WebVTT scrub previews, video telemetry metrics, and timestamp bookmarks.

---

## 🚀 Features

- **📺 Adaptive HLS Streaming**: Powered by `hls.js` with automatic quality switching, manual height selection (360p - 2160p+), and instant network bandwidth monitoring.
- **🔒 DRM & Security Support**: Built-in support for Widevine DRM with hardware-backed (`L1`) or software-based (`L3`) decryption security levels.
- **🎨 Themes & Custom Styling**:
  - 7 preset Material themes (`pink`, `blue`, `purple`, `green`, `orange`, `red`, `cyan`).
  - Custom color picker support to match any brand design system.
  - YouTube-style **Ambient Glow Mode** sampling edge colors in real-time.
- **🖼️ WebVTT Storyboard Previews**: Interactive thumbnail preview tooltip during timeline scrubbing.
- **🔖 Timestamp Bookmarks**: Save, label, jump to, and delete favorite timestamps with persistent `localStorage` support.
- **📊 Real-Time Video Metrics**: Monitor FPS, decoded/dropped frame counters, resolution, buffer length, and throughput speed in real-time.
- **⌨️ Rich Keyboard Shortcuts**: Play/pause, seek, volume adjust, fullscreen, Picture-in-Picture, and zero-jump navigation.
- **📱 Responsive & Viewport Fit**: Optimized 16:9 aspect ratio scaling with auto-fitting for mobile and desktop viewports.
- **🎨 Design System Variants**: Pick from multiple UI designs out of the box (`material3`, `material2`, `material1`, `shadcn`, `minimal`, `liquidglass`).

---

## 📦 Installation & Setup

To integrate this video player into your React or Next.js project using `npm`:

```bash
npm install hls.js @material/web @fontsource/material-symbols-rounded
```

### Next.js Client Component Setup

Ensure `@fontsource/material-symbols-rounded` CSS is imported in your global styles or layout:

```tsx
// app/layout.tsx or pages/_app.tsx
import "@fontsource/material-symbols-rounded";
import "@/app/globals.css";
```

Because the player uses DOM APIs and HLS Web Workers, import the component with client-side dynamic rendering in Next.js App Router:

```tsx
"use client";

import dynamic from "next/dynamic";

const VideoPlayer = dynamic(
  () => import("@/components/player/VideoPlayer"),
  { ssr: false }
);

export default VideoPlayer;
```

---

## 💻 Usage & Integration Examples

### 1. Standard HLS Playback

```tsx
import VideoPlayer from "@/components/player/VideoPlayerClient";

export default function Page() {
  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <VideoPlayer
        src="https://example.com/video/master.m3u8"
        storyboardSrc="https://example.com/video/storyboard.vtt"
      />
    </div>
  );
}
```

### 2. UI Player Variants (Apple Liquid Glass, Material 1/2/3, Shadcn UI, Minimal)

Choose the player aesthetic that matches your application design system using the `variant` prop:

```tsx
import VideoPlayer from "@/components/player/VideoPlayerClient";

export default function VariantsDemoPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Apple Liquid Glass Style */}
      <VideoPlayer variant="liquidglass" src="https://example.com/video/master.m3u8" />

      {/* Material 3 (Default) */}
      <VideoPlayer variant="material3" src="https://example.com/video/master.m3u8" />

      {/* Shadcn UI Style */}
      <VideoPlayer variant="shadcn" src="https://example.com/video/master.m3u8" />

      {/* Material 2 Style */}
      <VideoPlayer variant="material2" src="https://example.com/video/master.m3u8" />

      {/* Material 1 Classic Flat Style */}
      <VideoPlayer variant="material1" src="https://example.com/video/master.m3u8" />

      {/* Ultra Clean Minimal Style */}
      <VideoPlayer variant="minimal" src="https://example.com/video/master.m3u8" />
    </div>
  );
}
```

### 2. High-Security Widevine DRM Integration

Secure video content playback using Widevine DRM configurations:

```tsx
import VideoPlayer from "@/components/player/VideoPlayerClient";

export default function SecurePlayerPage() {
  return (
    <VideoPlayer
      src="https://example.com/protected/master.m3u8"
      drm={{
        widevineLicenseUrl: "https://license-server.example.com/proxy",
        widevineServerCertificateUrl: "https://license-server.example.com/cert.bin",
        level: "L1", // Hardware secure ('L1') or software secure ('L3')
      }}
    />
  );
}
```

#### DRM Security Levels (`level`):
- `"L1"`: Maps to `HW_SECURE_ALL` for hardware-enforced DRM decryption.
- `"L3"`: Maps to `SW_SECURE_DECRYPTION` for software-level DRM decryption.
- `"auto"`: Allows the browser and HLS engine to negotiate the highest supported security level.

---

## 🎨 Themes, Custom Colors & Styling

The player includes built-in settings to easily customize theme colors or let end-users choose their preferred visual style:

```tsx
/* CSS Custom Properties supported by the player container */
.stream-player {
  --player-primary: #ff80ab;
  --player-primary-container: #7d2949;
  --player-on-primary: #ffd9e2;
  --player-glow: rgba(255, 128, 171, 0.65);
}
```

### Built-in Preset Themes

Select preset themes directly from the in-player Settings menu:
- 🌸 **Pink** (Default)
- 🔵 **Blue**
- 💜 **Purple**
- 🟢 **Green**
- 🟧 **Orange**
- 🔴 **Red**
- 🩵 **Cyan**
- 🎨 **Custom Color**: Pick any hex color hex code (`#RRGGBB`) dynamically!

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` / `K` | Toggle Play / Pause |
| `M` | Toggle Mute |
| `F` | Toggle Fullscreen |
| `P` | Toggle Picture-in-Picture |
| `←` / `→` | Seek backward / forward 5s (10s with `Shift`) |
| `J` / `L` | Seek backward / forward 10s |
| `↑` / `↓` | Volume Up / Down 5% |
| `0` / `Home` | Jump to start of video |
| `End` | Jump to end of video |

---
```
