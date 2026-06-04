import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

interface Props {
  onDislike: () => void;
  onBookmark: () => void;
  onLike: () => void;
  disabled?: boolean;
  bookmarked?: boolean;
}

export function SwipeActionBar({
  onDislike,
  onBookmark,
  onLike,
  disabled,
  bookmarked,
}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.side]}
        onPress={onDislike}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Ionicons name="close" size={28} color={colors.nope} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.side]}
        onPress={onBookmark}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Ionicons
          name={bookmarked ? "bookmark" : "bookmark-outline"}
          size={26}
          color={colors.text}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.like]}
        onPress={onLike}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Ionicons name="heart" size={32} color={colors.likeIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.sm,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  side: {
    width: spacing.buttonSize,
    height: spacing.buttonSize,
    borderRadius: spacing.buttonSize / 2,
    backgroundColor: colors.surface,
  },
  like: {
    width: spacing.likeButtonSize,
    height: spacing.likeButtonSize,
    borderRadius: spacing.likeButtonSize / 2,
    backgroundColor: colors.like,
    shadowColor: colors.like,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
