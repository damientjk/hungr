import { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import { AuthLayout, authInputStyle, PrimaryButton } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";

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
      router.replace("/(auth)/check-email", { email });
    }
    setLoading(false);
  }

  return (
    <AuthLayout subtitle="Create your account">
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
        title={loading ? "Creating account..." : "Sign Up"}
        onPress={handleSignup}
        loading={loading}
        disabled={loading}
      />

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.linkButton}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  linkButton: { marginTop: spacing.lg, alignItems: "center" },
  linkText: { color: colors.textMuted, fontSize: 14, fontFamily: fontFamily.regular },
  linkBold: { fontFamily: fontFamily.bold, color: colors.primary },
});
