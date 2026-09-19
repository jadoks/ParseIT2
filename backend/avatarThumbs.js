// avatarThumbs.js
// Small, cached avatar variants so viewers never download the original upload.
//
//   npm install sharp
//
// Usage (inside server.js, once `bucket` and `createReadSignedUrl` exist):
//   import { createAvatarThumbs } from "./avatarThumbs.js";
//   const avatarThumbs = createAvatarThumbs({ bucket, createReadSignedUrl });

import sharp from "sharp";

// Pixel sizes are ~2-3x the largest on-screen avatar so they stay sharp on
// high-density phones. Adjust if your biggest avatar changes.
const SIZES = { thumb: 160, md: 512 };

export function createAvatarThumbs({ bucket, createReadSignedUrl }) {
  const inflight = new Map(); // outPath -> Promise, so one user's avatar is only resized once at a time
  const known = new Set(); // outPaths we've already confirmed exist (skips an exists() round trip)

  // Deterministic path: no schema change, and old avatars get thumbs lazily.
  const variantPath = (storagePath, size) => `thumbs/${size}/${storagePath}.jpg`;

  async function ensureVariant(storagePath, size) {
    const px = SIZES[size];
    if (!px) throw new Error(`Unknown avatar size: ${size}`);

    const outPath = variantPath(storagePath, size);
    if (known.has(outPath)) return outPath;

    const out = bucket.file(outPath);
    const [exists] = await out.exists();
    if (exists) {
      known.add(outPath);
      return outPath;
    }

    if (inflight.has(outPath)) return inflight.get(outPath);

    const job = (async () => {
      const [original] = await bucket.file(storagePath).download();
      const buffer = await resizeSquare(original, px);
      await out.save(buffer, {
        resumable: false,
        metadata: {
          contentType: "image/jpeg",
          // Path is timestamped per upload, so the bytes at this path never change.
          cacheControl: "private,max-age=604800",
        },
      });
      known.add(outPath);
      return outPath;
    })().finally(() => inflight.delete(outPath));

    inflight.set(outPath, job);
    return job;
  }

  /**
   * Signed URL for a small variant of an avatar.
   * Returns null on any failure so callers can fall back to the original.
   */
  async function getUrl(storagePath, size = "thumb") {
    if (!storagePath) return null;
    try {
      return await createReadSignedUrl(await ensureVariant(storagePath, size));
    } catch (error) {
      console.warn("Avatar variant warning:", error?.message || error);
      return null;
    }
  }

  /** Call when an avatar is replaced/deleted so variants don't pile up. */
  async function deleteVariants(storagePath) {
    if (!storagePath) return;
    await Promise.all(
      Object.keys(SIZES).map((size) => {
        const p = variantPath(storagePath, size);
        known.delete(p);
        return bucket.file(p).delete({ ignoreNotFound: true }).catch(() => {});
      })
    );
  }

  /** Shrink a fresh upload before storing it (max `px`, JPEG, EXIF-rotated). */
  async function shrinkUpload(buffer, px = SIZES.md) {
    return sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(px, px, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  }

  return { getUrl, deleteVariants, shrinkUpload };
}

function resizeSquare(input, px) {
  return sharp(input, { failOn: "none" })
    .rotate() // honor EXIF orientation from phone photos
    .resize(px, px, { fit: "cover" })
    .flatten({ background: "#ffffff" }) // PNG transparency -> white instead of black
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}