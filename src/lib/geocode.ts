export interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Looks up an address using OpenStreetMap's free Nominatim API directly from
 * the browser. No API key or server needed. Nominatim's usage policy asks for
 * at most ~1 request/second and no bulk geocoding - fine for one-off lookups
 * in a shop registration form.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Address lookup failed.');
  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (results.length === 0) return null;
  const { lat, lon } = results[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon) };
}
