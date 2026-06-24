import { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import { AuthLayout, authInputStyle, PrimaryButton } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";

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
    <AuthLayout subtitle="Swipe. Match. Eat.">
      <TextInput
        style={authInputStyle.input}
        placeholder="Email"
        placeholderTextColor={colors.textLight}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={authInputStyle.input}
        placeholder="Password"
        placeholderTextColor={colors.textLight}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={authInputStyle.error}>{error}</Text>}

      <PrimaryButton
        title={loading ? "Signing in..." : "Sign In"}
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
      />

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
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotButton: {
    marginTop: spacing.md,
    alignSelf: "flex-end",
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fontFamily.regular,
  },
  linkBold: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
