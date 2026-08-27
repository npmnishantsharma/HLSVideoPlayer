## 2024-10-24 - Optimizing Video Storyboard Previews
**Learning:** Using `Array.prototype.find()` in high-frequency event handlers (like `onPointerMove` scrubbing events) with potentially thousands of array elements (VTT thumbnails for long videos) causes a significant CPU bottleneck due to O(n) linear search.
**Action:** Always ensure that timestamp-based data structures (like WebVTT cues) are pre-sorted during parsing, allowing the use of O(log n) Binary Search algorithms for lookups in `requestAnimationFrame` or pointer event handlers.

## 2024-05-24 - [Direct DOM Mutation for High-Frequency Updates]
**Learning:** React state updates (`useState`) are too slow for high-frequency visual updates (like `requestAnimationFrame` for ambient video lighting), causing unnecessary full-component re-renders 8+ times a second.
**Action:** Use direct DOM mutations (`ref.current.style.setProperty`) to bypass the React render cycle for high-frequency CSS variable updates, drastically reducing CPU usage while preserving readability.
