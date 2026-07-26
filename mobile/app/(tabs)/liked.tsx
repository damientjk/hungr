import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api, Restaurant, Folder } from "@/src/lib/api";
import { Screen } from "@/src/components/ui/Screen";
import { RestaurantListRow } from "@/src/components/RestaurantListRow";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";
import { screenStyles } from "@/src/theme/screenStyles";

type View = "all" | string; // "all" or a folder id

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<Restaurant[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>("all");

  // Folder creation modal
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  // Folder picker sheet
  const [pickerFor, setPickerFor] = useState<Restaurant | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ bookmarks }, { folders }] = await Promise.all([
        api.bookmarks.list(),
        api.folders.list(),
      ]);
      setBookmarks(bookmarks);
      setFolders(folders);
    } catch (e) {
      console.error("Failed to fetch bookmarks/folders", e);
    } finally {
      setLoading(false);
    }
  }

  async function removeBookmark(restaurantId: string) {
    setBookmarks((prev) => prev.filter((r) => r.id !== restaurantId));
    try {
      await api.bookmarks.remove(restaurantId);
      setFolders((prev) =>
        prev.map((f) => ({
          ...f,
          count: bookmarks.find((b) => b.id === restaurantId)?.folder_id === f.id
            ? Math.max(0, f.count - 1)
            : f.count,
        }))
      );
    } catch {
      fetchAll();
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const { folder } = await api.folders.create(newFolderName.trim());
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setShowCreate(false);
    } catch {
      Alert.alert("Error", "Failed to create folder.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteFolder(folder: Folder) {
    Alert.alert(
      `Delete "${folder.name}"?`,
      "Restaurants in this folder will be moved to All Saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.folders.delete(folder.id);
              setFolders((prev) => prev.filter((f) => f.id !== folder.id));
              setBookmarks((prev) =>
                prev.map((b) => (b.folder_id === folder.id ? { ...b, folder_id: null } : b))
              );
              if (activeView === folder.id) setActiveView("all");
            } catch {
              Alert.alert("Error", "Failed to delete folder.");
            }
          },
        },
      ]
    );
  }

  async function handleSetFolder(restaurant: Restaurant, folderId: string | null) {
    setPickerFor(null);
    const oldFolderId = restaurant.folder_id ?? null;

    // Optimistic update
    setBookmarks((prev) =>
      prev.map((b) => (b.id === restaurant.id ? { ...b, folder_id: folderId } : b))
    );
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === oldFolderId) return { ...f, count: Math.max(0, f.count - 1) };
        if (f.id === folderId) return { ...f, count: f.count + 1 };
        return f;
      })
    );

    try {
      await api.bookmarks.setFolder(restaurant.id, folderId);
    } catch {
      fetchAll();
    }
  }

  const visibleBookmarks =
    activeView === "all"
      ? bookmarks
      : bookmarks.filter((b) => b.folder_id === activeView);

  const activeFolder = folders.find((f) => f.id === activeView);

  if (loading) {
    return (
      <View style={screenStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Screen>
      <FlatList
        data={visibleBookmarks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.headerRow}>
              {activeView === "all" ? (
                <Text style={screenStyles.header}>Saved</Text>
              ) : (
                <TouchableOpacity onPress={() => setActiveView("all")} style={styles.backRow}>
                  <Text style={styles.backArrow}>←</Text>
                  <Text style={styles.folderTitle}>{activeFolder?.name}</Text>
                </TouchableOpacity>
              )}
              {activeView === "all" && (
                <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.newFolderBtn}>
                  <Text style={styles.newFolderText}>+ New folder</Text>
                </TouchableOpacity>
              )}
              {activeView !== "all" && activeFolder && (
                <TouchableOpacity onPress={() => handleDeleteFolder(activeFolder)}>
                  <Text style={styles.deleteFolderText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Folders grid (only in "all" view) */}
            {activeView === "all" && folders.length > 0 && (
              <View style={styles.foldersGrid}>
                {folders.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.folderCard}
                    onPress={() => setActiveView(f.id)}
                  >
                    <Text style={styles.folderEmoji}>📁</Text>
                    <Text style={styles.folderName} numberOfLines={2}>{f.name}</Text>
                    <Text style={styles.folderCount}>{f.count} {f.count === 1 ? "place" : "places"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Section label */}
            <Text style={styles.sectionLabel}>
              {activeView === "all" ? "All Saved" : `${visibleBookmarks.length} ${visibleBookmarks.length === 1 ? "place" : "places"}`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RestaurantListRow
            restaurant={item}
            rightAction={{
              icon: "bookmark",
              filled: true,
              onPress: () => removeBookmark(item.id),
            }}
            folderAction={{
              folderId: item.folder_id ?? null,
              folderName: folders.find((f) => f.id === item.folder_id)?.name ?? null,
              onPress: () => setPickerFor(item),
            }}
          />
        )}
        ListEmptyComponent={
          <View style={screenStyles.centered}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>
              {activeView === "all" ? "🔖" : "📁"}
            </Text>
            <Text style={screenStyles.emptyText}>
              {activeView === "all"
                ? "Tap the bookmark icon on any restaurant to save it here."
                : "No restaurants in this folder yet."}
            </Text>
          </View>
        }
      />

      {/* Create folder modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder name"
              placeholderTextColor={colors.textMuted}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              maxLength={100}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowCreate(false); setNewFolderName(""); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !newFolderName.trim() && styles.modalConfirmDisabled]}
                onPress={handleCreateFolder}
                disabled={creating || !newFolderName.trim()}
              >
                <Text style={styles.modalConfirmText}>{creating ? "Creating…" : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Folder picker sheet */}
      <Modal visible={!!pickerFor} transparent animationType="slide">
        <TouchableOpacity style={styles.sheetOverlay} onPress={() => setPickerFor(null)} activeOpacity={1}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Move to folder</Text>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => pickerFor && handleSetFolder(pickerFor, null)}
            >
              <Text style={styles.sheetRowIcon}>🔖</Text>
              <Text style={styles.sheetRowText}>All Saved (no folder)</Text>
              {!pickerFor?.folder_id && <Text style={styles.sheetCheck}>✓</Text>}
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={styles.sheetRow}
                onPress={() => pickerFor && handleSetFolder(pickerFor, f.id)}
              >
                <Text style={styles.sheetRowIcon}>📁</Text>
                <Text style={styles.sheetRowText}>{f.name}</Text>
                {pickerFor?.folder_id === f.id && <Text style={styles.sheetCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            {folders.length === 0 && (
              <Text style={styles.sheetEmpty}>No folders yet. Create one first.</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backArrow: {
    fontSize: 20,
    color: colors.primary,
  },
  folderTitle: {
    fontSize: 22,
    fontFamily: fontFamily.extraBold,
    color: colors.text,
  },
  newFolderBtn: {
    backgroundColor: colors.tintSurface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  newFolderText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  deleteFolderText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.destructive,
  },
  foldersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  folderCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  folderEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  folderName: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: "100%",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: colors.imagePlaceholder,
  },
  modalCancelText: {
    fontFamily: fontFamily.semiBold,
    color: colors.textLight,
    fontSize: 15,
  },
  modalConfirm: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontFamily: fontFamily.bold,
    color: "#fff",
    fontSize: 15,
  },
  // Folder picker sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  sheetRowIcon: {
    fontSize: 20,
  },
  sheetRowText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  sheetCheck: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
  sheetEmpty: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
