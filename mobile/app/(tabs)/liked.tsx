import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Restaurant } from "@/src/lib/api";

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [])
  );

  async function fetchBookmarks() {
    setLoading(true);
    try {
      const { bookmarks } = await api.bookmarks.list();
      setBookmarks(bookmarks);
    } catch (e) {
      console.error("Failed to fetch bookmarks", e);
    } finally {
      setLoading(false);
    }
  }

  async function removeBookmark(restaurantId: string) {
    setBookmarks((prev) => prev.filter((r) => r.id !== restaurantId));
    try {
      await api.bookmarks.remove(restaurantId);
    } catch (e) {
      fetchBookmarks();
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF4F00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Bookmarks</Text>
      {bookmarks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🔖</Text>
          <Text style={styles.emptyText}>
            Tap the bookmark icon on any restaurant to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
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
                <Text style={styles.itemAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeBookmark(item.id)}
              >
                <Ionicons name="bookmark" size={24} color="#FF4F00" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
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
  thumbnail: { width: 72, height: 72, borderRadius: 12, marginRight: 12 },
  thumbnailPlaceholder: {
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  itemMeta: { fontSize: 13, color: "#666", marginBottom: 4, textTransform: "capitalize" },
  itemAddress: { fontSize: 13, color: "#999" },
  removeBtn: { padding: 8 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: { fontSize: 16, color: "#999", textAlign: "center" },
});
