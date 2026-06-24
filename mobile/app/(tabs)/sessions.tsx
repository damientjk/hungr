import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { api, Restaurant, SessionFilterValues, DEFAULT_FILTERS } from "@/src/lib/api";
import { SessionFilters } from "@/src/components/SessionFilters";
import { useSession } from "@/src/lib/SessionContext";
import { useLocation } from "@/src/hooks/useLocation";
import { supabase } from "@/src/lib/supabase";
import { Screen } from "@/src/components/ui/Screen";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";
import { screenStyles } from "@/src/theme/screenStyles";

export default function SessionsScreen() {
  const { session, setSession } = useSession();
  const router = useRouter();
  const { coords, error: locationError } = useLocation();
  const [joinCode, setJoinCode] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilterValues>(DEFAULT_FILTERS);
  const prevSessionIdRef = useRef<string | null>(null);
  if (session?.id !== prevSessionIdRef.current) {
    prevSessionIdRef.current = session?.id ?? null;
    if (filters !== DEFAULT_FILTERS) setFilters(DEFAULT_FILTERS);
  }
  const [matchResult, setMatchResult] = useState<{
    matches: Restaurant[];
    topMatch: (Restaurant & { likeCount: number }) | null;
    participantCount: number;
  } | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user.id ?? null);
    });
  }, []);

  // Subscribe to session status changes via Supabase Realtime
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload: any) => {
          const updated = payload.new;
          setSession({ ...session, status: updated.status });
          if (updated.status === "swiping") {
            router.push("/(tabs)/swipe");
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [session?.id]);

  // Load matches whenever session is in swiping state
  useEffect(() => {
    if (session?.status === "swiping") fetchMatches();
  }, [session?.status, session?.id]);

  // Re-fetch on tab focus via backend (avoids RLS issues with direct Supabase queries)
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      api.sessions.get(session.id)
        .then(({ session: latest }) => {
          if (latest.status !== session.status) {
            if (latest.status === "closed") {
              setSession(null);
            } else {
              setSession(latest);
              if (latest.status === "swiping") router.push("/(tabs)/swipe");
            }
          }
        })
        .catch(() => {});
    }, [session?.id, session?.status])
  );

  // Poll every 3 s via backend so RLS never blocks the status check
  useEffect(() => {
    if (!session || (session.status !== "active" && session.status !== "swiping")) return;
    const interval = setInterval(async () => {
      try {
        const { session: latest } = await api.sessions.get(session.id);
        if (latest.status === "closed") {
          setSession(null);
        } else if (latest.status === "swiping" && session.status === "active") {
          setSession(latest);
          router.push("/(tabs)/swipe");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  async function fetchMatches() {
    if (!session) return;
    setMatchesLoading(true);
    try {
      const result = await api.sessions.matches(session.id);
      setMatchResult(result);
    } catch (e) {
      console.error("Failed to fetch matches", e);
    } finally {
      setMatchesLoading(false);
    }
  }

  async function handleCreate() {
    setCreateError(null);
    if (!sessionName.trim()) {
      setCreateError("Give your group session a name.");
      return;
    }
    setLoading(true);
    try {
      const { session } = await api.sessions.create({ name: sessionName });
      setSession(session);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setJoinError(null);
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const { session } = await api.sessions.join(joinCode.toUpperCase().trim());
      setSession(session);
      if (session.status === "swiping") router.push("/(tabs)/swipe");
    } catch (e: any) {
      setJoinError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartSwiping() {
    if (!session) return;
    if (!coords) {
      Alert.alert(
        "Location Required",
        "Hungr needs your location to find nearby restaurants for the session.",
        [
          { text: "Not Now", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    setLoading(true);
    setStartError(null);
    try {
      const { session: updated } = await api.sessions.start(session.id, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        ...filters,
        priceMin: Math.round(filters.priceMin),
        priceMax: Math.round(filters.priceMax),
        address: filters.address?.trim() ? filters.address.trim() : undefined,
      });
      setSession(updated);
      router.push("/(tabs)/swipe");
    } catch (e: any) {
      setStartError(e?.message ?? "Failed to start swiping");
    } finally {
      setLoading(false);
    }
  }

  async function shareInviteCode() {
    if (!session) return;
    await Share.share({
      message: `Join my Hungr group session! Code: ${session.invite_code}`,
    });
  }

  if (session) {
    const isOwner = myUserId === session.owner_id;
    const isSwiping = session.status === "swiping";

    return (
      <Screen style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.activeScroll}
        >
        <Text style={styles.header}>Group Session</Text>

        <View style={styles.activeSession}>
          <Text style={styles.sessionName}>{session.name}</Text>

          {!isSwiping && (
            <>
              <Text style={styles.inviteLabel}>Invite code</Text>
              <Text style={styles.inviteCode}>{session.invite_code}</Text>
              <TouchableOpacity style={styles.shareButton} onPress={shareInviteCode}>
                <Text style={styles.shareButtonText}>Share Invite</Text>
              </TouchableOpacity>
            </>
          )}

          {isSwiping && (
            <View style={styles.swipingBadge}>
              <Text style={styles.swipingBadgeText}>● Swiping in progress</Text>
            </View>
          )}
        </View>

        {/* Owner filters + start */}
        {isOwner && !isSwiping && (
          <>
            <SessionFilters value={filters} onChange={setFilters} coords={coords} />
            {startError && <Text style={styles.error}>{startError}</Text>}
            <TouchableOpacity
              style={[styles.startButton, loading && styles.buttonDisabled]}
              onPress={handleStartSwiping}
              disabled={loading}
            >
              <Text style={styles.startButtonText}>
                {loading ? "Starting…" : "Start Swiping"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!isOwner && !isSwiping && (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingText}>
              Waiting for the group leader to start swiping…
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                api.sessions.get(session.id)
                  .then(({ session: latest }) => {
                    setSession(latest);
                    if (latest.status === "swiping") router.push("/(tabs)/swipe");
                  })
                  .catch(() => {});
              }}
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {isSwiping && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push("/(tabs)/swipe")}
          >
            <Text style={styles.startButtonText}>Go Swipe</Text>
          </TouchableOpacity>
        )}

        {/* Matches */}
        {isSwiping && (
          <View style={styles.matchesSection}>
            <View style={styles.matchesHeader}>
              <Text style={styles.matchesTitle}>Group Matches</Text>
              <TouchableOpacity onPress={fetchMatches}>
                <Text style={styles.refreshLink}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {matchesLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : !matchResult || (matchResult.matches.length === 0 && !matchResult.topMatch) ? (
              <Text style={styles.noMatchesText}>No matches yet — keep swiping!</Text>
            ) : matchResult.matches.length > 0 ? (
              <>
                <Text style={styles.matchLabel}>🎉 Everyone agrees on:</Text>
                <FlatList
                  data={matchResult.matches}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.matchItem}>
                      <Text style={styles.matchName}>{item.name}</Text>
                      <Text style={styles.matchMeta}>
                        {item.cuisines[0]} · ⭐ {item.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                />
              </>
            ) : matchResult.topMatch ? (
              <>
                <Text style={styles.matchLabel}>🤔 Most popular so far:</Text>
                <View style={styles.matchItem}>
                  <Text style={styles.matchName}>{matchResult.topMatch.name}</Text>
                  <Text style={styles.matchMeta}>
                    {matchResult.topMatch.cuisines[0]} · ⭐ {matchResult.topMatch.rating.toFixed(1)}
                  </Text>
                  <Text style={styles.likeCount}>
                    ❤️ {matchResult.topMatch.likeCount} / {matchResult.participantCount} members
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => setSession(null)}
        >
          <Text style={styles.leaveText}>Leave session</Text>
        </TouchableOpacity>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <Text style={styles.header}>Group</Text>
      <Text style={styles.subtitle}>
        Swipe together and find a restaurant everyone agrees on.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create a session</Text>
        <TextInput
          style={styles.input}
          placeholder="Session name (e.g. Friday lunch)"
          placeholderTextColor="#999"
          value={sessionName}
          onChangeText={setSessionName}
        />
        {createError && <Text style={styles.error}>{createError}</Text>}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Join with a code</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          value={joinCode}
          onChangeText={setJoinCode}
        />
        {joinError && <Text style={styles.error}>{joinError}</Text>}
        <TouchableOpacity
          style={[styles.button, styles.joinButton, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Join</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  header: { ...screenStyles.header, marginBottom: spacing.sm, padding: 0 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.text,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 14,
    alignItems: "center",
  },
  joinButton: { backgroundColor: colors.text },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textLight,
    fontFamily: fontFamily.regular,
  },
  activeSession: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionName: {
    fontSize: 22,
    fontFamily: fontFamily.extraBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inviteLabel: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  inviteCode: {
    fontSize: 40,
    fontFamily: fontFamily.extraBold,
    letterSpacing: 8,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
  shareButtonText: {
    color: "#fff",
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  swipingBadge: {
    backgroundColor: colors.tintSurface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  swipingBadgeText: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 18,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  startButtonText: {
    color: "#fff",
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  waitingBox: {
    backgroundColor: colors.imagePlaceholder,
    borderRadius: spacing.cardRadius,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
    gap: 12,
  },
  waitingText: {
    color: colors.textLight,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    textAlign: "center",
  },
  refreshBtn: { paddingHorizontal: 20, paddingVertical: spacing.sm },
  refreshBtnText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  activeScroll: {
    paddingBottom: spacing.lg,
  },
  matchesSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  matchesTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  refreshLink: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
  noMatchesText: {
    color: colors.textLight,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  matchLabel: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  likeCount: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
    marginTop: 2,
  },
  matchItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  matchName: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginBottom: 4,
  },
  matchMeta: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
  },
  leaveButton: { alignSelf: "center", paddingVertical: spacing.sm },
  leaveText: {
    color: colors.destructive,
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
  },
  error: {
    color: colors.destructive,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.sm,
  },
});
