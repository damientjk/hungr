import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Restaurant } from "@/src/lib/api";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontFamily } from "@/src/theme/typography";
import {
  formatCategoryLabel,
  formatWalkLocationLine,
  formatGroupHungryLabel,
} from "@/src/lib/restaurantFormat";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - spacing.cardHorizontalMargin * 2;
const STACK_CARD_HEIGHT = height * 0.58;

interface StackOverlay {
  groupDone?: number;
  groupTotal?: number;
}

interface Props {
  restaurant: Restaurant;
  variant?: "stack" | "compact";
  overlay?: StackOverlay;
  cardHeight?: number;
}

export function RestaurantCard({ restaurant, variant = "stack", overlay, cardHeight }: Props) {
  if (variant === "compact") {
    return <CompactCard restaurant={restaurant} />;
  }

  const categoryLabel = formatCategoryLabel(
    restaurant.price_level,
    restaurant.cuisines
  );
  const locationLine = formatWalkLocationLine(
    restaurant.distance_meters,
    restaurant.address
  );
  const groupLabel =
    overlay?.groupTotal != null && overlay.groupDone != null
      ? formatGroupHungryLabel(overlay.groupDone, overlay.groupTotal)
      : null;

  return (
    <View style={[styles.stackCard, cardHeight != null && { height: cardHeight }]}>
      {restaurant.photo_url ? (
        <Image
          source={{ uri: restaurant.photo_url }}
          style={styles.stackImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.stackImage, styles.imagePlaceholder]}>
          <Text style={styles.placeholderEmoji}>🍽️</Text>
        </View>
      )}

      {groupLabel ? (
        <View style={[styles.pill, styles.pillTopLeft]}>
          <View style={styles.pillAvatars}>
            <View style={[styles.miniAvatar, { backgroundColor: colors.avatar[0] }]} />
            <View style={[styles.miniAvatar, { backgroundColor: colors.avatar[1], marginLeft: -6 }]} />
          </View>
          <Text style={styles.pillText}>{groupLabel}</Text>
        </View>
      ) : null}

      <View style={[styles.pill, styles.pillTopRight]}>
        <Text style={styles.pillText}>{categoryLabel}</Text>
      </View>

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        {locationLine ? (
          <Text style={styles.locationLine} numberOfLines={1}>
            {locationLine}
          </Text>
        ) : null}
        <Text style={styles.stackName} numberOfLines={2}>
          {restaurant.name}
        </Text>
      </LinearGradient>
    </View>
  );
}

function CompactCard({ restaurant }: { restaurant: Restaurant }) {
  const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];
  return (
    <View style={styles.compactCard}>
      {restaurant.photo_url ? (
        <Image
          source={{ uri: restaurant.photo_url }}
          style={styles.compactImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.compactImage, styles.imagePlaceholder]}>
          <Text style={styles.compactPlaceholderEmoji}>🍽️</Text>
        </View>
      )}
      <View style={styles.compactInfo}>
        <Text style={styles.compactName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.compactMeta} numberOfLines={1}>
          {restaurant.cuisines[0]} · {PRICE_LABELS[restaurant.price_level]} · ⭐{" "}
          {restaurant.rating.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stackCard: {
    width: CARD_WIDTH,
    height: STACK_CARD_HEIGHT,
    borderRadius: spacing.cardRadius,
    overflow: "hidden",
    backgroundColor: colors.imagePlaceholder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  stackImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  pill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 2,
    gap: 6,
  },
  pillTopLeft: {
    top: 16,
    left: 16,
  },
  pillTopRight: {
    top: 16,
    right: 16,
  },
  pillAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  pillText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.lg,
  },
  locationLine: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  stackName: {
    fontSize: 26,
    fontFamily: fontFamily.extraBold,
    color: "#fff",
    lineHeight: 32,
  },
  compactCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    overflow: "hidden",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactImage: {
    width: 88,
    height: 88,
  },
  compactPlaceholderEmoji: {
    fontSize: 32,
  },
  compactInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "center",
  },
  compactName: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: 4,
  },
  compactMeta: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
});
