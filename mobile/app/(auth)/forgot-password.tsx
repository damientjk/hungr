import { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import { AuthLayout, authInputStyle, PrimaryButton } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";
import { spacing } from "@/src/theme/spacing";

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
      <AuthLayout showLogo={false} title="Email sent" subtitle="Check your inbox for a password reset link.">
        <PrimaryButton
          title="Back to Sign In"
          onPress={() => router.replace("/(auth)/login")}
        />
      </AuthLayout>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <AuthLayout
        showLogo={false}
        title="Reset password"
        subtitle="Enter your email and we'll send you a link to reset your password."
      >
        <TextInput
          style={authInputStyle.input}
          placeholder="Email"
          placeholderTextColor={colors.textLight}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error && <Text style={authInputStyle.error}>{error}</Text>}

        <PrimaryButton
          title={loading ? "Sending..." : "Send Reset Link"}
          onPress={handleReset}
          loading={loading}
          disabled={loading}
        />
      </AuthLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  back: { position: "absolute", top: 56, left: spacing.xl, zIndex: 10 },
  backText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
  },
});
