import React from "react";
import { useColorScheme } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";

// Screens Import karein
import DashboardScreen from "../screens/DashboardScreen";
import MealScannerScreen from "../screens/MealScannerScreen";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const theme = useColorScheme();
  const isDark = theme === "dark";
  const activeColors = Colors[isDark ? "dark" : "light"];

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: activeColors.tabBackground },
        headerTintColor: activeColors.text,
        tabBarStyle: {
          backgroundColor: activeColors.tabBackground,
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: activeColors.tabIconSelected,
        tabBarInactiveTintColor: activeColors.tabIconDefault,
      }}
    >
      {/* Pehla Tab: Dashboard */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />

      {/* Doosra Tab: Meal Scanner */}
      <Tab.Screen
        name="Scanner"
        component={MealScannerScreen}
        options={{
          title: "Scan Meal",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-circle" color={color} size={32} /> // Scanner icon thoda bada rakha hai
          ),
        }}
      />
    </Tab.Navigator>
  );
}
