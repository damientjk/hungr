import { TextStyle } from "react-native";

export const fontFamily = {
  regular: "Nunito_400Regular",
  semiBold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extraBold: "Nunito_800ExtraBold",
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontFamily: fontFamily.extraBold,
    color: "#212121",
  } satisfies TextStyle,
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#424242",
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: "#424242",
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: "#999999",
  } satisfies TextStyle,
  label: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: "#424242",
  } satisfies TextStyle,
} as const;
