import { defineConfig } from "vite";

// Relative base so the built `dist/` output can be dropped into any static
// host or subpath (itch.io, GitHub Pages, an embedded preview) without
// needing to be served from the domain root.
export default defineConfig({
  base: "./",
});
