import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";

export default function SignupScreen() {
  const { signUpWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(email, password);
    if (error) {
      setError(error.message);
    } else {
      router.replace({ pathname: "/(auth)/check-email", params: { email } });
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>🍔 Hungr</Text>
      <Text style={styles.tagline}>Create your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating account..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.linkButton}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </Link>
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
  logo: { fontSize: 48, marginBottom: 8 },
  tagline: { fontSize: 18, color: "#fff", fontWeight: "600", marginBottom: 48 },
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
  linkButton: { marginTop: 24 },
  linkText: { color: "#fff", fontSize: 14 },
  linkBold: { fontWeight: "700" },
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
