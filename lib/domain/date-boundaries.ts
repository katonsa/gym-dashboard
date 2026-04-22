export function getGymLocalDayBoundary(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone)

  return getZonedDateTimeInstant(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  )
}

export function getGymLocalDayWindow(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone)
  const start = getZonedDateTimeInstant(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  )
  const end = getZonedDateTimeInstant(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day + 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  )

  return { start, end }
}

export function getGymLocalMonthWindow(
  date: Date,
  timeZone: string,
  monthOffset = 0
) {
  const parts = getZonedDateParts(date, timeZone)
  const start = getZonedDateTimeInstant(
    {
      year: parts.year,
      month: parts.month + monthOffset,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  )
  const end = getZonedDateTimeInstant(
    {
      year: parts.year,
      month: parts.month + monthOffset + 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  )

  return { start, end }
}

export function getGymLocalDateInput(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone)
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")

  return `${parts.year}-${month}-${day}`
}

type ZonedDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getZonedDateTimeInstant(parts: ZonedDateParts, timeZone: string) {
  const utcParts = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )
  let instant = new Date(utcParts)

  for (let index = 0; index < 2; index += 1) {
    instant = new Date(utcParts - getTimeZoneOffset(instant, timeZone))
  }

  return instant
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone)
  const zonedTimeAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return zonedTimeAsUtc - date.getTime()
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((item) => item.type === type)

    if (!part) {
      throw new Error(`Missing ${type} date part.`)
    }

    return Number(part.value)
  }

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  }
}
