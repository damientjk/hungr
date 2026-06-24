import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import { api, SessionSummary } from "@/src/lib/api";
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
  const [pastSessions, setPastSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setSessionsLoading(true);
      api.sessions
        .list()
        .then(({ sessions }) => setPastSessions(sessions))
        .catch(() => {})
        .finally(() => setSessionsLoading(false));
    }, [])
  );

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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

        {/* My Sessions */}
        <Text style={styles.sectionHeader}>My Sessions</Text>

        {sessionsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : pastSessions.length === 0 ? (
          <Text style={styles.emptyText}>No completed sessions yet.</Text>
        ) : (
          pastSessions.map((s) => {
            const isOwner = s.owner_id === session?.user.id;
            const date = new Date(s.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <View key={s.id} style={styles.sessionCard}>
                <View style={styles.sessionCardTop}>
                  <Text style={styles.sessionName}>{s.name}</Text>
                  <View style={[styles.roleBadge, isOwner ? styles.ownerBadge : styles.memberBadge]}>
                    <Text style={[styles.roleText, isOwner ? styles.ownerText : styles.memberText]}>
                      {isOwner ? "Owner" : "Participant"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sessionMeta}>{date} · {s.participant_count} {s.participant_count === 1 ? "person" : "people"}</Text>
                {s.top_match_name ? (
                  <Text style={styles.topMatch}>🎉 Agreed on {s.top_match_name}</Text>
                ) : (
                  <Text style={styles.noMatch}>No match reached</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
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
  sectionHeader: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ownerBadge: {
    backgroundColor: colors.tintSurface,
  },
  memberBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  ownerText: {
    color: colors.primary,
  },
  memberText: {
    color: colors.textMuted,
  },
  sessionMeta: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    marginBottom: 4,
  },
  topMatch: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.like,
  },
  noMatch: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
});
