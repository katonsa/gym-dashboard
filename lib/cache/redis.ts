import { Redis } from "@upstash/redis"

type CacheValue =
  | null
  | boolean
  | number
  | string
  | CacheValue[]
  | {
      [key: string]: CacheValue
    }

type CacheOptions<T> = {
  gymId: string
  segment: string
  params?: CacheValue
  ttlSeconds?: number
  load: () => Promise<T>
}

const DEFAULT_TTL_SECONDS = 60
const KEY_PREFIX = process.env.CACHE_KEY_PREFIX ?? "gym-dashboard"

let redisClient: Redis | null | undefined

export async function getCachedDashboardData<T>({
  gymId,
  segment,
  params = null,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  load,
}: CacheOptions<T>): Promise<T> {
  const redis = getRedis()

  if (!redis) {
    return load()
  }

  const version = await getDashboardCacheVersion(redis, gymId)
  const cacheKey = [
    KEY_PREFIX,
    "dashboard",
    gymId,
    version,
    segment,
    stableStringify(params),
  ].join(":")

  try {
    const cached = await redis.get<string | T>(cacheKey)

    if (cached !== null) {
      return typeof cached === "string"
        ? (JSON.parse(cached) as T)
        : (cached as T)
    }
  } catch (error) {
    console.warn("Redis cache read failed; loading from database.", error)
  }

  const value = await load()

  try {
    await redis.set(cacheKey, JSON.stringify(value), { ex: ttlSeconds })
  } catch (error) {
    console.warn("Redis cache write failed; continuing without cache.", error)
  }

  return value
}

export async function invalidateDashboardCache(gymId: string) {
  const redis = getRedis()

  if (!redis) {
    return
  }

  try {
    await redis.incr(getDashboardCacheVersionKey(gymId))
  } catch (error) {
    console.warn("Redis cache invalidation failed.", error)
  }
}

function getRedis() {
  if (redisClient !== undefined) {
    return redisClient
  }

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redisClient = null
    return redisClient
  }

  redisClient = Redis.fromEnv()
  return redisClient
}

async function getDashboardCacheVersion(redis: Redis, gymId: string) {
  try {
    return (
      (
        await redis.get<string | number>(getDashboardCacheVersionKey(gymId))
      )?.toString() ?? "0"
    )
  } catch (error) {
    console.warn("Redis cache version read failed; using version 0.", error)
    return "0"
  }
}

function getDashboardCacheVersionKey(gymId: string) {
  return [KEY_PREFIX, "dashboard", gymId, "version"].join(":")
}

function stableStringify(value: CacheValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right)
  )

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`
    )
    .join(",")}}`
}
