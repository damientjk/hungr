import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { api, Restaurant } from "@/src/lib/api";
import { useLocation } from "@/src/hooks/useLocation";
import { Screen } from "@/src/components/ui/Screen";
import { RestaurantListRow } from "@/src/components/RestaurantListRow";
import { colors } from "@/src/theme/colors";
import { screenStyles } from "@/src/theme/screenStyles";

export default function DiscoverScreen() {
  const { coords, loading: locationLoading, error: locationError } = useLocation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (coords) {
      fetchRestaurants();
      fetchBookmarks();
    }
  }, [coords]);

  async function fetchRestaurants() {
    if (!coords) return;
    setLoading(true);
    try {
      const { restaurants } = await api.restaurants.nearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setRestaurants(restaurants);
    } catch (e) {
      console.error("Failed to fetch restaurants", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBookmarks() {
    try {
      const { bookmarks } = await api.bookmarks.list();
      setBookmarked(new Set(bookmarks.map((b) => b.id)));
    } catch (e) {
      console.error("Failed to fetch bookmarks", e);
    }
  }

  async function toggleBookmark(restaurantId: string) {
    if (toggling.has(restaurantId)) return;
    setToggling((prev) => new Set(prev).add(restaurantId));

    const isBookmarked = bookmarked.has(restaurantId);
    setBookmarked((prev) => {
      const next = new Set(prev);
      isBookmarked ? next.delete(restaurantId) : next.add(restaurantId);
      return next;
    });

    try {
      if (isBookmarked) {
        await api.bookmarks.remove(restaurantId);
      } else {
        await api.bookmarks.add(restaurantId);
      }
    } catch {
      setBookmarked((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.add(restaurantId) : next.delete(restaurantId);
        return next;
      });
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(restaurantId);
        return next;
      });
    }
  }

  if (locationError) {
    return (
      <View style={screenStyles.centered}>
        <Text style={screenStyles.emptyText}>{locationError}</Text>
      </View>
    );
  }

  if (locationLoading || loading) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={screenStyles.loadingText}>
          {locationLoading ? "Getting your location…" : "Finding restaurants…"}
        </Text>
      </View>
    );
  }

  return (
    <Screen>
      <Text style={screenStyles.header}>Discover</Text>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={screenStyles.list}
        renderItem={({ item }) => {
          const isBookmarked = bookmarked.has(item.id);
          const distance =
            item.distance_meters < 1000
              ? `${Math.round(item.distance_meters)}m away`
              : `${(item.distance_meters / 1000).toFixed(1)}km away`;

          return (
            <RestaurantListRow
              restaurant={item}
              subtitle={distance}
              rightAction={{
                icon: isBookmarked ? "bookmark" : "bookmark-outline",
                filled: isBookmarked,
                onPress: () => toggleBookmark(item.id),
              }}
            />
          );
        }}
        ListEmptyComponent={
          <View style={screenStyles.centered}>
            <Text style={screenStyles.emptyText}>No restaurants found nearby.</Text>
          </View>
        }
      />
    </Screen>
  );
}
