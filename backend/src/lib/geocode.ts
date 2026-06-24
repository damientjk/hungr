const KEY = process.env.GOOGLE_PLACES_API_KEY!;

interface AutocompleteResponse {
  status: string;
  predictions: { description: string; place_id: string }[];
}

export interface PlaceSuggestion {
  description: string;
  placeId: string;
}

export async function autocompletePlaces(
  input: string,
  bias?: { latitude: number; longitude: number }
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    input,
    types: "geocode|establishment",
    key: KEY,
  });
  if (bias) {
    params.set("location", `${bias.latitude},${bias.longitude}`);
    params.set("radius", "50000");
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as AutocompleteResponse;
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
    return (data.predictions ?? []).map((p) => ({
      description: p.description,
      placeId: p.place_id,
    }));
  } catch (e) {
    console.error("Autocomplete failed:", e);
    return [];
  }
}

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
