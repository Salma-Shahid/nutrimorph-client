import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Direct Clean Imports
import DashboardScreen from "../screens/DashboardScreen";
import MealScannerScreen from "../screens/MealScannerScreen";
import ChatBotScreen from "../screens/ChatBotScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MealPlanScreen from "../screens/MealPlanScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import ExploreScreen from "../screens/ExploreScreen"; // 🟢 Added
import RecipeDetailScreen from "../screens/RecipeDetailScreen"; // 🟢 Added

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
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#64748B",
        tabBarIcon: ({ color, size }) => {
          let iconName = "grid-outline";
          if (route.name === "Dashboard") iconName = "grid-outline";
          else if (route.name === "Meal Plan") iconName = "restaurant-outline";
          else if (route.name === "Scan Meal") iconName = "scan-outline";
          else if (route.name === "Explore")
            iconName = "compass-outline"; // 🟢 Icon for Explore
          else if (route.name === "NutriBot") iconName = "chatbubbles-outline";
          else if (route.name === "Profile") iconName = "person-outline";
          else if (route.name === "Achievements") iconName = "trophy-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Meal Plan"
        component={MealPlanScreen}
        options={{ tabBarLabel: "Meal Plan" }}
      />
      <Tab.Screen name="Scan Meal" component={MealScannerScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="NutriBot" component={ChatBotScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ headerShown: false }}
      />

      {/* 🟢 Detail Screen hidden from Bottom Tab Bar */}
      <Tab.Screen
        name="RecipeDetailScreen"
        component={RecipeDetailScreen}
        options={{
          tabBarButton: () => null, // Bottom bar par icon button hide kar dega
        }}
      />
    </Tab.Navigator>
  );
}
