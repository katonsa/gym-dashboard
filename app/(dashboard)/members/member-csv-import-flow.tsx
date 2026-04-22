"use client"

import Papa from "papaparse"
import * as React from "react"
import { Upload, FileDown, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  buildFailedMemberImportCsv,
  detectMemberImportMapping,
  mapCsvObjectsToMemberImportRows,
  memberImportFieldLabels,
  memberImportFields,
  type MemberImportMapping,
  type MemberImportMappedRow,
  type MemberImportValidatedRow,
} from "@/lib/dashboard/member-import"
import { type PlanTier, titleCase } from "@/lib/dashboard"
import { cn } from "@/lib/utils"
import {
  confirmMemberImport,
  previewMemberImport,
  type ConfirmMemberImportActionResult,
} from "./import-actions"

const maxFileSize = 2 * 1024 * 1024
const maxRows = 2000

type ParsedCsvState = {
  headers: string[]
  records: Record<string, unknown>[]
}

type ImportSummary = Extract<ConfirmMemberImportActionResult, { success: true }>

export function MemberCsvImportFlow({
  initialJoinDate,
  triggerLabel = "Import CSV",
}: {
  planTiers: PlanTier[]
  initialJoinDate: string
  triggerLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [parsedCsv, setParsedCsv] = React.useState<ParsedCsvState | null>(null)
  const [mapping, setMapping] = React.useState<MemberImportMapping>({})
  const [mappedRows, setMappedRows] = React.useState<MemberImportMappedRow[]>(
    []
  )
  const [previewRows, setPreviewRows] = React.useState<
    MemberImportValidatedRow[]
  >([])
  const [duplicateOverrides, setDuplicateOverrides] = React.useState<
    Set<number>
  >(new Set())
  const [skippedRows, setSkippedRows] = React.useState<Set<number>>(new Set())
  const [summary, setSummary] = React.useState<ImportSummary | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const importableRowsCount = previewRows.filter(
    (row) =>
      row.errors.length === 0 &&
      !skippedRows.has(row.rowNumber) &&
      (row.duplicateMatches.length === 0 ||
        duplicateOverrides.has(row.rowNumber))
  ).length
  const invalidRowsCount = previewRows.filter(
    (row) => row.errors.length > 0
  ).length
  const duplicateRowsCount = previewRows.filter(
    (row) => row.duplicateMatches.length > 0
  ).length
  const warningRowsCount = previewRows.filter(
    (row) => row.warnings.length > 0
  ).length

  function resetImport() {
    setParsedCsv(null)
    setMapping({})
    setMappedRows([])
    setPreviewRows([])
    setDuplicateOverrides(new Set())
    setSkippedRows(new Set())
    setSummary(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    resetImport()

    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Choose a .csv file.")
      return
    }

    if (file.size > maxFileSize) {
      toast.error("CSV file must be 2 MB or smaller.")
      return
    }

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields?.filter(Boolean) ?? []
        const records = result.data.filter((row) =>
          Object.values(row).some((value) => String(value ?? "").trim())
        )

        if (result.errors.length > 0) {
          toast.error(result.errors[0]?.message ?? "CSV could not be parsed.")
          return
        }

        if (headers.length === 0) {
          toast.error("CSV must include a header row.")
          return
        }

        if (records.length > maxRows) {
          toast.error(`CSV can include at most ${maxRows} rows.`)
          return
        }

        setParsedCsv({ headers, records })
        setMapping(detectMemberImportMapping(headers))
      },
      error: (error) => {
        toast.error(error.message)
      },
    })
  }

  function handlePreview() {
    if (!parsedCsv) {
      return
    }

    const rows = mapCsvObjectsToMemberImportRows(parsedCsv.records, mapping)
    setMappedRows(rows)
    setSummary(null)

    startTransition(async () => {
      const result = await previewMemberImport({
        rows,
        defaultJoinDate: initialJoinDate,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setPreviewRows(result.rows)
      setDuplicateOverrides(new Set())
      setSkippedRows(
        new Set(
          result.rows
            .filter(
              (row) => row.errors.length > 0 || row.duplicateMatches.length > 0
            )
            .map((row) => row.rowNumber)
        )
      )
    })
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmMemberImport({
        rows: mappedRows,
        defaultJoinDate: initialJoinDate,
        importDuplicateRows: Array.from(duplicateOverrides),
        skippedRows: Array.from(skippedRows),
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setSummary(result)
      toast.success("Member import complete.")
    })
  }

  function toggleDuplicateOverride(rowNumber: number, checked: boolean) {
    setDuplicateOverrides((current) => {
      const next = new Set(current)

      if (checked) {
        next.add(rowNumber)
      } else {
        next.delete(rowNumber)
      }

      return next
    })
    setSkippedRows((current) => {
      const next = new Set(current)

      if (checked) {
        next.delete(rowNumber)
      } else {
        next.add(rowNumber)
      }

      return next
    })
  }

  function toggleSkip(rowNumber: number, checked: boolean) {
    setSkippedRows((current) => {
      const next = new Set(current)

      if (checked) {
        next.add(rowNumber)
      } else {
        next.delete(rowNumber)
      }

      return next
    })
  }

  const failedCsv =
    summary?.failedCsv ??
    buildFailedMemberImportCsv(
      previewRows.filter((row) => row.errors.length > 0)
    )

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetImport()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="min-h-11 w-full">
          <Upload />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="!top-0 !right-0 !left-auto !h-dvh !max-w-full !translate-x-0 !translate-y-0 content-start overflow-y-auto rounded-none border-l border-border bg-card p-5 shadow-2xl sm:!max-w-3xl data-open:slide-in-from-right data-closed:slide-out-to-right">
        <DialogHeader className="pr-8">
          <DialogTitle>Import members</DialogTitle>
          <DialogDescription>
            Upload, map, preview, and confirm member rows before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <section className="grid gap-3">
            <label className="grid gap-2 text-xs font-medium text-muted-foreground uppercase">
              CSV file
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                disabled={isPending}
                onChange={handleFileChange}
                className="min-h-11"
              />
            </label>
            {parsedCsv ? (
              <p className="text-xs text-muted-foreground">
                Loaded {parsedCsv.records.length} rows with{" "}
                {parsedCsv.headers.length} columns.
              </p>
            ) : null}
          </section>

          {parsedCsv ? (
            <section className="grid gap-3">
              <div>
                <h3 className="text-sm font-semibold">Column mapping</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Map a full name, or first and last name. Optional fields can
                  stay unmapped.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {memberImportFields.map((field) => (
                  <label
                    key={field}
                    className="grid gap-1 text-xs font-medium text-muted-foreground uppercase"
                  >
                    {memberImportFieldLabels[field]}
                    <select
                      value={mapping[field] ?? ""}
                      disabled={isPending}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field]: event.target.value || undefined,
                        }))
                      }
                      className="min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      <option value="">Unmapped</option>
                      {parsedCsv.headers.map((header) => (
                        <option key={`${field}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handlePreview}
                  className="min-h-11"
                >
                  {isPending ? "Preparing preview" : "Preview rows"}
                </Button>
              </div>
            </section>
          ) : null}

          {previewRows.length > 0 ? (
            <section className="grid gap-3">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <ImportMetric label="Ready" value={importableRowsCount} />
                <ImportMetric label="Invalid" value={invalidRowsCount} />
                <ImportMetric label="Duplicates" value={duplicateRowsCount} />
                <ImportMetric label="Warnings" value={warningRowsCount} />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[56rem] text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Member</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.slice(0, 100).map((row) => (
                      <PreviewRow
                        key={row.rowNumber}
                        row={row}
                        isSkipped={skippedRows.has(row.rowNumber)}
                        isDuplicateOverride={duplicateOverrides.has(
                          row.rowNumber
                        )}
                        onToggleSkip={toggleSkip}
                        onToggleDuplicateOverride={toggleDuplicateOverride}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRows.length > 100 ? (
                <p className="text-xs text-muted-foreground">
                  Showing first 100 preview rows. All rows are included when you
                  confirm.
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row">
                  {failedCsv.trim() ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        downloadCsv(failedCsv, "member-import-failed-rows.csv")
                      }
                    >
                      <FileDown />
                      Failed rows
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={resetImport}
                  >
                    <RotateCcw />
                    Start over
                  </Button>
                </div>
                <Button
                  type="button"
                  disabled={isPending || importableRowsCount === 0 || !!summary}
                  onClick={handleConfirm}
                  className="min-h-11"
                >
                  {isPending ? "Importing" : `Import ${importableRowsCount}`}
                </Button>
              </div>
            </section>
          ) : null}

          {summary ? (
            <section className="rounded-lg border border-border bg-background p-4">
              <h3 className="text-sm font-semibold">Import summary</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <ImportMetric label="Created" value={summary.createdMembers} />
                <ImportMetric label="Skipped" value={summary.skippedRows} />
                <ImportMetric
                  label="Overrides"
                  value={summary.duplicateOverrides}
                />
                <ImportMetric label="Failed" value={summary.failedRows} />
              </div>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImportMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

function PreviewRow({
  row,
  isSkipped,
  isDuplicateOverride,
  onToggleSkip,
  onToggleDuplicateOverride,
}: {
  row: MemberImportValidatedRow
  isSkipped: boolean
  isDuplicateOverride: boolean
  onToggleSkip: (rowNumber: number, checked: boolean) => void
  onToggleDuplicateOverride: (rowNumber: number, checked: boolean) => void
}) {
  const hasErrors = row.errors.length > 0
  const hasDuplicates = row.duplicateMatches.length > 0

  return (
    <tr
      className={cn(
        hasErrors && "bg-destructive/5",
        hasDuplicates && !isDuplicateOverride && "bg-alert/5"
      )}
    >
      <td className="px-3 py-3 align-top text-xs text-muted-foreground">
        {row.rowNumber}
      </td>
      <td className="px-3 py-3 align-top">
        <p className="font-medium">
          {row.normalized.firstName} {row.normalized.lastName}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {[row.normalized.email, row.normalized.phone]
            .filter(Boolean)
            .join(" · ") || "No contact"}
        </p>
      </td>
      <td className="px-3 py-3 align-top">
        <p>{row.normalized.planName ?? "No membership"}</p>
        {row.normalized.billingInterval ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {titleCase(row.normalized.billingInterval)}
          </p>
        ) : null}
      </td>
      <td className="px-3 py-3 align-top">
        {titleCase(row.normalized.status)}
      </td>
      <td className="grid gap-2 px-3 py-3 align-top">
        {row.errors.map((error) => (
          <p key={error} className="text-xs text-destructive">
            {error}
          </p>
        ))}
        {row.warnings.map((warning) => (
          <p key={warning} className="text-xs text-alert">
            {warning}
          </p>
        ))}
        {hasDuplicates ? (
          <div className="grid gap-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Possible duplicate</p>
            {row.duplicateMatches.map((match) => (
              <p key={match.id}>
                {match.firstName} {match.lastName}:{" "}
                {match.reasons.map(formatReason).join(", ")}
              </p>
            ))}
            <label className="mt-1 flex items-center gap-2 text-foreground">
              <input
                type="checkbox"
                checked={isDuplicateOverride}
                disabled={hasErrors}
                onChange={(event) =>
                  onToggleDuplicateOverride(row.rowNumber, event.target.checked)
                }
              />
              Import anyway
            </label>
          </div>
        ) : null}
        {!hasErrors && !hasDuplicates ? (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isSkipped}
              onChange={(event) =>
                onToggleSkip(row.rowNumber, event.target.checked)
              }
            />
            Skip row
          </label>
        ) : null}
      </td>
    </tr>
  )
}

function formatReason(reason: string) {
  return reason === "similar-name" ? "similar name" : reason
}

function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
