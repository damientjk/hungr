import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🍔</Text>
      <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF4F00",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 64,
    marginBottom: 32,
  },
  spinner: {
    opacity: 0.8,
  },
});
