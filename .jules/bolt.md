## 2024-10-24 - Optimizing Video Storyboard Previews
**Learning:** Using `Array.prototype.find()` in high-frequency event handlers (like `onPointerMove` scrubbing events) with potentially thousands of array elements (VTT thumbnails for long videos) causes a significant CPU bottleneck due to O(n) linear search.
**Action:** Always ensure that timestamp-based data structures (like WebVTT cues) are pre-sorted during parsing, allowing the use of O(log n) Binary Search algorithms for lookups in `requestAnimationFrame` or pointer event handlers.
