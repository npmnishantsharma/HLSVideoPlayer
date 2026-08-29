## 2024-10-24 - Optimizing Video Storyboard Previews
**Learning:** Using `Array.prototype.find()` in high-frequency event handlers (like `onPointerMove` scrubbing events) with potentially thousands of array elements (VTT thumbnails for long videos) causes a significant CPU bottleneck due to O(n) linear search.
**Action:** Always ensure that timestamp-based data structures (like WebVTT cues) are pre-sorted during parsing, allowing the use of O(log n) Binary Search algorithms for lookups in `requestAnimationFrame` or pointer event handlers.
## 2024-06-13 - Direct DOM Mutation for High-Frequency Visuals
**Learning:** In highly complex React components (like `VideoPlayer` with ambient mode enabled), updating state very frequently (e.g., 8 times per second for color shifts) triggers massive full-component re-renders that lead to significant CPU load and potential jank.
**Action:** For high-frequency visual updates that only affect CSS properties, use direct DOM mutation (`ref.current.style.setProperty`) instead of React `useState` to avoid unnecessary React rendering cycles, keeping CPU usage low while maintaining visually identical results.
