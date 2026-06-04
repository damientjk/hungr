import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Restaurant } from "@/src/lib/api";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontFamily } from "@/src/theme/typography";

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

interface Props {
  restaurant: Restaurant;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    filled?: boolean;
    onPress: () => void;
  };
  subtitle?: string;
}

export function RestaurantListRow({ restaurant, rightAction, subtitle }: Props) {
  return (
    <View style={styles.item}>
      {restaurant.photo_url ? (
        <Image source={{ uri: restaurant.photo_url }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.placeholderEmoji}>🍽️</Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {restaurant.cuisines[0]} · {PRICE_LABELS[restaurant.price_level]} · ⭐{" "}
          {restaurant.rating.toFixed(1)}
        </Text>
        {subtitle ? (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : restaurant.address ? (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {restaurant.address}
          </Text>
        ) : null}
      </View>
      {rightAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={rightAction.onPress}>
          <Ionicons
            name={rightAction.icon}
            size={24}
            color={rightAction.filled ? colors.primary : colors.textLight}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.imagePlaceholder,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  itemSubtitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  actionBtn: {
    padding: spacing.sm,
  },
});
