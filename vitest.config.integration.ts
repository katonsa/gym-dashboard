import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/**/*.integration.test.ts"],
    fileParallelism: false,
    env: loadEnv(mode, process.cwd(), ""),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
}))
