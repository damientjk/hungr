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
  Image,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, Restaurant, SwipeDirection } from "@/src/lib/api";
import { useLocation } from "@/src/hooks/useLocation";
import { RestaurantCard } from "@/src/components/RestaurantCard";
import { useSession } from "@/src/lib/SessionContext";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.3;
const BATCH_SIZE = 20;
const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

type Phase = "swiping" | "loading_results" | "waiting" | "results";

interface MatchResult {
  matches: Restaurant[];
  topMatch: (Restaurant & { likeCount: number }) | null;
  participantCount: number;
  doneCount: number;
  allDone: boolean;
}

export default function SwipeScreen() {
  const { session, setSession } = useSession();
  const router = useRouter();
  const { coords } = useLocation();
  const hasFetchedRef = useRef(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("swiping");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !swiping,
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

  // Reset fetch guard when session changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [session?.id]);

  // Load restaurants once when session enters swiping state
  useEffect(() => {
    if (session?.status === "swiping" && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchRestaurants();
    }
  }, [session?.id, session?.status]);

  // Poll via backend when waiting for owner to start (avoids RLS blocking direct queries)
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

  // When all cards are swiped, fetch results
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
      setMatchResult({ matches: [], topMatch: null, participantCount: 0, doneCount: 0, allDone: false });
      setPhase("results");
    }
  }

  // Poll while waiting for other members to finish swiping
  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    const interval = setInterval(async () => {
      try {
        const result = await api.sessions.matches(session.id);
        setMatchResult(result);
        if (result.allDone) setPhase("results");
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, session?.id]);

  function swipeCard(direction: SwipeDirection) {
    if (swiping) return;
    setSwiping(true);
    const toX = direction === "like" ? width * 1.5 : -width * 1.5;
    Animated.timing(position, {
      toValue: { x: toX, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      const restaurant = restaurants[currentIndex];
      if (restaurant) {
        api.restaurants.swipe(restaurant.id, direction, session.id).catch(console.error);
      }
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((i) => i + 1);
      setSwiping(false);
    });
  }

  // ── Session gates ──────────────────────────────────────────────
  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.gateEmoji}>👥</Text>
        <Text style={styles.gateText}>You need to be in a session to start swiping.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push("/(tabs)/sessions")}>
          <Text style={styles.btnText}>Join or create a session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (session.status !== "swiping") {
    return (
      <View style={styles.centered}>
        <Text style={styles.gateEmoji}>⏳</Text>
        <Text style={styles.gateText}>Waiting for the group leader to start swiping…</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push("/(tabs)/sessions")}>
          <Text style={styles.btnText}>Back to session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading / error states ─────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF4F00" />
        <Text style={styles.loadingText}>Finding restaurants…</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.gateText}>{fetchError}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => fetchRestaurants()}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Session was started but has no restaurants seeded yet (e.g. joined mid-session before owner loaded)
  if (!loading && phase === "swiping" && restaurants.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.gateEmoji}>🍽️</Text>
        <Text style={styles.gateText}>Restaurants are being loaded for this session…</Text>
        <TouchableOpacity style={styles.btn} onPress={() => fetchRestaurants()}>
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/(tabs)/sessions")}>
          <Text style={styles.secondaryBtnText}>Back to Group</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Results loading ────────────────────────────────────────────
  if (phase === "loading_results") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF4F00" />
        <Text style={styles.loadingText}>Finding your match…</Text>
      </View>
    );
  }

  // ── Waiting for others ─────────────────────────────────────────
  if (phase === "waiting" && matchResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <ActivityIndicator size="large" color="#FF4F00" style={{ marginBottom: 24 }} />
          <Text style={styles.resultTitle}>You're done!</Text>
          <Text style={styles.resultSubtitle}>Waiting for everyone to finish…</Text>
          <View style={styles.doneCard}>
            <Text style={styles.doneCount}>
              {matchResult.doneCount} / {matchResult.participantCount}
            </Text>
            <Text style={styles.doneLabel}>members finished</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Results screen ─────────────────────────────────────────────
  if (phase === "results" && matchResult) {
    const { matches, topMatch, participantCount } = matchResult;

    if (matches.length > 0) {
      const pick = matches[0];
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>Everyone agrees!</Text>
            <Text style={styles.resultSubtitle}>Your group match</Text>
            <View style={styles.resultCard}>
              {pick.photo_url ? (
                <Image source={{ uri: pick.photo_url }} style={styles.resultImage} />
              ) : (
                <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                  <Text style={{ fontSize: 48 }}>🍽️</Text>
                </View>
              )}
              <Text style={styles.resultName}>{pick.name}</Text>
              <Text style={styles.resultMeta}>
                {pick.cuisines[0]} · {PRICE_LABELS[pick.price_level]} · ⭐ {pick.rating.toFixed(1)}
              </Text>
              <Text style={styles.resultAddress} numberOfLines={2}>{pick.address}</Text>
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => router.push("/(tabs)/sessions")}>
              <Text style={styles.btnText}>Back to Group</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>🤔</Text>
          <Text style={styles.resultTitle}>No full match yet</Text>
          <Text style={styles.resultSubtitle}>Most popular across the group</Text>

          {topMatch ? (
            <View style={styles.resultCard}>
              {topMatch.photo_url ? (
                <Image source={{ uri: topMatch.photo_url }} style={styles.resultImage} />
              ) : (
                <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                  <Text style={{ fontSize: 48 }}>🍽️</Text>
                </View>
              )}
              <Text style={styles.resultName}>{topMatch.name}</Text>
              <Text style={styles.resultMeta}>
                {topMatch.cuisines[0]} · {PRICE_LABELS[topMatch.price_level]} · ⭐{" "}
                {topMatch.rating.toFixed(1)}
              </Text>
              <View style={styles.likeBar}>
                <Text style={styles.likeCount}>
                  ❤️ {topMatch.likeCount} / {participantCount} members liked this
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noLikesText}>Nobody liked any restaurants yet.</Text>
          )}

          <TouchableOpacity style={styles.btn} onPress={() => fetchRestaurants(true)}>
            <Text style={styles.btnText}>Try another {BATCH_SIZE}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/(tabs)/sessions")}
          >
            <Text style={styles.secondaryBtnText}>Back to Group</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Swiping ────────────────────────────────────────────────────
  const current = restaurants[currentIndex];
  const next = restaurants[currentIndex + 1];

  if (!current) return null;

  const remaining = restaurants.length - currentIndex;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>{session.name}</Text>
        <Text style={styles.counter}>{remaining} left</Text>
      </View>

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
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  header: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  counter: { fontSize: 14, fontWeight: "600", color: "#FF4F00" },
  cardStack: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardWrapper: { position: "absolute" },
  nextCard: { transform: [{ scale: 0.95 }, { translateY: 16 }] },
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
  // ── Results ──
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  resultEmoji: { fontSize: 64, marginBottom: 12 },
  resultTitle: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginBottom: 4 },
  resultSubtitle: { fontSize: 15, color: "#999", marginBottom: 24 },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  resultImage: { width: "100%", height: 180 },
  resultImagePlaceholder: {
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", padding: 16, paddingBottom: 4 },
  resultMeta: { fontSize: 14, color: "#666", paddingHorizontal: 16, paddingBottom: 8, textTransform: "capitalize" },
  resultAddress: { fontSize: 13, color: "#999", paddingHorizontal: 16, paddingBottom: 16 },
  likeBar: {
    backgroundColor: "#fff3ee",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  likeCount: { fontSize: 14, color: "#FF4F00", fontWeight: "600", textAlign: "center" },
  noLikesText: { fontSize: 16, color: "#999", marginBottom: 24 },
  doneCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  doneCount: { fontSize: 48, fontWeight: "800", color: "#FF4F00" },
  doneLabel: { fontSize: 16, color: "#999", marginTop: 8 },
  // ── Gates / loading ──
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  gateEmoji: { fontSize: 64, marginBottom: 16 },
  gateText: { fontSize: 18, color: "#666", textAlign: "center", marginBottom: 24 },
  loadingText: { marginTop: 16, color: "#666", fontSize: 16 },
  btn: {
    backgroundColor: "#FF4F00",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  secondaryBtnText: { color: "#999", fontWeight: "600", fontSize: 16 },
});
