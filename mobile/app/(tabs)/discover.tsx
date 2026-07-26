import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { api, Restaurant } from "@/src/lib/api";
import { useLocation } from "@/src/hooks/useLocation";
import { useDiscoverFilters } from "@/src/lib/DiscoverFiltersContext";
import { Screen } from "@/src/components/ui/Screen";
import { RestaurantListRow } from "@/src/components/RestaurantListRow";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";
import { screenStyles } from "@/src/theme/screenStyles";

type SortKey = "distance" | "rating" | "price";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "distance", label: "Nearest" },
  { key: "rating", label: "Top Rated" },
  { key: "price", label: "Price - Cheapest first" },
];

const DISTANCE_BANDS = [
  { label: "Under 500m", max: 500 },
  { label: "Under 1km", max: 1000 },
  { label: "Under 3km", max: 3000 },
  { label: "Further away", max: Infinity },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { coords, loading: locationLoading, error: locationError } = useLocation();
  const { filters } = useDiscoverFilters();
  const { halal, vegetarian, vegan } = filters;
  const activeFilterCount = [halal, vegetarian, vegan].filter(Boolean).length;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("distance");

  useEffect(() => {
    if (coords) {
      fetchRestaurants();
      fetchBookmarks();
    }
  }, [coords, halal, vegetarian, vegan]);

  const sections = useMemo((): { title: string; data: Restaurant[] }[] => {
    const sorted = [...restaurants].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price") return a.price_level - b.price_level;
      return a.distance_meters - b.distance_meters;
    });

    if (sort !== "distance") {
      return [{ title: "", data: sorted }];
    }

    // Group into distance bands
    const result: { title: string; data: Restaurant[] }[] = [];
    let assigned = new Set<string>();

    for (const band of DISTANCE_BANDS) {
      const items = sorted.filter(
        (r) => r.distance_meters <= band.max && !assigned.has(r.id)
      );
      if (items.length > 0) {
        items.forEach((r) => assigned.add(r.id));
        result.push({ title: band.label, data: items });
      }
    }

    return result;
  }, [restaurants, sort]);

  async function fetchRestaurants() {
    if (!coords) return;
    setLoading(true);
    try {
      const { restaurants } = await api.restaurants.nearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
        halal,
        vegetarian,
        vegan,
      });
      setRestaurants(restaurants);
    } catch (e) {
      console.error("Failed to fetch restaurants", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBookmarks() {
    try {
      const { bookmarks } = await api.bookmarks.list();
      setBookmarked(new Set(bookmarks.map((b) => b.id)));
    } catch (e) {
      console.error("Failed to fetch bookmarks", e);
    }
  }

  async function toggleBookmark(restaurantId: string) {
    if (toggling.has(restaurantId)) return;
    setToggling((prev) => new Set(prev).add(restaurantId));

    const isBookmarked = bookmarked.has(restaurantId);
    setBookmarked((prev) => {
      const next = new Set(prev);
      isBookmarked ? next.delete(restaurantId) : next.add(restaurantId);
      return next;
    });

    try {
      if (isBookmarked) {
        await api.bookmarks.remove(restaurantId);
      } else {
        await api.bookmarks.add(restaurantId);
      }
    } catch {
      setBookmarked((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.add(restaurantId) : next.delete(restaurantId);
        return next;
      });
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(restaurantId);
        return next;
      });
    }
  }

  if (locationError) {
    return (
      <View style={screenStyles.centered}>
        <Text style={screenStyles.emptyText}>{locationError}</Text>
      </View>
    );
  }

  if (locationLoading || loading) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={screenStyles.loadingText}>
          {locationLoading ? "Getting your location…" : "Finding restaurants…"}
        </Text>
      </View>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <Text style={screenStyles.header}>Discover</Text>
            <Text style={styles.sortByLabel}>Sort by:</Text>
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortBtn, sort === opt.key && styles.sortBtnActive]}
                  onPress={() => setSort(opt.key)}
                >
                  <Text style={[styles.sortText, sort === opt.key && styles.sortTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
              onPress={() => router.push("/discover-filters")}
            >
              <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isBookmarked = bookmarked.has(item.id);
          const distance =
            item.distance_meters < 1000
              ? `${Math.round(item.distance_meters)}m away`
              : `${(item.distance_meters / 1000).toFixed(1)}km away`;

          return (
            <RestaurantListRow
              restaurant={item}
              subtitle={distance}
              rightAction={{
                icon: isBookmarked ? "bookmark" : "bookmark-outline",
                filled: isBookmarked,
                onPress: () => toggleBookmark(item.id),
              }}
            />
          );
        }}
        ListEmptyComponent={
          <View style={screenStyles.centered}>
            <Text style={screenStyles.emptyText}>No restaurants found nearby.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sortByLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sortRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sortBtn: {
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtn: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    marginBottom: spacing.md,
    backgroundColor: colors.tintSurface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  filterBtnTextActive: {
    color: "#fff",
  },
  sortText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textLight,
  },
  sortTextActive: {
    color: "#fff",
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
});
