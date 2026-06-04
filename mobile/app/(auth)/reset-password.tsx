import { useState } from "react";
import { Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import { AuthLayout, authInputStyle, PrimaryButton } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";

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
    <AuthLayout
      showLogo={false}
      title="New password"
      subtitle="Choose a strong password for your account."
    >
      <TextInput
        style={authInputStyle.input}
        placeholder="New password"
        placeholderTextColor={colors.textLight}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={authInputStyle.input}
        placeholder="Confirm password"
        placeholderTextColor={colors.textLight}
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      {error && <Text style={authInputStyle.error}>{error}</Text>}

      <PrimaryButton
        title={loading ? "Updating..." : "Update Password"}
        onPress={handleUpdate}
        loading={loading}
        disabled={loading}
      />
    </AuthLayout>
  );
}
