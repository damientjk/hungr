import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { HungrLogo } from "./HungrLogo";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontFamily } from "@/src/theme/typography";

interface Props {
  inviteCode: string;
  participantCount?: number;
  remaining?: number;
}

function formatInviteCode(code: string): string {
  const c = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (c.length >= 6) {
    return `${c.slice(0, 3)}-${c.slice(3, 6)}${c.length > 6 ? c.slice(6, 7) : ""}`;
  }
  return c;
}

export function SwipeHeader({ inviteCode, participantCount = 1, remaining }: Props) {
  const router = useRouter();
  const avatarCount = Math.min(3, Math.max(1, participantCount));
  const labels = ["J", "D", "Y", "A", "M"];

  return (
    <View style={styles.row}>
      <HungrLogo size="sm" />

      <View style={styles.center}>
        <View style={styles.avatars}>
          {Array.from({ length: avatarCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.avatar,
                { backgroundColor: colors.avatar[i % colors.avatar.length], marginLeft: i > 0 ? -10 : 0 },
              ]}
            >
              <Text style={styles.avatarText}>{labels[i]}</Text>
            </View>
          ))}
        </View>
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
    borderColor: colors.background,
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: colors.text,
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
});
