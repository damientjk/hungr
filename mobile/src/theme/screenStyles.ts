import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { fontFamily } from "./typography";
import { spacing } from "./spacing";

export const screenStyles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontFamily: fontFamily.extraBold,
    color: colors.text,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 16,
    fontFamily: fontFamily.regular,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    textAlign: "center",
  },
});
