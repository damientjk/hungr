import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * Web: use same-origin `/api` — Metro proxies to EXPO_PUBLIC_API_URL (see metro.config.js).
 * Native: call the backend URL directly.
 */
const API_URL =
  Platform.OS === "web"
    ? ""
    : (
        process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
      ).replace(/\/$/, "");

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
    start: (id: string, location: { latitude: number; longitude: number }) =>
      request<{ session: Session }>(`/api/sessions/${id}/start`, {
        method: "PATCH",
        body: JSON.stringify(location),
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
  created_at: string;
}
