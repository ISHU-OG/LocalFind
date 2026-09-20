/**
 * Firebase Storage needs the paid Blaze plan, so shop photos are stored as
 * compressed data URLs directly inside Firestore instead: a small thumbnail
 * on the shop doc itself (shown in lists/maps) and a larger version in the
 * separate `shop_images/{shopId}` doc (shown on the shop detail page).
 * Firestore caps a document at 1 MiB, so both are kept well under that.
 */

function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => resolve(img);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Resizes to fit within maxDimension (preserving aspect ratio) and re-encodes as JPEG. */
async function compressImage(file: File, maxDimension: number, quality: number): Promise<string> {
  const img = await readFileAsImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression is not supported in this browser.');
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

export interface CompressedShopPhoto {
  /** ~160px wide, for the shop doc's `image_url` field (list/map cards). */
  thumbnail: string;
  /** ~1000px wide, for the `shop_images/{shopId}` doc (shop detail page). */
  full: string;
}

export async function compressShopPhoto(file: File): Promise<CompressedShopPhoto> {
  const [thumbnail, full] = await Promise.all([
    compressImage(file, 160, 0.7),
    compressImage(file, 1000, 0.75),
  ]);
  return { thumbnail, full };
}
