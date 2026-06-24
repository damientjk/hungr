import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
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
  const [dropdownY, setDropdownY] = useState(0);
  const [dropdownX, setDropdownX] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  const wrapperRef = useRef<View>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync if parent resets value
  useEffect(() => {
    setInputText(value);
  }, [value]);

  const fetchSuggestions = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const bias = coords ?? undefined;
        const res = await api.restaurants.autocomplete(text, bias);
        setSuggestions(res.suggestions);
        if (res.suggestions.length > 0) {
          measureWrapper();
          setOpen(true);
        } else {
          setOpen(false);
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

  const measureWrapper = () => {
    wrapperRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownX(x);
      setDropdownY(y + height + 4);
      setDropdownWidth(width);
    });
  };

  return (
    <View ref={wrapperRef} style={styles.wrapper} onLayout={measureWrapper}>
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
        <Modal transparent animationType="none" onRequestClose={() => setOpen(false)}>
          <TouchableWithoutFeedback onPress={() => setOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.dropdownModal, { top: dropdownY, left: dropdownX, width: dropdownWidth }]}>
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
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
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
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownModal: {
    position: "absolute",
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
