import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, View, ActivityIndicator } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Purchases from "react-native-purchases";
import { useAuthStore } from "./src/store/useAuthStore";

import AppNavigator from "./src/navigation/AppNavigator";
import LogFoodScreen from "./src/screens/LogFoodScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, theme, loadStorage } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const isDark = theme === "dark";

  useEffect(() => {
    const initApp = async () => {
      try {
        if (typeof loadStorage === "function") {
          await loadStorage();
        }

        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
        if (apiKey) {
          const isConfigured = await Purchases.isConfigured();
          if (!isConfigured) {
            Purchases.configure({ apiKey });
          }
        }
      } catch (err) {
        console.error("Boot Load Error:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initApp();
  }, []);

  if (isInitializing) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
        ]}
      >
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaProvider
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#0F172A" : "#F8FAFC"}
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
                {/* Main Flow with Bottom Tabs */}
                <Stack.Screen name="MainTabs" component={AppNavigator} />
                <Stack.Screen name="LogFoodScreen" component={LogFoodScreen} />
                <Stack.Screen
                  name="SubscriptionScreen"
                  component={SubscriptionScreen}
                />
              </>
            )
          ) : (
            <>
              {/* 🟢 Screen Name Aliases ("Login"/"LoginScreen" & "Signup"/"SignupScreen") */}
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
