import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api, Restaurant } from "@/src/lib/api";
import { Screen } from "@/src/components/ui/Screen";
import { RestaurantListRow } from "@/src/components/RestaurantListRow";
import { colors } from "@/src/theme/colors";
import { screenStyles } from "@/src/theme/screenStyles";

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [])
  );

  async function fetchBookmarks() {
    setLoading(true);
    try {
      const { bookmarks } = await api.bookmarks.list();
      setBookmarks(bookmarks);
    } catch (e) {
      console.error("Failed to fetch bookmarks", e);
    } finally {
      setLoading(false);
    }
  }

  async function removeBookmark(restaurantId: string) {
    setBookmarks((prev) => prev.filter((r) => r.id !== restaurantId));
    try {
      await api.bookmarks.remove(restaurantId);
    } catch {
      fetchBookmarks();
    }
  }

  if (loading) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Screen>
      <Text style={screenStyles.header}>Bookmarks</Text>
      {bookmarks.length === 0 ? (
        <View style={screenStyles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🔖</Text>
          <Text style={screenStyles.emptyText}>
            Tap the bookmark icon on any restaurant to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={screenStyles.list}
          renderItem={({ item }) => (
            <RestaurantListRow
              restaurant={item}
              rightAction={{
                icon: "bookmark",
                filled: true,
                onPress: () => removeBookmark(item.id),
              }}
            />
          )}
        />
      )}
    </Screen>
  );
}
