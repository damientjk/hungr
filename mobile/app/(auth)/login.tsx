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
import { Link } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";

export default function LoginScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>🍔 Hungr</Text>
      <Text style={styles.tagline}>Swipe right on dinner.</Text>

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
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Signing in..." : "Sign In"}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/forgot-password" asChild>
        <TouchableOpacity style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/(auth)/signup" asChild>
        <TouchableOpacity style={styles.linkButton}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Sign up</Text>
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
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 48,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    marginTop: 24,
  },
  linkText: {
    color: "#fff",
    fontSize: 14,
  },
  linkBold: {
    fontWeight: "700",
  },
  forgotButton: {
    marginTop: 16,
    alignSelf: "flex-end",
  },
  forgotText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
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
