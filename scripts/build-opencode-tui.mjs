import * as esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

await esbuild.build({
  entryPoints: ["src/tui/index.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node18"],
  outfile: "dist/opencode-tui.mjs",
  plugins: [solidPlugin()],
  external: [
    "solid-js",
    "solid-js/web",
    "solid-js/store",
    "@opentui/core",
    "@opentui/solid",
    "@opencode/plugin",
    "@opencode/plugin/tui",
    "effect",
    "effect/*",
  ],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __pathDirname } from 'node:path'; const require = __createRequire(import.meta.url); const __dirname = __pathDirname(__fileURLToPath(import.meta.url));",
  },
});