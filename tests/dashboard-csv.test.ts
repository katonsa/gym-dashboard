import { describe, expect, test } from "vitest"

import { escapeCsvCell, toCsv } from "../lib/dashboard/csv.ts"

describe("dashboard CSV helpers", () => {
  test("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvCell('A "quoted", value')).toBe('"A ""quoted"", value"')
    expect(escapeCsvCell("Line\nbreak")).toBe('"Line\nbreak"')
  })

  test("builds CSV rows with blank nullish cells", () => {
    expect(
      toCsv(
        ["name", "notes"],
        [
          ["Ari", null],
          ["Sinta", "monthly, active"],
        ]
      )
    ).toBe('name,notes\nAri,\nSinta,"monthly, active"')
  })
})
