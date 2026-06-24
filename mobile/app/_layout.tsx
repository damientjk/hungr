import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { useAuth } from "@/src/hooks/useAuth";
import { LoadingScreen } from "@/src/components/LoadingScreen";
import { supabase } from "@/src/lib/supabase";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const { session, loading, authEvent } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (url.includes("code=") || url.includes("access_token")) {
        supabase.auth.exchangeCodeForSession(url).catch(() => {});
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loading || !fontsLoaded) return;

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
  }, [session, loading, authEvent, segments, fontsLoaded]);

  if (loading || !fontsLoaded) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
