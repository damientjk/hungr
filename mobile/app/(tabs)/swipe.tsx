import { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  Linking,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { api, Restaurant, SwipeDirection } from "@/src/lib/api";
import { useLocation } from "@/src/hooks/useLocation";
import { RestaurantCard } from "@/src/components/RestaurantCard";
import { useSession } from "@/src/lib/SessionContext";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { SwipeActionBar } from "@/src/components/ui/SwipeActionBar";
import { SwipeHeader } from "@/src/components/ui/SwipeHeader";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontFamily } from "@/src/theme/typography";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.3;
const BATCH_SIZE = 20;
/** Height of the bottom tab bar (see app/(tabs)/_layout.tsx). */
const TAB_BAR_HEIGHT = 64;

type Phase = "swiping" | "loading_results" | "waiting" | "results";

interface MatchResult {
  matches: Restaurant[];
  topMatch: (Restaurant & { likeCount: number }) | null;
  participantCount: number;
  doneCount: number;
  allDone: boolean;
}

function GateView({
  emoji,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  emoji: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <Screen style={styles.gateScreen}>
      <View style={styles.gateContent}>
        <Text style={styles.gateEmoji}>{emoji}</Text>
        <Text style={styles.gateText}>{message}</Text>
        <PrimaryButton title={primaryLabel} onPress={onPrimary} />
        {secondaryLabel && onSecondary ? (
          <PrimaryButton
            title={secondaryLabel}
            onPress={onSecondary}
            variant="secondary"
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

export default function SwipeScreen() {
  const { session, setSession } = useSession();
  const { session: authSession } = useAuth();
  const router = useRouter();
  const { coords } = useLocation();
  const { height: windowHeight } = useWindowDimensions();
  // On web, rnw's ScrollView only scrolls when its height is bounded by the
  // parent chain — which doesn't propagate here, so tall result screens get
  // clipped. Cap the scroll area to the viewport (minus the tab bar) so it
  // scrolls. Native measures its own bounded height and needs no cap.
  const resultScrollStyle =
    Platform.OS === "web"
      ? [styles.flex1, { maxHeight: windowHeight - TAB_BAR_HEIGHT }]
      : styles.flex1;
  const isOwner = !!session && !!authSession && session.owner_id === authSession.user.id;
  const hasFetchedRef = useRef(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("swiping");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [groupProgress, setGroupProgress] = useState({ done: 0, total: 1 });
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const nextCardProgress = useRef(new Animated.Value(0)).current;
  const currentCardOpacity = useRef(new Animated.Value(1)).current;
  const nextCardScale = nextCardProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const nextCardOpacity = nextCardProgress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const nextCardTranslateY = nextCardProgress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  // Refs so PanResponder callbacks always see the latest values without being recreated.
  const swipingRef = useRef(false);
  const swipeCardRef = useRef<(direction: SwipeDirection) => void>(() => {});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !swipingRef.current,
      onMoveShouldSetPanResponder: () => !swipingRef.current,
      onPanResponderMove: (_evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeCardRef.current("like");
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeCardRef.current("dislike");
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useLayoutEffect(() => {
    currentCardOpacity.setValue(1);
    nextCardProgress.setValue(0);
  }, [currentIndex]);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [session?.id]);

  useEffect(() => {
    if (session?.status === "swiping" && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchRestaurants();
    }
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session || session.status !== "swiping") return;
    const sessionId = session.id;
    async function pollGroup() {
      try {
        const r = await api.sessions.matches(sessionId);
        setGroupProgress({ done: r.doneCount, total: r.participantCount || 1 });
      } catch {}
    }
    pollGroup();
    const interval = setInterval(pollGroup, 4000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  useFocusEffect(
    useCallback(() => {
      api.bookmarks
        .list()
        .then(({ bookmarks }) => setBookmarkedIds(new Set(bookmarks.map((b) => b.id))))
        .catch(() => {});
    }, [])
  );

  useEffect(() => {
    if (!session || session.status === "swiping") return;
    const interval = setInterval(async () => {
      try {
        const { session: latest } = await api.sessions.get(session.id);
        if (latest.status === "swiping") {
          setSession(latest);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (
      phase === "swiping" &&
      restaurants.length > 0 &&
      currentIndex >= restaurants.length
    ) {
      loadResults();
    }
  }, [currentIndex, restaurants.length]);

  async function fetchRestaurants(refresh = false) {
    if (!session) return;
    if (refresh && !coords) {
      Alert.alert(
        "Location Required",
        "Your location is needed to load a new batch of restaurants.",
        [
          { text: "Not Now", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    setLoading(true);
    setFetchError(null);
    setPhase("swiping");
    setMatchResult(null);
    try {
      let result: { restaurants: Restaurant[] };
      if (refresh && coords) {
        result = await api.sessions.refreshRestaurants(session.id, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      } else {
        result = await api.sessions.restaurants(session.id);
      }
      setRestaurants(result.restaurants);
      setCurrentIndex(0);
    } catch (e: any) {
      setFetchError(e?.message ?? "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  }

  async function loadResults() {
    if (!session) return;
    setPhase("loading_results");
    try {
      const result = await api.sessions.matches(session.id);
      setMatchResult(result);
      setPhase(result.allDone ? "results" : "waiting");
    } catch (e) {
      console.error("Failed to load results", e);
      setMatchResult({
        matches: [],
        topMatch: null,
        participantCount: 0,
        doneCount: 0,
        allDone: false,
      });
      setPhase("results");
    }
  }

  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    const interval = setInterval(async () => {
      try {
        const result = await api.sessions.matches(session.id);
        setMatchResult(result);
        if (result.allDone) {
          setPhase("results");
        } else if (result.doneCount === 0 && result.participantCount > 0) {
          // Owner started a new batch — reset and swipe again
          fetchRestaurants(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, session?.id]);

  useEffect(() => {
    if (phase !== "results" || !session) return;
    const interval = setInterval(async () => {
      try {
        const result = await api.sessions.matches(session.id);
        if (result.doneCount === 0 && result.participantCount > 0) {
          // Owner started a new batch — reset and swipe again
          fetchRestaurants(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, session?.id]);

  function swipeCard(direction: SwipeDirection) {
    if (swipingRef.current || !session) return;
    swipingRef.current = true;
    setSwiping(true);
    const toX = direction === "like" ? width * 1.5 : -width * 1.5;
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: toX, y: 0 },
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(nextCardProgress, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const restaurant = restaurants[currentIndex];
      if (restaurant) {
        api.restaurants.swipe(restaurant.id, direction, session.id).catch(console.error);
      }
      currentCardOpacity.setValue(0);
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((i) => i + 1);
      swipingRef.current = false;
      setSwiping(false);
    });
  }
  // Keep the ref pointing at the latest swipeCard so PanResponder always calls the current one.
  swipeCardRef.current = swipeCard;

  if (!session) {
    return (
      <GateView
        emoji="👥"
        message="You need to be in a session to start swiping."
        primaryLabel="Join or create a session"
        onPrimary={() => router.push("/(tabs)/sessions")}
      />
    );
  }

  if (session.status !== "swiping") {
    return (
      <GateView
        emoji="⏳"
        message="Waiting for the group leader to start swiping…"
        primaryLabel="Back to session"
        onPrimary={() => router.push("/(tabs)/sessions")}
      />
    );
  }

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Finding restaurants…</Text>
      </Screen>
    );
  }

  if (fetchError) {
    return (
      <GateView
        emoji="⚠️"
        message={fetchError}
        primaryLabel="Retry"
        onPrimary={() => fetchRestaurants()}
      />
    );
  }

  if (!loading && phase === "swiping" && restaurants.length === 0) {
    return (
      <GateView
        emoji="🍽️"
        message="Restaurants are being loaded for this session…"
        primaryLabel="Refresh"
        onPrimary={() => fetchRestaurants()}
        secondaryLabel="Back to Group"
        onSecondary={() => router.push("/(tabs)/sessions")}
      />
    );
  }

  if (phase === "loading_results") {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Finding your match…</Text>
      </Screen>
    );
  }

  if (phase === "waiting" && matchResult) {
    return (
      <Screen edges={["top"]}>
        <View style={styles.resultContainer}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.resultTitle}>You're done!</Text>
          <Text style={styles.resultSubtitle}>Waiting for everyone to finish…</Text>
          <View style={styles.doneCard}>
            <Text style={styles.doneCount}>
              {matchResult.doneCount} / {matchResult.participantCount}
            </Text>
            <Text style={styles.doneLabel}>members finished</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === "results" && matchResult) {
    const { matches, topMatch, participantCount } = matchResult;

    async function endAndLeave() {
      if (!session) { router.push("/(tabs)/sessions"); return; }
      try { await api.sessions.end(session.id); } catch {}
      setSession(null);
      router.push("/(tabs)/sessions");
    }

    function settleForThis() {
      router.push("/(tabs)/sessions");
    }

    if (matches.length > 0) {
      const pick = matches[0];
      return (
        <Screen edges={["top"]}>
          <ScrollView style={resultScrollStyle} contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>Everyone agrees!</Text>
            <Text style={styles.resultSubtitle}>Your group match</Text>
            <View style={styles.resultCardWrap}>
              <RestaurantCard restaurant={pick} variant="stack" cardHeight={260} />
            </View>
            <PrimaryButton title="End Session" onPress={endAndLeave} />
          </ScrollView>
        </Screen>
      );
    }

    return (
      <Screen edges={["top"]}>
        <ScrollView style={resultScrollStyle} contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.resultEmoji}>🤔</Text>
          <Text style={styles.resultTitle}>No full match yet</Text>
          <Text style={styles.resultSubtitle}>Most popular across the group</Text>

          {topMatch ? (
            <View style={styles.resultCardWrap}>
              <RestaurantCard restaurant={topMatch} variant="stack" cardHeight={260} />
              <View style={styles.likeBar}>
                <Text style={styles.likeCount}>
                  ❤️ {topMatch.likeCount} / {participantCount} members liked this
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noLikesText}>Nobody liked any restaurants yet.</Text>
          )}

          {isOwner ? (
            <>
              <PrimaryButton
                title={`Try another ${BATCH_SIZE}`}
                onPress={() => fetchRestaurants(true)}
              />
              <PrimaryButton
                title="Settle for this"
                onPress={settleForThis}
                variant="secondary"
                style={{ marginTop: spacing.sm }}
              />
            </>
          ) : (
            <Text style={styles.ownerDecideText}>Waiting for the owner to decide…</Text>
          )}
        </ScrollView>
      </Screen>
    );
  }

  const current = restaurants[currentIndex];
  const next = restaurants[currentIndex + 1];

  if (!current) return null;

  const cardOverlay = {
    groupDone: groupProgress.done,
    groupTotal: groupProgress.total,
  };

  async function toggleBookmark() {
    const id = current.id;
    const wasBookmarked = bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      wasBookmarked ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (wasBookmarked) await api.bookmarks.remove(id);
      else await api.bookmarks.add(id);
    } catch (e: any) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        wasBookmarked ? next.add(id) : next.delete(id);
        return next;
      });
      Alert.alert(
        "Could not save",
        e?.message ?? "Check that you are signed in and the API is running."
      );
    }
  }

  return (
    <Screen edges={["top"]} style={styles.swipeScreen}>
      <SwipeHeader
        inviteCode={session.invite_code}
        participantCount={groupProgress.total}
        remaining={restaurants.length - currentIndex}
      />

      <View style={styles.cardStack}>
        {next && (
          <Animated.View style={[styles.cardWrapper, {
            opacity: nextCardOpacity,
            transform: [{ scale: nextCardScale }, { translateY: nextCardTranslateY }],
          }]}>
            <RestaurantCard
              restaurant={next}
              variant="stack"
              overlay={cardOverlay}
            />
          </Animated.View>
        )}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: currentCardOpacity,
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotation },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <RestaurantCard
            restaurant={current}
            variant="stack"
            overlay={cardOverlay}
          />
        </Animated.View>
      </View>

      <SwipeActionBar
        onDislike={() => swipeCard("dislike")}
        onBookmark={toggleBookmark}
        onLike={() => swipeCard("like")}
        disabled={swiping}
        bookmarked={bookmarkedIds.has(current.id)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gateScreen: {
    justifyContent: "center",
  },
  gateContent: {
    padding: spacing.xl,
    width: "100%",
  },
  gateEmoji: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  gateText: {
    fontSize: 17,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 16,
    fontFamily: fontFamily.regular,
  },
  swipeScreen: {
    backgroundColor: colors.background,
  },
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    position: "absolute",
  },
  flex1: {
    flex: 1,
  },
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  resultScroll: {
    alignItems: "center",
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  resultTitle: {
    fontSize: 28,
    fontFamily: fontFamily.extraBold,
    color: colors.text,
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  resultCardWrap: {
    width: "100%",
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  likeBar: {
    backgroundColor: colors.tintSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
    width: "100%",
  },
  likeCount: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    textAlign: "center",
  },
  noLikesText: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  ownerDecideText: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
  doneCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneCount: {
    fontSize: 48,
    fontFamily: fontFamily.extraBold,
    color: colors.primary,
  },
  doneLabel: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
});
