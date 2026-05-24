import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📬</Text>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a confirmation link to{"\n"}
        <Text style={styles.email}>{email}</Text>
      </Text>
      <Text style={styles.hint}>
        Tap the link in the email to activate your account, then come back and sign in.
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF4F00",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  email: { fontWeight: "700" },
  hint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 48,
  },
  button: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
