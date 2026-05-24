import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, Restaurant } from "@/src/lib/api";
import { RestaurantCard } from "@/src/components/RestaurantCard";

export default function LikedScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiked();
  }, []);

  async function fetchLiked() {
    setLoading(true);
    try {
      const { restaurants } = await api.restaurants.liked();
      setRestaurants(restaurants);
    } catch (e) {
      console.error("Failed to fetch liked restaurants", e);
    } finally {
      setLoading(false);
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
      <Text style={styles.header}>Saved</Text>
      {restaurants.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyText}>
            Restaurants you like will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <RestaurantCard restaurant={item} />
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
    padding: 16,
    color: "#1a1a1a",
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  cardWrapper: { width: "100%" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
