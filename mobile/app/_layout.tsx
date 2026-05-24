import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuth } from "@/src/hooks/useAuth";
import { LoadingScreen } from "@/src/components/LoadingScreen";

export default function RootLayout() {
  const { session, loading, authEvent } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Supabase emits PASSWORD_RECOVERY when the user taps the reset link
    if (authEvent === "PASSWORD_RECOVERY") {
      router.replace("/(auth)/reset-password");
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/swipe");
    }
  }, [session, loading, authEvent, segments]);

  if (loading) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
