import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthLayout, PrimaryButton } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";
import { fontFamily } from "@/src/theme/typography";

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  return (
    <AuthLayout
      showLogo={false}
      title="Check your email"
      subtitle={`We sent a confirmation link to ${email ?? "your inbox"}. Tap the link to activate your account, then sign in.`}
    >
      <PrimaryButton
        title="Back to Sign In"
        onPress={() => router.replace("/(auth)/login")}
      />
    </AuthLayout>
  );
}
