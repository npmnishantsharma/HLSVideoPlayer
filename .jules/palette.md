## 2024-05-24 - Material Web Components ARIA Roles
**Learning:** Custom Material Web components (e.g., `<md-slider>`, `<md-circular-progress>`) lack native semantic meaning for screen readers and often require explicit `aria-label` attributes. Conversely, when creating custom accessible controls (like a custom timeline slider over progress bars), the underlying UI components (like `<md-linear-progress>`) should be hidden from screen readers using `aria-hidden="true"` to prevent duplicate or confusing announcements.
**Action:** Always ensure Material components have `aria-label` when they convey meaning or allow interaction without a visible label. Hide presentation-only or redundant UI elements from screen readers with `aria-hidden="true"`.
## 2026-09-02 - Add tooltips to icon-only buttons
**Learning:** Icon-only components (such as `<md-icon-button>`) should include a `title` attribute to provide visual hover tooltips for mouse users, in addition to `aria-label`s for screen readers.
**Action:** Always ensure icon-only interactive elements have a `title` attribute.
