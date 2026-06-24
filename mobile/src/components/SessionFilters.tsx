import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import Slider from "@react-native-community/slider";
import { CUISINE_OPTIONS, SessionFilterValues, DEFAULT_FILTERS } from "@/src/lib/api";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";
import { LocationAutocomplete } from "@/src/components/LocationAutocomplete";

interface Props {
  value: SessionFilterValues;
  onChange: (next: SessionFilterValues) => void;
  coords?: { latitude: number; longitude: number } | null;
}

// Rough estimated spend per person, mapped from Google's price_level (1–4).
const PRICE_ESTIMATES = ["", "Under $10", "$10–20", "$20–40", "$40+"];
const priceEstimate = (n: number) => PRICE_ESTIMATES[n];

/**
 * Owner-only panel to configure how the swipe deck is built before starting a
 * session: cuisines, dietary options, price range, distance, and the location
 * to search from (defaults to the device's current location).
 */
export function SessionFilters({ value, onChange, coords }: Props) {
  const patch = (partial: Partial<SessionFilterValues>) =>
    onChange({ ...value, ...partial });


  const toggleCuisine = (cuisine: string) => {
    const key = cuisine.toLowerCase();
    const has = value.cuisineFilters.includes(key);
    patch({
      cuisineFilters: has
        ? value.cuisineFilters.filter((c) => c !== key)
        : [...value.cuisineFilters, key],
    });
  };

  const distanceKm = (value.maxDistance / 1000).toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Filters</Text>
        <TouchableOpacity onPress={() => onChange(DEFAULT_FILTERS)} hitSlop={8}>
          <Text style={styles.resetBtn}>Reset</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Set these before you start swiping.</Text>

      {/* Cuisines */}
      <Text style={styles.label}>Cuisines</Text>
      <View style={styles.chips}>
        {CUISINE_OPTIONS.map((cuisine) => {
          const selected = value.cuisineFilters.includes(cuisine.toLowerCase());
          return (
            <TouchableOpacity
              key={cuisine}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleCuisine(cuisine)}
              activeOpacity={0.7}
            >
              <Text style={[styles.checkbox, selected && styles.checkboxOn]}>
                {selected ? "☑" : "☐"}
              </Text>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {cuisine}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dietary */}
      <Text style={styles.label}>Dietary</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Halal only</Text>
        <Switch
          value={value.halal}
          onValueChange={(v) => patch({ halal: v })}
          trackColor={{ true: colors.primary, false: "#FFDEBF" }}
          ios_backgroundColor="#FFDEBF"
          thumbColor="#fff"
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Vegetarian</Text>
        <Switch
          value={value.vegetarian}
          onValueChange={(v) => patch({ vegetarian: v })}
          trackColor={{ true: colors.primary, false: "#FFDEBF" }}
          ios_backgroundColor="#FFDEBF"
          thumbColor="#fff"
        />
      </View>

      {/* Price range */}
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>Max price</Text>
        <Text style={styles.sliderValue}>{priceEstimate(Math.round(value.priceMax))} per person</Text>
      </View>
      <Slider
        minimumValue={1}
        maximumValue={4}
        value={value.priceMax}
        onValueChange={(v) => patch({ priceMin: 1, priceMax: v })}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />

      {/* Distance */}
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>Distance</Text>
        <Text style={styles.sliderValue}>{distanceKm} km</Text>
      </View>
      <Slider
        minimumValue={1000}
        maximumValue={20000}
        step={500}
        value={value.maxDistance}
        onValueChange={(v) => patch({ maxDistance: v })}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />

      {/* Location */}
      <Text style={styles.label}>Search from</Text>
      <LocationAutocomplete
        value={value.address ?? ""}
        onChange={(t) => patch({ address: t || undefined })}
        coords={coords}
      />
      <Text style={styles.hint}>
        Leave blank to use your current location, or type a place or address.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardRadius,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
    elevation: 10,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 18, fontFamily: fontFamily.bold, color: colors.text },
  resetBtn: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  hint: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.tintSurface, borderColor: colors.primary },
  checkbox: { fontSize: 14, color: colors.textLight, marginRight: 6 },
  checkboxOn: { color: colors.primary },
  chipText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.textMuted },
  chipTextSelected: { color: colors.primary },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  toggleLabel: { fontSize: 14, fontFamily: fontFamily.regular, color: colors.text },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderValue: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginTop: spacing.md,
  },
  legend: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textLight,
    marginTop: 6,
  },
});
