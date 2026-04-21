import { expect, test } from "vitest"

import {
  buildDropInVisitorLookupOptions,
  type DropInVisitorLookupRow,
} from "../lib/dashboard/drop-in-visitor-lookup.ts"

test("builds lookup options for identified drop-in visitors", () => {
  const rows: DropInVisitorLookupRow[] = [
    {
      visitorName: null,
      visitorContact: null,
      visitedAt: new Date("2026-04-18T01:00:00.000Z"),
    },
    {
      visitorName: " Fajar Nugroho ",
      visitorContact: " FAJAR@example.com ",
      visitedAt: new Date("2026-04-17T01:00:00.000Z"),
    },
    {
      visitorName: "Fajar N.",
      visitorContact: "fajar@example.com",
      visitedAt: new Date("2026-04-19T01:00:00.000Z"),
    },
    {
      visitorName: "Rita Amanda",
      visitorContact: null,
      visitedAt: new Date("2026-04-16T01:00:00.000Z"),
    },
  ]

  expect(buildDropInVisitorLookupOptions(rows)).toStrictEqual([
    {
      id: "contact:fajar@example.com",
      label: "Fajar N. (fajar@example.com)",
      visitorName: "Fajar N.",
      visitorContact: "fajar@example.com",
      lastVisitedAt: "2026-04-19T01:00:00.000Z",
    },
    {
      id: "name:rita amanda",
      label: "Rita Amanda",
      visitorName: "Rita Amanda",
      visitorContact: undefined,
      lastVisitedAt: "2026-04-16T01:00:00.000Z",
    },
  ])
})

test("sorts visitor lookup options newest first and caps the result", () => {
  const rows: DropInVisitorLookupRow[] = [
    {
      visitorName: "Old Visitor",
      visitorContact: "old@example.com",
      visitedAt: new Date("2026-04-10T01:00:00.000Z"),
    },
    {
      visitorName: "Newest Visitor",
      visitorContact: "new@example.com",
      visitedAt: new Date("2026-04-20T01:00:00.000Z"),
    },
    {
      visitorName: "Middle Visitor",
      visitorContact: "middle@example.com",
      visitedAt: new Date("2026-04-15T01:00:00.000Z"),
    },
  ]

  expect(
    buildDropInVisitorLookupOptions(rows, 2).map((visitor) => visitor.label)
  ).toStrictEqual([
    "Newest Visitor (new@example.com)",
    "Middle Visitor (middle@example.com)",
  ])
})
