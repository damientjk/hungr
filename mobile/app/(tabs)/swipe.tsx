import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, Restaurant, SwipeDirection } from "@/src/lib/api";
import { useLocation } from "@/src/hooks/useLocation";
import { RestaurantCard } from "@/src/components/RestaurantCard";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.3;

export default function SwipeScreen() {
  const { coords, loading: locationLoading, error: locationError } = useLocation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeCard("like");
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeCard("dislike");
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (coords) fetchRestaurants();
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
      setCurrentIndex(0);
    } catch (e) {
      console.error("Failed to fetch restaurants", e);
    } finally {
      setLoading(false);
    }
  }

  function swipeCard(direction: SwipeDirection) {
    const toX = direction === "like" ? width * 1.5 : -width * 1.5;
    Animated.timing(position, {
      toValue: { x: toX, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      const restaurant = restaurants[currentIndex];
      if (restaurant) {
        api.restaurants.swipe(restaurant.id, direction).catch(console.error);
      }
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((i) => i + 1);
    });
  }

  if (locationLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF4F00" />
        <Text style={styles.loadingText}>
          {locationLoading ? "Getting your location..." : "Finding restaurants..."}
        </Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{locationError}</Text>
      </View>
    );
  }

  const current = restaurants[currentIndex];
  const next = restaurants[currentIndex + 1];

  if (!current) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyText}>You've seen all restaurants nearby!</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchRestaurants}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>🍔 Hungr</Text>

      <View style={styles.cardStack}>
        {next && (
          <View style={[styles.cardWrapper, styles.nextCard]}>
            <RestaurantCard restaurant={next} />
          </View>
        )}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotation },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <RestaurantCard restaurant={current} />
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dislikeButton]}
          onPress={() => swipeCard("dislike")}
        >
          <Text style={styles.actionEmoji}>✕</Text>
        </TouchableOpacity>
<TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => swipeCard("like")}
        >
          <Text style={styles.actionEmoji}>♥</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 16,
    color: "#1a1a1a",
  },
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    position: "absolute",
  },
  nextCard: {
    transform: [{ scale: 0.95 }, { translateY: 16 }],
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 32,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dislikeButton: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#ff4444" },
likeButton: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#44cc44" },
  actionEmoji: { fontSize: 24 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: "#FF4F00",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  refreshText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
