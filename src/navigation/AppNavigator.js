import React from "react";
import { Text, useWindowDimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Direct Clean Imports
import DashboardScreen from "../screens/DashboardScreen";
import MealScannerScreen from "../screens/MealScannerScreen";
import ChatBotScreen from "../screens/ChatBotScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MealPlanScreen from "../screens/MealPlanScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import ExploreScreen from "../screens/ExploreScreen";
import RecipeDetailScreen from "../screens/RecipeDetailScreen";

import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const Tab = createBottomTabNavigator();

// Route names stay unchanged (other screens navigate by them); only the
// visible labels are shortened so seven tabs fit a 375px-wide screen
// without "Dashbo…" / "Meal Pl…" truncation.
const TABS = {
  Dashboard: { label: "Home", icon: "grid", component: DashboardScreen },
  "Meal Plan": { label: "Plan", icon: "restaurant", component: MealPlanScreen },
  "Scan Meal": { label: "Scan", icon: "scan", component: MealScannerScreen },
  Explore: { label: "Explore", icon: "compass", component: ExploreScreen },
  NutriBot: { label: "NutriBot", icon: "chatbubbles", component: ChatBotScreen },
  Profile: { label: "Profile", icon: "person", component: ProfileScreen },
  Achievements: { label: "Awards", icon: "trophy", component: AchievementsScreen },
};

export default function AppNavigator() {
  const theme = useAuthStore((state) => state.theme);
  const userId = useAuthStore(
    (state) => state.user?._id || state.user?.id || "signed-out",
  );
  const colors = getThemeColors(theme);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 400;
  const tabCount = Object.keys(TABS).length;
  // Each item gets an equal share; labels never need more than this width.
  const itemWidth = Math.floor(width / tabCount);
  const labelSize = compact ? (itemWidth < 52 ? 9 : 10) : 11;

  return (
    <Tab.Navigator
      key={userId}
      screenOptions={({ route }) => {
        const tab = TABS[route.name];
        return {
          headerShown: false,
          tabBarAllowFontScaling: false,
          // Always stack icon over label; "beside-icon" on wide/web layouts
          // is what made items cluster to the left.
          tabBarLabelPosition: "below-icon",
          tabBarStyle: {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 62 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 4),
            paddingTop: 4,
            paddingHorizontal: 0,
          },
          tabBarItemStyle: {
            flex: 1,
            minWidth: 0,
            paddingHorizontal: 0,
            marginHorizontal: 0,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarIconStyle: { marginBottom: 0, height: 24 },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={`${tab?.icon || "ellipse"}${focused ? "" : "-outline"}`}
              size={compact ? 21 : 23}
              color={color}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              style={{
                color,
                fontSize: labelSize,
                // Explicit line height: without it the label box collapses
                // (clipped text) under the icon on web/Android.
                lineHeight: labelSize + 4,
                minHeight: labelSize + 4,
                includeFontPadding: false,
                fontWeight: focused ? "700" : "500",
                textAlign: "center",
                maxWidth: itemWidth - 2,
                marginTop: 1,
              }}
            >
              {tab?.label || route.name}
            </Text>
          ),
          tabBarAccessibilityLabel: tab?.label || route.name,
        };
      }}
    >
      {Object.entries(TABS).map(([name, tab]) => (
        <Tab.Screen key={name} name={name} component={tab.component} />
      ))}

      {/* Detail screen: routable, but removed from the tab bar layout so it
          doesn't take an invisible slot and skew spacing. */}
      <Tab.Screen
        name="RecipeDetailScreen"
        component={RecipeDetailScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tab.Navigator>
  );
}
