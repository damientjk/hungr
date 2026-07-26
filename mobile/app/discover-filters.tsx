import { useState } from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useDiscoverFilters } from "@/src/lib/DiscoverFiltersContext";
import { Screen } from "@/src/components/ui/Screen";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";
import { screenStyles } from "@/src/theme/screenStyles";

export default function DiscoverFiltersScreen() {
  const router = useRouter();
  const { filters, setFilters } = useDiscoverFilters();
  const [draft, setDraft] = useState(filters);

  function confirm() {
    setFilters(draft);
    router.back();
  }

  return (
    <Screen style={styles.screen}>
      <Text style={screenStyles.header}>Filters</Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Halal only</Text>
        <Switch
          value={draft.halal}
          onValueChange={(v) => setDraft((d) => ({ ...d, halal: v }))}
          trackColor={{ true: colors.primary, false: "#FFDEBF" }}
          ios_backgroundColor="#FFDEBF"
          thumbColor="#fff"
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Vegetarian</Text>
        <Switch
          value={draft.vegetarian}
          onValueChange={(v) => setDraft((d) => ({ ...d, vegetarian: v }))}
          trackColor={{ true: colors.primary, false: "#FFDEBF" }}
          ios_backgroundColor="#FFDEBF"
          thumbColor="#fff"
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Vegan</Text>
        <Switch
          value={draft.vegan}
          onValueChange={(v) => setDraft((d) => ({ ...d, vegan: v }))}
          trackColor={{ true: colors.primary, false: "#FFDEBF" }}
          ios_backgroundColor="#FFDEBF"
          thumbColor="#fff"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={confirm}>
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: "#fff",
  },
});
