import { View, ActivityIndicator, StyleSheet } from "react-native";
import { HungrLogo } from "@/src/components/ui/HungrLogo";
import { colors } from "@/src/theme/colors";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <HungrLogo />
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    marginTop: 32,
  },
});
