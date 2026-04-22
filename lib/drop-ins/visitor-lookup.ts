export type DropInVisitorLookupRow = {
  visitorName: string | null
  visitorContact: string | null
  visitedAt: Date
}

export type DropInVisitorLookupOption = {
  id: string
  label: string
  visitorName?: string
  visitorContact?: string
  lastVisitedAt: string
}

const DEFAULT_LOOKUP_LIMIT = 50

export function buildDropInVisitorLookupOptions(
  rows: DropInVisitorLookupRow[],
  limit = DEFAULT_LOOKUP_LIMIT
): DropInVisitorLookupOption[] {
  const visitors = new Map<string, DropInVisitorLookupOption>()

  for (const row of rows) {
    const visitorName = optionalText(row.visitorName)
    const visitorContact = optionalText(row.visitorContact)

    if (!visitorName && !visitorContact) {
      continue
    }

    const lookupKey = getLookupKey(visitorName, visitorContact)
    const existing = visitors.get(lookupKey)

    if (existing && existing.lastVisitedAt >= row.visitedAt.toISOString()) {
      continue
    }

    visitors.set(lookupKey, {
      id: lookupKey,
      label: getLookupLabel(visitorName, visitorContact),
      visitorName,
      visitorContact,
      lastVisitedAt: row.visitedAt.toISOString(),
    })
  }

  return Array.from(visitors.values())
    .sort((left, right) =>
      right.lastVisitedAt.localeCompare(left.lastVisitedAt)
    )
    .slice(0, limit)
}

function getLookupKey(visitorName?: string, visitorContact?: string) {
  if (visitorContact) {
    return `contact:${visitorContact.toLowerCase()}`
  }

  return `name:${visitorName?.toLowerCase() ?? ""}`
}

function getLookupLabel(visitorName?: string, visitorContact?: string) {
  if (visitorName && visitorContact) {
    return `${visitorName} (${visitorContact})`
  }

  return visitorName ?? visitorContact ?? "Identified visitor"
}

function optionalText(value: string | null) {
  const trimmed = value?.trim()

  return trimmed || undefined
}
