import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Restaurant } from "@/src/lib/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

interface Props {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: Props) {
  return (
    <View style={styles.card}>
      {restaurant.photo_url ? (
        <Image
          source={{ uri: restaurant.photo_url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderEmoji}>🍽️</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.cuisine}>
            {restaurant.cuisines.join(", ")}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.price}>
            {PRICE_LABELS[restaurant.price_level] ?? ""}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.rating}>⭐ {restaurant.rating.toFixed(1)}</Text>
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {restaurant.address}
        </Text>
        {restaurant.distance_meters && (
          <Text style={styles.distance}>
            {restaurant.distance_meters < 1000
              ? `${Math.round(restaurant.distance_meters)}m away`
              : `${(restaurant.distance_meters / 1000).toFixed(1)}km away`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  image: {
    width: "100%",
    height: 320,
  },
  imagePlaceholder: {
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  info: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  cuisine: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
  },
  dot: {
    fontSize: 14,
    color: "#ccc",
    marginHorizontal: 6,
  },
  price: {
    fontSize: 14,
    color: "#666",
  },
  rating: {
    fontSize: 14,
    color: "#666",
  },
  address: {
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  distance: {
    fontSize: 13,
    color: "#FF4F00",
    fontWeight: "600",
  },
});
