// Generic signed-URL cache for user/profile/banner/avatar images.
// Same idea as bannerUrlCache.ts, but keyed generically so it can be reused
// for teacher profile images, banners, and community post/answer avatars.
//
// Signed URLs from the backend typically expire after ~60 minutes. We treat
// a cached entry as stale slightly before that so components proactively
// refetch instead of silently failing once the URL dies.

const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes — refresh before the real ~60min expiry

type CacheEntry = {
  url: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

const buildKey = (entityId: string, storagePath: string) => `${entityId}::${storagePath}`;

export function getCachedUserImageUrl(
  entityId: string,
  storagePath: string
): string | null {
  const key = buildKey(entityId, storagePath);
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.url;
}

export function setCachedUserImageUrl(
  entityId: string,
  storagePath: string,
  url: string
): void {
  const key = buildKey(entityId, storagePath);
  cache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCachedUserImageUrl(entityId: string, storagePath: string): void {
  cache.delete(buildKey(entityId, storagePath));
}