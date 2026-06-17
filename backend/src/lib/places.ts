const BASE = "https://maps.googleapis.com/maps/api/place";
const KEY = process.env.GOOGLE_PLACES_API_KEY!;

const SEARCH_TYPES = ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"];

const GENERIC_TYPES = new Set([
  "restaurant", "food", "point_of_interest", "establishment", "store",
]);

/** A cuisine/dietary tag to search for and stamp onto matching results. */
export interface SearchTag {
  /** Google Places `keyword` query, e.g. "japanese" or "halal". */
  keyword: string;
  /** Label appended to each result's `cuisines`, e.g. "japanese". */
  label: string;
}

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  price_level?: number;
  types: string[];
  geometry: { location: { lat: number; lng: number } };
  photos?: { photo_reference: string }[];
}

interface PlacesResponse {
  status: string;
  results: PlaceResult[];
  next_page_token?: string;
}

function extractCuisines(types: string[]): string[] {
  const filtered = types
    .filter((t) => !GENERIC_TYPES.has(t))
    .map((t) => t.replace(/_/g, " "));
  return filtered.length > 0 ? filtered : ["restaurant"];
}

function photoUrl(ref: string): string {
  return `${BASE}/photo?maxwidth=800&photo_reference=${ref}&key=${KEY}`;
}

/**
 * Map raw Places results to our restaurant shape. When `tagLabel` is supplied
 * (keyword search), it is appended to every result's cuisines so the result can
 * later be filtered by that tag (e.g. "japanese", "halal", "vegetarian").
 */
function mapPlaces(results: PlaceResult[], tagLabel?: string) {
  return results.map((place) => {
    const cuisines = extractCuisines(place.types);
    if (tagLabel && !cuisines.includes(tagLabel)) cuisines.push(tagLabel);
    return {
      place_id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating ?? 0,
      price_level: Math.max(place.price_level ?? 1, 1),
      cuisines,
      photo_url: place.photos?.[0] ? photoUrl(place.photos[0].photo_reference) : null,
      location: `SRID=4326;POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`,
    };
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url: string): Promise<PlacesResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API HTTP error: ${res.status}`);
  const data = (await res.json()) as PlacesResponse;
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API error: ${data.status}`);
  }
  return data;
}

/** Fetch + paginate a single nearby search, tagging results with `tagLabel`. */
async function fetchAllPages(firstUrl: string, tagLabel?: string) {
  const allPlaces = [];
  try {
    const firstPage = await fetchPage(firstUrl);
    allPlaces.push(...mapPlaces(firstPage.results ?? [], tagLabel));

    let token = firstPage.next_page_token;
    let pagesLeft = 2;
    while (token && pagesLeft > 0) {
      await delay(2000);
      const nextPage = await fetchPage(`${BASE}/nearbysearch/json?pagetoken=${token}&key=${KEY}`);
      allPlaces.push(...mapPlaces(nextPage.results ?? [], tagLabel));
      token = nextPage.next_page_token;
      pagesLeft--;
    }
  } catch (e) {
    console.error(`Failed to fetch "${tagLabel ?? firstUrl}":`, e);
  }
  return allPlaces;
}

function typeUrl(lat: number, lng: number, radius: number, type: string) {
  return `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${KEY}`;
}

function keywordUrl(lat: number, lng: number, radius: number, keyword: string) {
  return `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&keyword=${encodeURIComponent(keyword)}&key=${KEY}`;
}

function dedupeByPlaceId<T extends { place_id: string }>(groups: T[][]): T[] {
  const seen = new Set<string>();
  const combined: T[] = [];
  for (const places of groups) {
    for (const place of places) {
      if (!seen.has(place.place_id)) {
        seen.add(place.place_id);
        combined.push(place);
      }
    }
  }
  return combined;
}

/**
 * Fetch nearby restaurants from Google Places.
 *
 * Default (no tags): broad search across restaurant/cafe/bar/bakery/takeaway types.
 * With `tags`: a keyword search per tag (cuisine or dietary), stamping each
 * result's cuisines with the tag label so it can be filtered downstream.
 */
export async function fetchAllNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number,
  tags: SearchTag[] = []
) {
  if (tags.length > 0) {
    const results = await Promise.all(
      tags.map((t) => fetchAllPages(keywordUrl(lat, lng, radius, t.keyword), t.label))
    );
    return dedupeByPlaceId(results);
  }

  const results = await Promise.all(
    SEARCH_TYPES.map((type) => fetchAllPages(typeUrl(lat, lng, radius, type)))
  );
  return dedupeByPlaceId(results);
}
