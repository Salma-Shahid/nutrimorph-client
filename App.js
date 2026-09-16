import React, { useEffect } from "react";
import { StatusBar, StyleSheet } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Purchases from "react-native-purchases";
import { useAuthStore } from "./src/store/useAuthStore";

import LogFoodScreen from "./src/screens/LogFoodScreen";
import MealScannerScreen from "./src/screens/MealScannerScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import HomeScreen from "./src/screens/HomeScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ChatBotScreen from "./src/screens/ChatBotScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, theme, loadStorage } = useAuthStore();
  const isDark = theme === "dark";

  useEffect(() => {
    const initApp = async () => {
      try {
        if (typeof loadStorage === "function") {
          await loadStorage();
        }

        // App level par ek dafa initialize check
        const isConfigured = await Purchases.isConfigured();
        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;

        if (!isConfigured && apiKey) {
          Purchases.configure({ apiKey });
        }
      } catch (err) {
        console.error("Boot Load Error:", err);
      }
    };
    initApp();
  }, []);

  return (
    <SafeAreaProvider
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#f8fafc" },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#121212" : "#f8fafc"}
      />

      <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            !user.isOnboarded ? (
              <Stack.Screen
                name="OnboardingScreen"
                component={OnboardingScreen}
              />
            ) : (
              <>
                <Stack.Screen name="HomeScreen" component={HomeScreen} />
                <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
                <Stack.Screen name="LogFoodScreen" component={LogFoodScreen} />
                <Stack.Screen
                  name="MealScannerScreen"
                  component={MealScannerScreen}
                />
                <Stack.Screen
                  name="ChatBotScreen"
                  component={ChatBotScreen}
                  options={{ title: "NutriBot Assistant" }}
                />
                <Stack.Screen
                  name="SubscriptionScreen"
                  component={SubscriptionScreen}
                  options={{ title: "Upgrade to Pro" }}
                />
              </>
            )
          ) : (
            <>
              <Stack.Screen name="LoginScreen" component={LoginScreen} />
              <Stack.Screen name="SignupScreen" component={SignupScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
