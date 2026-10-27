import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

const provided = [
  "effect",
  "@opencode/plugin/gui",
  "@opencode/plugin/gui/main",
  "@opencode/plugin/rpc",
  "@opencode/schema/rpc",
  "@opencode/client",
  "@opencode/client/effect",
  "solid-js",
  "solid-js/web",
  "solid-js/store",
  "@opencode/plugin/gui/file",
  "@opencode/plugin/gui/review",
  "@opencode/plugin/gui/browser",
  "@opencode/client/solid",
]

export default defineConfig({
  plugins: [solid()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/gui.tsx",
      formats: ["cjs"],
      fileName: () => "gui-experimental.cjs",
    },
    rollupOptions: {
      external: [...provided, "electron"],
      output: { exports: "named", inlineDynamicImports: true },
    },
  },
})