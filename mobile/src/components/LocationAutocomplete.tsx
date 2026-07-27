import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { api } from "@/src/lib/api";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";

interface Suggestion {
  description: string;
  placeId: string;
}

interface Props {
  value: string;
  onChange: (address: string) => void;
  coords?: { latitude: number; longitude: number } | null;
}

export function LocationAutocomplete({ value, onChange, coords }: Props) {
  const [inputText, setInputText] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync if parent resets value
  useEffect(() => {
    setInputText(value);
  }, [value]);

  const cancelScheduledClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 1500);
  };

  const fetchSuggestions = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    cancelScheduledClose();
    if (!text.trim()) {
      setSuggestions([]);
      scheduleClose();
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const bias = coords ?? undefined;
        const res = await api.restaurants.autocomplete(text, bias);
        setSuggestions(res.suggestions);
        if (res.suggestions.length > 0) {
          cancelScheduledClose();
          setOpen(true);
        } else {
          scheduleClose();
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleChangeText = (text: string) => {
    setInputText(text);
    onChange(text);
    fetchSuggestions(text);
  };

  const handleSelect = (suggestion: Suggestion) => {
    setInputText(suggestion.description);
    onChange(suggestion.description);
    setSuggestions([]);
    setOpen(false);
  };

  const handleClear = () => {
    setInputText("");
    onChange("");
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Current location"
          placeholderTextColor={colors.textLight}
          value={inputText}
          onChangeText={handleChangeText}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.spinner}
          />
        )}
        {!loading && inputText.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {open && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.placeId}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.suggestion,
                  index < suggestions.length - 1 && styles.suggestionBorder,
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative", zIndex: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  spinner: { marginRight: 12 },
  clearBtn: { paddingHorizontal: 12 },
  clearText: { fontSize: 13, color: colors.textLight },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 220,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 20,
    zIndex: 20,
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
});
