// student_components/bannerUrlCache.ts
//
// Signed-URL cache for student-visible class banners. Same pattern as
// services/userImageUrlCache.ts: cache slightly shorter than the real
// backend signed-URL TTL (~60 min) so components proactively refetch
// instead of ever rendering a dead URL.
//
// Function names match teacher_components/bannerUrlCache.ts so CourseCard
// (student) and TeacherCourseCard can be maintained the same way.

const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes — refresh before the real ~60min expiry

type CacheEntry = {
  url: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

const buildKey = (courseId: string, storagePath: string) => `${courseId}::${storagePath}`;

export function getCachedBannerUrl(courseId: string, storagePath: string): string | null {
  const key = buildKey(courseId, storagePath);
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.url;
}

export function setCachedBannerUrl(courseId: string, storagePath: string, url: string): void {
  const key = buildKey(courseId, storagePath);
  cache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCachedBannerUrl(courseId: string, storagePath: string): void {
  cache.delete(buildKey(courseId, storagePath));
}