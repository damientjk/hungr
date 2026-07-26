import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import { useSession } from "@/src/lib/SessionContext";
import { supabase } from "@/src/lib/supabase";
import { api, SessionSummary } from "@/src/lib/api";
import { Screen } from "@/src/components/ui/Screen";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontFamily } from "@/src/theme/typography";
import { screenStyles } from "@/src/theme/screenStyles";

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

const DEFAULT_PRICE_MIN = 1;
const DEFAULT_PRICE_MAX = 4;
const DEFAULT_DISTANCE = 5000;

function formatFilterSummary(s: SessionSummary): string | null {
  const parts: string[] = [];

  if (s.cuisine_filters?.length) {
    parts.push(s.cuisine_filters.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", "));
  }

  const priceMin = s.price_min ?? DEFAULT_PRICE_MIN;
  const priceMax = s.price_max ?? DEFAULT_PRICE_MAX;
  const distance = s.max_distance ?? DEFAULT_DISTANCE;

  const nonDefaultPrice = priceMin !== DEFAULT_PRICE_MIN || priceMax !== DEFAULT_PRICE_MAX;
  const nonDefaultDistance = distance !== DEFAULT_DISTANCE;

  if (nonDefaultPrice) {
    parts.push(priceMin === priceMax ? PRICE_LABELS[priceMin] : `${PRICE_LABELS[priceMin]}–${PRICE_LABELS[Math.round(priceMax)]}`);
  }

  if (nonDefaultDistance) {
    parts.push(`${Math.round(distance / 1000)}km`);
  }

  if (s.halal) parts.push("Halal");
  if (s.vegetarian) parts.push("Vegetarian");
  if (s.vegan) parts.push("Vegan");

  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function ProfileScreen() {
  const { session: authSession, signOut, updateProfile } = useAuth();
  const { setSession: setGroupSession } = useSession();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [pastSessions, setPastSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);

  const user = authSession?.user;
  const nickname: string | undefined = user?.user_metadata?.nickname;
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;

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

  async function handleRestart(s: SessionSummary) {
    setRestartingId(s.id);
    try {
      // Restarts the closed session under this code — whoever gets here first
      // becomes the new owner, whether or not they led the original session.
      const { session: newSession } = await api.sessions.join(s.invite_code);
      setGroupSession(newSession);
      router.push("/(tabs)/sessions");
    } catch (e: any) {
      router.push("/(tabs)/sessions");
    } finally {
      setRestartingId(null);
    }
  }

  function handleReset() {
    Alert.alert(
      "Reset Account Data",
      "This permanently wipes your saved likes, bookmarks, and session history. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: confirmReset },
      ]
    );
  }

  async function confirmReset() {
    setResetting(true);
    setResetError(null);
    setResetSuccess(false);
    try {
      await api.account.resetData();
      setPastSessions([]);
      setGroupSession(null);
      setResetSuccess(true);
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetting(false);
    }
  }

  async function handleAvatarPress() {
    if (uploadingAvatar || !user) return;
    setAvatarError(null);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAvatarError("Photo library permission is required to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, {
          contentType: asset.mimeType ?? "image/jpeg",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image shows immediately at the same URL.
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await updateProfile({ avatar_url: publicUrl });
      if (updateError) throw updateError;
    } catch (e: any) {
      setAvatarError(e.message ?? "Failed to update profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function startEditingNickname() {
    setNicknameDraft(nickname ?? "");
    setEditingNickname(true);
  }

  async function saveNickname() {
    const trimmed = nicknameDraft.trim();
    setSavingNickname(true);
    try {
      const { error } = await updateProfile({ nickname: trimmed });
      if (error) throw error;
      setEditingNickname(false);
    } catch {
      // Leave the editor open so the user can retry.
    } finally {
      setSavingNickname(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={screenStyles.header}>Profile</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={handleAvatarPress}
            disabled={uploadingAvatar}
            activeOpacity={0.8}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {(nickname || user?.email)?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            )}
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          {editingNickname ? (
            <View style={styles.nicknameEditRow}>
              <TextInput
                style={styles.nicknameInput}
                value={nicknameDraft}
                onChangeText={setNicknameDraft}
                placeholder="Nickname"
                placeholderTextColor={colors.textLight}
                autoFocus
                maxLength={30}
                editable={!savingNickname}
              />
              <TouchableOpacity onPress={saveNickname} disabled={savingNickname} style={styles.nicknameSaveBtn}>
                {savingNickname ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingNickname(false)} disabled={savingNickname}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nicknameRow} onPress={startEditingNickname}>
              <Text style={styles.nickname}>{nickname || "Add a nickname"}</Text>
              <Ionicons name="pencil" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          <Text style={styles.email}>{user?.email}</Text>
          {avatarError && <Text style={styles.errorText}>{avatarError}</Text>}
        </View>

        <PrimaryButton
          title={resetting ? "Resetting..." : "Reset Account Data"}
          onPress={handleReset}
          loading={resetting}
          disabled={resetting}
          variant="secondary"
          style={styles.resetButton}
        />

        {resetSuccess && (
          <Text style={styles.successText}>Account data reset — starting fresh!</Text>
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
            const isOwner = s.owner_id === user?.id;
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
                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={() => handleRestart(s)}
                  disabled={restartingId === s.id}
                >
                  <Text style={styles.restartText}>
                    {restartingId === s.id ? "Starting..." : `↺ Restart · ${s.invite_code}`}
                  </Text>
                  {(() => { const summary = formatFilterSummary(s); return summary ? <Text style={styles.restartFilters}>{summary}</Text> : null; })()}
                </TouchableOpacity>
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
    overflow: "visible",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: fontFamily.extraBold,
    color: "#fff",
  },
  nicknameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  nickname: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  nicknameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    width: "100%",
  },
  nicknameInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.text,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
  },
  nicknameSaveBtn: {
    padding: 2,
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
  restartButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.tintSurface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  restartText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  restartFilters: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
});
