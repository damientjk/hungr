const KEY = process.env.GOOGLE_PLACES_API_KEY!;

interface FindPlaceResponse {
  status: string;
  candidates: { geometry: { location: { lat: number; lng: number } } }[];
}

/**
 * Resolve a free-text place name / address to coordinates using the Places
 * "Find Place From Text" endpoint (part of the Places API, which is already
 * enabled — unlike the separate Geocoding API).
 *
 * An optional `bias` point nudges ambiguous names (e.g. a chain) toward the
 * area the user is searching from. Returns null when nothing matches.
 */
export async function geocodeAddress(
  address: string,
  bias?: { latitude: number; longitude: number }
): Promise<{ latitude: number; longitude: number } | null> {
  const params = new URLSearchParams({
    input: address,
    inputtype: "textquery",
    fields: "geometry",
    key: KEY,
  });
  if (bias) {
    params.set("locationbias", `point:${bias.latitude},${bias.longitude}`);
  }

  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as FindPlaceResponse;
    const loc = data.candidates?.[0]?.geometry?.location;
    if (data.status !== "OK" || !loc) return null;
    return { latitude: loc.lat, longitude: loc.lng };
  } catch (e) {
    console.error("Place lookup failed:", e);
    return null;
  }
}
