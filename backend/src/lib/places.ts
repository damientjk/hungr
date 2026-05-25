const BASE = "https://maps.googleapis.com/maps/api/place";
const KEY = process.env.GOOGLE_PLACES_API_KEY!;

const SEARCH_TYPES = ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"];

const GENERIC_TYPES = new Set([
  "restaurant", "food", "point_of_interest", "establishment", "store",
]);

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

function mapPlaces(results: PlaceResult[]) {
  return results.map((place) => ({
    place_id: place.place_id,
    name: place.name,
    address: place.vicinity,
    rating: place.rating ?? 0,
    price_level: Math.max(place.price_level ?? 1, 1),
    cuisines: extractCuisines(place.types),
    photo_url: place.photos?.[0] ? photoUrl(place.photos[0].photo_reference) : null,
    location: `SRID=4326;POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`,
  }));
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

async function fetchAllPagesForType(lat: number, lng: number, radius: number, type: string) {
  const url = `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${KEY}`;
  const allPlaces = [];

  try {
    const firstPage = await fetchPage(url);
    allPlaces.push(...mapPlaces(firstPage.results ?? []));

    let token = firstPage.next_page_token;
    let pagesLeft = 2;
    while (token && pagesLeft > 0) {
      await delay(2000);
      const nextPage = await fetchPage(`${BASE}/nearbysearch/json?pagetoken=${token}&key=${KEY}`);
      allPlaces.push(...mapPlaces(nextPage.results ?? []));
      token = nextPage.next_page_token;
      pagesLeft--;
    }
  } catch (e) {
    console.error(`Failed to fetch type "${type}":`, e);
  }

  return allPlaces;
}

export async function fetchAllNearbyRestaurants(lat: number, lng: number, radius: number) {
  // Search all types in parallel (first pages), then paginate each
  const results = await Promise.all(
    SEARCH_TYPES.map((type) => fetchAllPagesForType(lat, lng, radius, type))
  );

  // Merge and deduplicate by place_id
  const seen = new Set<string>();
  const combined = [];
  for (const places of results) {
    for (const place of places) {
      if (!seen.has(place.place_id)) {
        seen.add(place.place_id);
        combined.push(place);
      }
    }
  }

  return combined;
}
