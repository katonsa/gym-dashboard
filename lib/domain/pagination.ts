type SearchParamValue = string | string[] | undefined

export type SearchParamsInput =
  | Promise<Record<string, SearchParamValue>>
  | Record<string, SearchParamValue>

export type PaginationParams = {
  page: number
  pageSize: number
}

export type PaginatedResult<T> = {
  rows: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

type ParsePaginationDefaults = Partial<PaginationParams> & {
  pageParam?: string
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25

export async function parsePaginationParams(
  searchParams: SearchParamsInput,
  defaults: ParsePaginationDefaults = {}
): Promise<PaginationParams> {
  const resolvedSearchParams = await searchParams
  const pageParam = defaults.pageParam ?? "page"
  const defaultPage = clampInteger(defaults.page, DEFAULT_PAGE)
  const defaultPageSize = clampInteger(defaults.pageSize, DEFAULT_PAGE_SIZE)
  const rawPage = getFirstSearchParamValue(resolvedSearchParams[pageParam])

  return {
    page: clampInteger(rawPage, defaultPage),
    pageSize: defaultPageSize,
  }
}

export function getPrismaOffsetArgs({ page, pageSize }: PaginationParams) {
  return {
    skip: (clampInteger(page, DEFAULT_PAGE) - 1) * clampInteger(pageSize, 1),
    take: clampInteger(pageSize, DEFAULT_PAGE_SIZE),
  }
}

function getFirstSearchParamValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function clampInteger(value: number | string | undefined, fallback: number) {
  const parsed =
    typeof value === "number"
      ? Math.trunc(value)
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}
