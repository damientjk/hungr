import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/hooks/useAuth";
import { api } from "@/src/lib/api";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleReset() {
    setResetting(true);
    setResetError(null);
    setResetSuccess(false);
    try {
      await api.restaurants.resetSwipes();
      setResetSuccess(true);
    } catch (e: any) {
      setResetError(e.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {session?.user.email?.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.email}>{session?.user.email}</Text>
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleReset}
        disabled={resetting}
      >
        <Text style={styles.resetText}>
          {resetting ? "Resetting..." : "Reset Likes"}
        </Text>
      </TouchableOpacity>

      {resetSuccess && (
        <Text style={styles.successText}>Likes reset — go discover again!</Text>
      )}
      {resetError && <Text style={styles.errorText}>{resetError}</Text>}

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8", padding: 16 },
  header: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#C94000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  email: { fontSize: 16, color: "#666" },
  resetButton: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C94000",
  },
  resetText: { color: "#C94000", fontWeight: "700", fontSize: 16 },
  successText: {
    marginTop: 12,
    textAlign: "center",
    color: "#44aa44",
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    textAlign: "center",
    color: "#ff4444",
    fontSize: 14,
  },
  signOutButton: {
    position: "absolute",
    bottom: 48,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  signOutText: { color: "#ff4444", fontWeight: "700", fontSize: 16 },
});
