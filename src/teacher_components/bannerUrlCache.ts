// bannerUrlCache.ts
//
// A tiny in-memory cache for signed banner URLs, shared across all
// TeacherCourseCard instances. Because this lives at module scope (not
// inside component state), it survives component unmount/remount — e.g.
// navigating away from the Dashboard and back — for as long as the JS
// session stays alive. This avoids re-hitting /storage/signed-url on every
// screen revisit, which is what was causing the banner "flash empty, then
// pop in" delay each time you came back to the Dashboard.
//
// Signed URLs from most storage backends (Firebase, S3, GCS) are valid for
// a fixed window (commonly ~1 hour). We store an expiry timestamp alongside
// the URL and only treat a cache entry as usable if it still has some
// buffer time left before expiring.

type CacheEntry = {
  url: string;
  fetchedAt: number;
};

const CACHE: Map<string, CacheEntry> = new Map();

// How long we trust a cached signed URL before forcing a refresh.
// Keep this comfortably under your backend's actual signed-URL TTL.
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

const buildCacheKey = (classId: string, storagePath: string) => `${classId}::${storagePath}`;

export const getCachedBannerUrl = (classId: string, storagePath: string): string | null => {
  const key = buildCacheKey(classId, storagePath);
  const entry = CACHE.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.fetchedAt > CACHE_TTL_MS;
  if (isExpired) {
    CACHE.delete(key);
    return null;
  }

  return entry.url;
};

export const setCachedBannerUrl = (classId: string, storagePath: string, url: string) => {
  const key = buildCacheKey(classId, storagePath);
  CACHE.set(key, { url, fetchedAt: Date.now() });
};

export const invalidateCachedBannerUrl = (classId: string, storagePath: string) => {
  const key = buildCacheKey(classId, storagePath);
  CACHE.delete(key);
};