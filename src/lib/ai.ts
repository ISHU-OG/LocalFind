/**
 * Optional AI description writer. Talks to the small Express server in
 * `server/` (see its README) via VITE_API_BASE_URL. Until that's deployed
 * and the env var is set, this throws a recognizable "not configured" error
 * so the UI can hide the AI button instead of showing a broken one.
 */
export async function generateShopDescription(
  name: string,
  category: string,
  discountType: 'percentage' | 'flat',
  discountValue: number
): Promise<string> {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!base) {
    throw new Error('AI description server is not configured.');
  }
  const res = await fetch(`${base.replace(/\/$/, '')}/api/generate-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, discountType, discountValue }),
  });
  if (!res.ok) {
    throw new Error('AI generation failed. Try writing your own description instead.');
  }
  const data = (await res.json()) as { description?: string };
  if (!data.description) throw new Error('AI generation returned nothing usable.');
  return data.description;
}
