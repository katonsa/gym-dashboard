export function normalizeDropInVisitorContact(
  visitorContact: string | null | undefined
) {
  if (visitorContact === null || visitorContact === undefined) {
    return null
  }

  return visitorContact.trim().toLowerCase()
}
