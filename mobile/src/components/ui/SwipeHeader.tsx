import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { HungrLogo } from "./HungrLogo";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontFamily } from "@/src/theme/typography";
import type { ParticipantStatus, SwipeStatus } from "@/src/lib/api";

interface Props {
  inviteCode: string;
  participants?: ParticipantStatus[];
  remaining?: number;
}

/** How many avatar slots the header has, including the overflow circle. */
const SLOTS = 3;

const STATUS_LABEL: Record<SwipeStatus, string> = {
  done: "Done",
  swiping: "Still swiping",
  away: "Away",
};

const STATUS_COLOR: Record<SwipeStatus, string> = {
  done: colors.like,
  swiping: colors.primary,
  away: colors.textLight,
};

/** Worst state wins, so a stalled member is never hidden behind the overflow circle. */
const SEVERITY: Record<SwipeStatus, number> = { away: 2, swiping: 1, done: 0 };

function worstStatus(participants: ParticipantStatus[]): SwipeStatus {
  return participants.reduce<SwipeStatus>(
    (worst, p) => (SEVERITY[p.status] > SEVERITY[worst] ? p.status : worst),
    "done"
  );
}

function displayName(p: ParticipantStatus): string {
  return p.nickname || p.email?.split("@")[0] || "Guest";
}

function formatInviteCode(code: string): string {
  const c = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (c.length >= 6) {
    return `${c.slice(0, 3)}-${c.slice(3, 6)}${c.length > 6 ? c.slice(6, 7) : ""}`;
  }
  return c;
}

/**
 * `overlap` pulls the avatar left so the header renders a stacked cluster. The
 * modal lists avatars in rows, where that margin would shove them off-edge.
 */
function Avatar({
  p,
  index,
  overlap = false,
}: {
  p: ParticipantStatus;
  index: number;
  overlap?: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { borderColor: STATUS_COLOR[p.status] },
        overlap && index > 0 && styles.avatarOverlap,
        p.status === "away" && styles.avatarAway,
      ]}
    >
      {p.avatarUrl ? (
        <Image source={{ uri: p.avatarUrl }} style={styles.avatarImage} />
      ) : (
        <View
          style={[
            styles.avatarFill,
            { backgroundColor: colors.avatar[index % colors.avatar.length] },
          ]}
        >
          <Text style={styles.avatarText}>{displayName(p).charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

export function SwipeHeader({ inviteCode, participants = [], remaining }: Props) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  // 1–2 members fill the slots directly; beyond that the last slot becomes a
  // tappable overflow circle carrying the count and the worst hidden state.
  const overflowed = participants.length > SLOTS - 1;
  const visible = overflowed ? participants.slice(0, SLOTS - 1) : participants;
  const hidden = overflowed ? participants.slice(SLOTS - 1) : [];
  const hiddenStatus = worstStatus(hidden);

  return (
    <View style={styles.row}>
      <HungrLogo size="sm" />

      <View style={styles.center}>
        <TouchableOpacity
          style={styles.avatars}
          onPress={() => setShowAll(true)}
          disabled={participants.length === 0}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {visible.map((p, i) => (
            <Avatar key={p.id} p={p} index={i} overlap />
          ))}
          {overflowed && (
            <View
              style={[
                styles.avatar,
                styles.overflow,
                styles.avatarOverlap,
                { borderColor: STATUS_COLOR[hiddenStatus] },
                hiddenStatus === "away" && styles.avatarAway,
              ]}
            >
              <Text style={styles.overflowText}>+{hidden.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.codePill}>
          <Text style={styles.codeText}>{formatInviteCode(inviteCode)}</Text>
        </View>
      </View>

      <View style={styles.rightSlot}>
        {remaining !== undefined && (
          <Text style={styles.counter}>{remaining} left</Text>
        )}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push("/(tabs)/sessions")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="menu" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={showAll} transparent animationType="fade" onRequestClose={() => setShowAll(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAll(false)}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>In this session · {participants.length}</Text>
            <ScrollView style={styles.modalList} bounces={false}>
              {participants.map((p, i) => (
                <View key={p.id} style={styles.modalRow}>
                  <Avatar p={p} index={i} />
                  <Text style={styles.modalName} numberOfLines={1}>
                    {displayName(p)}
                  </Text>
                  <Text style={[styles.modalStatus, { color: STATUS_COLOR[p.status] }]}>
                    {STATUS_LABEL[p.status]}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAll(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  center: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginHorizontal: spacing.sm,
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  avatarAway: {
    opacity: 0.4,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFill: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  overflow: {
    backgroundColor: colors.surface,
  },
  overflowText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  codePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counter: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalList: {
    maxHeight: 320,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  modalName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  modalStatus: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
  },
  modalClose: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
});
