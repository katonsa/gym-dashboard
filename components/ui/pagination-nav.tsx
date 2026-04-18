import Link from "next/link"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import type { ComponentProps } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SearchParamPrimitive = string | number | boolean
type SearchParamInput =
  | URLSearchParams
  | Record<
      string,
      SearchParamPrimitive | SearchParamPrimitive[] | null | undefined
    >

type PaginationNavProps = {
  page: number
  pageCount: number
  basePath: string
  pageParam?: string
  preservedSearchParams?: SearchParamInput
}

type PageItem =
  | {
      type: "page"
      value: number
    }
  | {
      type: "ellipsis"
      key: string
    }

export function PaginationNav({
  page,
  pageCount,
  basePath,
  pageParam = "page",
  preservedSearchParams,
}: PaginationNavProps) {
  if (pageCount <= 1) {
    return null
  }

  const currentPage = clampPage(page, pageCount)
  const pageItems = buildPageItems(currentPage, pageCount)

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <PaginationLink
          basePath={basePath}
          page={Math.max(1, currentPage - 1)}
          pageParam={pageParam}
          preservedSearchParams={preservedSearchParams}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="size-4" />
          Previous
        </PaginationLink>

        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {pageCount}
        </p>

        <PaginationLink
          basePath={basePath}
          page={Math.min(pageCount, currentPage + 1)}
          pageParam={pageParam}
          preservedSearchParams={preservedSearchParams}
          disabled={currentPage === pageCount}
        >
          Next
          <ChevronRight className="size-4" />
        </PaginationLink>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <PaginationLink
          aria-label="Go to previous page"
          basePath={basePath}
          page={currentPage - 1}
          pageParam={pageParam}
          preservedSearchParams={preservedSearchParams}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="size-4" />
          Previous
        </PaginationLink>

        <div className="flex items-center gap-2">
          {pageItems.map((item) =>
            item.type === "page" ? (
              <PaginationLink
                key={item.value}
                aria-current={item.value === currentPage ? "page" : undefined}
                aria-label={`Go to page ${item.value}`}
                basePath={basePath}
                page={item.value}
                pageParam={pageParam}
                preservedSearchParams={preservedSearchParams}
                isCurrent={item.value === currentPage}
              >
                {item.value}
              </PaginationLink>
            ) : (
              <span
                key={item.key}
                aria-hidden="true"
                className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="size-4" />
              </span>
            )
          )}
        </div>

        <PaginationLink
          aria-label="Go to next page"
          basePath={basePath}
          page={currentPage + 1}
          pageParam={pageParam}
          preservedSearchParams={preservedSearchParams}
          disabled={currentPage === pageCount}
        >
          Next
          <ChevronRight className="size-4" />
        </PaginationLink>
      </div>
    </nav>
  )
}

function PaginationLink({
  basePath,
  page,
  pageParam,
  preservedSearchParams,
  disabled = false,
  isCurrent = false,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  basePath: string
  page: number
  pageParam: string
  preservedSearchParams?: SearchParamInput
  disabled?: boolean
  isCurrent?: boolean
}) {
  const href = buildPageHref({
    basePath,
    page,
    pageParam,
    preservedSearchParams,
  })

  return (
    <Link
      href={disabled ? basePath : href}
      scroll={false}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        buttonVariants({
          variant: isCurrent ? "default" : "outline",
          size: "lg",
        }),
        "min-h-11 min-w-11 gap-1.5 px-3",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

function buildPageItems(page: number, pageCount: number): PageItem[] {
  const pages = getPageWindow(page, pageCount)
  const items: PageItem[] = []

  for (const pageNumber of pages) {
    const previousPage = items.at(-1)

    if (
      previousPage &&
      previousPage.type === "page" &&
      pageNumber - previousPage.value > 1
    ) {
      items.push({
        type: "ellipsis",
        key: `ellipsis-${previousPage.value}-${pageNumber}`,
      })
    }

    items.push({
      type: "page",
      value: pageNumber,
    })
  }

  return items
}

function getPageWindow(page: number, pageCount: number) {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (page <= 3) {
    return [1, 2, 3, 4, 5]
  }

  if (page >= pageCount - 2) {
    return [
      pageCount - 4,
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ]
  }

  return [1, page - 1, page, page + 1, pageCount]
}

function buildPageHref({
  basePath,
  page,
  pageParam,
  preservedSearchParams,
}: {
  basePath: string
  page: number
  pageParam: string
  preservedSearchParams?: SearchParamInput
}) {
  const params = toUrlSearchParams(preservedSearchParams)
  params.set(pageParam, String(page))
  const query = params.toString()

  return query.length > 0 ? `${basePath}?${query}` : basePath
}

function toUrlSearchParams(searchParams?: SearchParamInput) {
  if (!searchParams) {
    return new URLSearchParams()
  }

  if (searchParams instanceof URLSearchParams) {
    return new URLSearchParams(searchParams)
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }

      continue
    }

    params.set(key, String(value))
  }

  return params
}

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(1, page), Math.max(1, pageCount))
}
