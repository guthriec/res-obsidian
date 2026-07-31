import * as esbuild from "esbuild";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  platform: "node",
  target: "ES2020",
  format: "cjs",
  external: [
    "obsidian",
    ...builtins,
  ],
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  logLevel: "info",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
