import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

/** Port the backend listens on. */
const BACKEND_PORT = 3000;

/**
 * Resolve the backend base URL.
 *
 * - Web: same-origin "" — Metro proxies `/api` to the backend (see metro.config.js).
 * - Native dev (Expo Go): derive the host from the Metro dev-server URI, so the
 *   backend is reached at the SAME IP the app was loaded from. This means the IP
 *   never has to be hard-coded or updated when the network (Wi-Fi/hotspot) changes.
 * - Fallbacks: an explicit EXPO_PUBLIC_API_URL (e.g. a deployed backend), then localhost.
 */
function resolveApiUrl(): string {
  if (Platform.OS === "web") return "";

  // e.g. "172.20.10.5:8081" — the address this app's bundle was served from.
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    "";
  const host = String(hostUri).split(":")[0];
  if (host) return `http://${host}:${BACKEND_PORT}`;

  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return `http://localhost:${BACKEND_PORT}`;
}

const API_URL = resolveApiUrl();

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return `Bearer ${token}`;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith("<")) {
      throw new Error(
        "Backend returned HTML instead of JSON. Check that the API is running and EXPO_PUBLIC_API_URL points to it (e.g. http://localhost:3000)."
      );
    }
    throw new Error(text.slice(0, 120) || "Invalid response from server");
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      ...options?.headers,
    },
  });

  const body = await parseJsonResponse<{ error?: string } & T>(res);

  if (!res.ok) {
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return body;
}

export const api = {
  restaurants: {
    nearby: (params: {
      latitude: number;
      longitude: number;
      radius?: number;
      cuisine?: string;
      limit?: number;
    }) => {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      );
      return request<{ restaurants: Restaurant[] }>(
        `/api/restaurants/nearby?${qs}`
      );
    },
    liked: () =>
      request<{ restaurants: Restaurant[] }>("/api/restaurants/liked"),
    swipe: (restaurantId: string, direction: SwipeDirection, sessionId: string) =>
      request("/api/restaurants/swipe", {
        method: "POST",
        body: JSON.stringify({ restaurantId, direction, sessionId }),
      }),
    resetSwipes: () =>
      request("/api/restaurants/swipes", { method: "DELETE" }),
  },
  sessions: {
    get: (id: string) =>
      request<{ session: Session }>(`/api/sessions/${id}`),
    create: (payload: {
      name: string;
      cuisineFilters?: string[];
      maxDistance?: number;
    }) =>
      request<{ session: Session }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    join: (code: string) =>
      request<{ session: Session }>(`/api/sessions/join/${code}`, {
        method: "POST",
      }),
    start: (id: string, payload: StartSwipingPayload) =>
      request<{ session: Session }>(`/api/sessions/${id}/start`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    restaurants: (id: string) =>
      request<{ restaurants: Restaurant[] }>(`/api/sessions/${id}/restaurants`),
    refreshRestaurants: (
      id: string,
      location: { latitude: number; longitude: number }
    ) =>
      request<{ restaurants: Restaurant[] }>(`/api/sessions/${id}/restaurants`, {
        method: "POST",
        body: JSON.stringify(location),
      }),
    matches: (id: string) =>
      request<{
        matches: Restaurant[];
        topMatch: (Restaurant & { likeCount: number }) | null;
        participantCount: number;
        doneCount: number;
        allDone: boolean;
      }>(`/api/sessions/${id}/matches`),
  },
  bookmarks: {
    list: () => request<{ bookmarks: Restaurant[] }>("/api/bookmarks"),
    add: (restaurantId: string) =>
      request("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify({ restaurantId }),
      }),
    remove: (restaurantId: string) =>
      request(`/api/bookmarks/${restaurantId}`, { method: "DELETE" }),
  },
};

export type SwipeDirection = "like" | "dislike";

export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  price_level: number;
  photo_url: string | null;
  address: string;
  distance_meters: number;
}

export interface Session {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  status: "active" | "swiping" | "closed";
  cuisine_filters: string[];
  max_distance: number;
  price_min: number;
  price_max: number;
  halal: boolean;
  vegetarian: boolean;
  created_at: string;
}

/** Filters the owner configures before starting a session. */
export interface SessionFilterValues {
  cuisineFilters: string[];
  priceMin: number;
  priceMax: number;
  halal: boolean;
  vegetarian: boolean;
  maxDistance: number;
  /** Optional free-text location; falls back to the device location when empty. */
  address?: string;
}

export interface StartSwipingPayload extends SessionFilterValues {
  latitude: number;
  longitude: number;
}

/** Cuisine options offered as checkboxes in the session filter panel. */
export const CUISINE_OPTIONS = [
  "Japanese",
  "Chinese",
  "Korean",
  "Italian",
  "Indian",
  "Thai",
  "Western",
  "Mexican",
  "Fast food",
  "Cafe",
  "Dessert",
  "Seafood",
] as const;

/** Sensible defaults for a fresh filter panel. */
export const DEFAULT_FILTERS: SessionFilterValues = {
  cuisineFilters: [],
  priceMin: 1,
  priceMax: 4,
  halal: false,
  vegetarian: false,
  maxDistance: 5000,
};
