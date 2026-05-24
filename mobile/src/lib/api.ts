import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return `Bearer ${token}`;
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

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  restaurants: {
    nearby: (params: {
      latitude: number;
      longitude: number;
      radius?: number;
      cuisine?: string;
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
    swipe: (restaurantId: string, direction: SwipeDirection) =>
      request("/api/restaurants/swipe", {
        method: "POST",
        body: JSON.stringify({ restaurantId, direction }),
      }),
  },
  sessions: {
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
    matches: (id: string) =>
      request<{ matches: Restaurant[] }>(`/api/sessions/${id}/matches`),
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
  status: "active" | "closed";
  cuisine_filters: string[];
  max_distance: number;
  created_at: string;
}
