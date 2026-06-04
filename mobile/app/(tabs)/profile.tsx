import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "@/src/hooks/useAuth";
import { api } from "@/src/lib/api";
import { Screen } from "@/src/components/ui/Screen";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontFamily } from "@/src/theme/typography";
import { screenStyles } from "@/src/theme/screenStyles";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleReset() {
    setResetting(true);
    setResetError(null);
    setResetSuccess(false);
    try {
      await api.restaurants.resetSwipes();
      setResetSuccess(true);
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <Text style={screenStyles.header}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {session?.user.email?.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.email}>{session?.user.email}</Text>
      </View>

      <PrimaryButton
        title={resetting ? "Resetting..." : "Reset Likes"}
        onPress={handleReset}
        loading={resetting}
        disabled={resetting}
        variant="secondary"
        style={styles.resetButton}
      />

      {resetSuccess && (
        <Text style={styles.successText}>Likes reset — go discover again!</Text>
      )}
      {resetError && <Text style={styles.errorText}>{resetError}</Text>}

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.tintSurface,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: fontFamily.extraBold,
    color: "#fff",
  },
  email: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  resetButton: {
    marginTop: spacing.sm,
  },
  successText: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.like,
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.destructive,
    fontSize: 14,
    fontFamily: fontFamily.regular,
  },
  signOutButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.destructive,
  },
  signOutText: {
    color: colors.destructive,
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
});
