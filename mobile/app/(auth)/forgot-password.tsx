import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>📨</Text>
        <Text style={styles.title}>Email sent</Text>
        <Text style={styles.body}>
          Check your inbox for a password reset link.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.emoji}>🔑</Text>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.body}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleReset}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending..." : "Send Reset Link"}
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
  back: { position: "absolute", top: 64, left: 32 },
  backText: { color: "#fff", fontSize: 16, fontWeight: "600" },
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
