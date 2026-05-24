import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, Session } from "@/src/lib/api";

export default function SessionsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreate() {
    setCreateError(null);
    if (!sessionName.trim()) {
      setCreateError("Give your group session a name.");
      return;
    }
    setLoading(true);
    try {
      const { session } = await api.sessions.create({ name: sessionName });
      setSession(session);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setJoinError(null);
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const { session } = await api.sessions.join(joinCode.toUpperCase().trim());
      setSession(session);
    } catch (e: any) {
      setJoinError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function shareInviteCode() {
    if (!session) return;
    await Share.share({
      message: `Join my Hungr group session! Code: ${session.invite_code}`,
    });
  }

  if (session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>Group Session</Text>
        <View style={styles.activeSession}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <Text style={styles.inviteLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{session.invite_code}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={shareInviteCode}>
            <Text style={styles.shareButtonText}>Share Invite</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Everyone swipes, and you'll all see the restaurants you agree on!
          </Text>
        </View>
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => setSession(null)}
        >
          <Text style={styles.leaveText}>Leave session</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Group</Text>
      <Text style={styles.subtitle}>
        Swipe together and find a restaurant everyone agrees on.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create a session</Text>
        <TextInput
          style={styles.input}
          placeholder="Session name (e.g. Friday lunch)"
          placeholderTextColor="#999"
          value={sessionName}
          onChangeText={setSessionName}
        />
        {createError && <Text style={styles.error}>{createError}</Text>}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Join with a code</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          value={joinCode}
          onChangeText={setJoinCode}
        />
        {joinError && <Text style={styles.error}>{joinError}</Text>}
        <TouchableOpacity
          style={[styles.button, styles.joinButton, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Join</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8", padding: 16 },
  header: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginBottom: 8 },
  subtitle: { color: "#666", fontSize: 15, marginBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  button: {
    backgroundColor: "#FF4F00",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  joinButton: { backgroundColor: "#1a1a1a" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dividerText: { marginHorizontal: 16, color: "#999" },
  activeSession: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 16,
  },
  sessionName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 24,
  },
  inviteLabel: { fontSize: 13, color: "#999", marginBottom: 8 },
  inviteCode: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 8,
    color: "#FF4F00",
    marginBottom: 24,
  },
  shareButton: {
    backgroundColor: "#FF4F00",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginBottom: 16,
  },
  shareButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  hint: { fontSize: 14, color: "#999", textAlign: "center" },
  leaveButton: { position: "absolute", bottom: 40, alignSelf: "center" },
  leaveText: { color: "#ff4444", fontSize: 16 },
  error: {
    color: "#ff4444",
    fontSize: 13,
    marginBottom: 8,
  },
});
