import { existsSync, readFileSync } from "node:fs"

loadDotenv()

await import("./payment-lifecycle-actions.integration.test.ts")

function loadDotenv() {
  if (!existsSync(".env")) {
    return
  }

  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const delimiterIndex = trimmed.indexOf("=")

    if (delimiterIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, delimiterIndex)

    if (process.env[key]) {
      continue
    }

    process.env[key] = trimmed
      .slice(delimiterIndex + 1)
      .replace(/^["']|["']$/g, "")
  }
}
