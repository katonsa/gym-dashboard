export type CsvCellValue = string | number | null | undefined

export function toCsv(headers: string[], rows: CsvCellValue[][]) {
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n")
}

export function escapeCsvCell(value: CsvCellValue) {
  const text = value === null || value === undefined ? "" : String(value)

  if (!/[",\n\r]/.test(text)) {
    return text
  }

  return `"${text.replace(/"/g, '""')}"`
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  })
}

export function toDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return ""
  }

  return new Date(value).toISOString().slice(0, 10)
}
