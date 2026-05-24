import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate() {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      setError(error.message);
    } else {
      router.replace("/(tabs)/swipe");
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>New password</Text>
      <Text style={styles.body}>Choose a strong password for your account.</Text>

      <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor="#999"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUpdate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Updating..." : "Update Password"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C94000",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 12 },
  body: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    color: "#1a1a1a",
  },
  button: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: {
    width: "100%",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
  },
});
