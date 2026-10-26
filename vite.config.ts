import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src/client",
  plugins: [react()],
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    include: ["src/game/**/*.test.ts", "src/worker/**/*.test.ts"],
  },
});
