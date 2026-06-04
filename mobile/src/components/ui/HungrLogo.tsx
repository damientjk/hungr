import { Text, StyleSheet } from "react-native";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";

interface Props {
  size?: "sm" | "md";
}

export function HungrLogo({ size = "md" }: Props) {
  return (
    <Text style={[styles.logo, size === "sm" && styles.sm]}>
      hungr<Text style={styles.dot}>.</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 26,
    fontFamily: fontFamily.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  sm: {
    fontSize: 22,
  },
  dot: {
    color: colors.brandDot,
  },
});
