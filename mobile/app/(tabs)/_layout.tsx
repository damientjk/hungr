import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SessionProvider } from "@/src/lib/SessionContext";
import { colors } from "@/src/theme/colors";

function SwipeTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: focused ? colors.primary : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name="add"
        size={20}
        color={focused ? "#fff" : colors.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <SessionProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 0,
            shadowOpacity: 0,
            height: 64,
            paddingTop: 6,
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.6,
            textTransform: "uppercase",
          },
        }}
      >
        <Tabs.Screen
          name="swipe"
          options={{
            title: "Swipe",
            tabBarIcon: ({ focused }) => <SwipeTabIcon focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="sessions"
          options={{
            title: "Group",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="liked"
          options={{
            title: "Saved",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmark-outline" size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Me",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="discover" options={{ title: "Discover",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass" size={size + 2} color={color} />
            ), }} />
      </Tabs>
    </SessionProvider>
  );
}
