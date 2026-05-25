import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SessionProvider } from "@/src/lib/SessionContext";

export default function TabLayout() {
  return (
    <SessionProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF4F00",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Group",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="liked"
        options={{
          title: "Bookmarks",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{ href: null }}
      />
    </Tabs>
    </SessionProvider>
  );
}
