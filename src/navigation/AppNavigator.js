import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Direct Clean Imports
import DashboardScreen from "../screens/DashboardScreen";
import MealScannerScreen from "../screens/MealScannerScreen";
import ChatBotScreen from "../screens/ChatBotScreen";
import ProfileScreen from "../screens/ProfileScreen";

import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors?.cardBg || "#1E293B",
          borderTopColor: colors?.border || "#334155",
        },
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#64748B",
        tabBarIcon: ({ color, size }) => {
          let iconName = "grid-outline";
          if (route.name === "Dashboard") iconName = "grid-outline";
          else if (route.name === "Scan Meal") iconName = "scan-outline";
          else if (route.name === "NutriBot") iconName = "chatbubbles-outline";
          else if (route.name === "Profile") iconName = "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Scan Meal" component={MealScannerScreen} />
      <Tab.Screen name="NutriBot" component={ChatBotScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
