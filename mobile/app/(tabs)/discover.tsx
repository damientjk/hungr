import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Restaurant } from "@/src/lib/api";
import { useLocation } from "@/src/hooks/useLocation";

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

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
    } catch (e) {
      // Revert on failure
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
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{locationError}</Text>
      </View>
    );
  }

  if (locationLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF4F00" />
        <Text style={styles.loadingText}>
          {locationLoading ? "Getting your location…" : "Finding restaurants…"}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Discover</Text>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isBookmarked = bookmarked.has(item.id);
          const distance =
            item.distance_meters < 1000
              ? `${Math.round(item.distance_meters)}m`
              : `${(item.distance_meters / 1000).toFixed(1)}km`;

          return (
            <View style={styles.item}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <Text style={{ fontSize: 28 }}>🍽️</Text>
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.cuisines[0]} · {PRICE_LABELS[item.price_level]} · ⭐{" "}
                  {item.rating.toFixed(1)}
                </Text>
                <Text style={styles.itemDistance}>{distance} away</Text>
              </View>
              <TouchableOpacity
                style={styles.bookmarkBtn}
                onPress={() => toggleBookmark(item.id)}
              >
                <Ionicons
                  name={isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={isBookmarked ? "#FF4F00" : "#ccc"}
                />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No restaurants found nearby.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    padding: 16,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  itemMeta: { fontSize: 13, color: "#666", marginBottom: 4, textTransform: "capitalize" },
  itemDistance: { fontSize: 13, color: "#FF4F00", fontWeight: "600" },
  bookmarkBtn: { padding: 8 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 200,
  },
  loadingText: { marginTop: 16, color: "#666", fontSize: 16 },
  emptyText: { fontSize: 16, color: "#999", textAlign: "center" },
});
