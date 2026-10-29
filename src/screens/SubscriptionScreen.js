import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

// 🛡️ Guard: Check if native RevenueCat module is linked and available
const isRevenueCatAvailable =
  typeof Purchases?.isConfigured === "function" &&
  typeof Purchases?.configure === "function" &&
  typeof Purchases?.getOfferings === "function";

export default function SubscriptionScreen({ navigation }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const { user, updateUserGlobally, theme } = useAuthStore();
  const colors = getThemeColors(theme);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      if (!isRevenueCatAvailable) {
        console.warn(
          "RevenueCat native modules are not available in Expo Go. Skipping offerings load.",
        );
        setLoading(false);
        return;
      }

      const isConfigured = await Purchases.isConfigured();
      if (!isConfigured) {
        const apiKey = __DEV__
          ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY
          : Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
            : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

        if (apiKey) {
          Purchases.configure({ apiKey });
        } else {
          console.warn(
            "RevenueCat API key missing for current environment or platform.",
          );
        }
      }

      if (
        typeof Purchases?.setLogLevel === "function" &&
        Purchases?.LOG_LEVEL?.DEBUG
      ) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }

      const offerings = await Purchases.getOfferings();
      if (
        offerings?.current !== null &&
        offerings?.current?.availablePackages?.length > 0
      ) {
        setPackages(offerings.current.availablePackages);
      } else {
        console.log("No offerings/packages found.");
      }
    } catch (error) {
      console.error("RevenueCat Offerings Error:", error);
      Alert.alert("Notice", "Subscription plans are currently unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageToBuy) => {
    if (!isRevenueCatAvailable) {
      Alert.alert(
        "Expo Go Restriction",
        "In-App Purchases require a Standalone APK / EAS Development Build to test.",
      );
      return;
    }

    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);

      if (customerInfo?.entitlements?.active?.["nutrimorph_pro"]?.isActive) {
        if (updateUserGlobally) {
          await updateUserGlobally({ subscriptionTier: "pro" });
        }

        Alert.alert("Success 🎉", "You are now a Pro member!", [
          {
            text: "OK",
            onPress: () => {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else if (navigation?.navigate) {
                navigation.navigate("MainTabs");
              }
            },
          },
        ]);
      }
    } catch (error) {
      if (!error?.userCancelled) {
        Alert.alert(
          "Purchase Failed",
          error?.message || "Something went wrong",
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!isRevenueCatAvailable) {
      Alert.alert(
        "Expo Go Restriction",
        "Restoring purchases requires a Standalone APK / EAS Development Build.",
      );
      return;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const isProActive =
        customerInfo?.entitlements?.active?.["nutrimorph_pro"]?.isActive;

      if (isProActive) {
        if (updateUserGlobally) {
          await updateUserGlobally({ subscriptionTier: "pro" });
        }
        Alert.alert("Success 🎉", "Your subscription has been restored!", [
          {
            text: "OK",
            onPress: () => {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else if (navigation?.navigate) {
                navigation.navigate("MainTabs");
              }
            },
          },
        ]);
      } else {
        Alert.alert("Notice", "No active subscription found.");
      }
    } catch (error) {
      Alert.alert(
        "Restore Error",
        error?.message || "Could not restore purchases.",
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Icon */}
        <View style={styles.headerContainer}>
          <View
            style={[
              styles.crownBadge,
              {
                backgroundColor: colors.glassGlow,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="sparkles" size={38} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Unlock NutriMorph Pro 🚀
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Get unlimited AI meal scans, personalized diet plans, and priority
            NutriBot coaching.
          </Text>
        </View>

        {/* Feature Highlights */}
        <View
          style={[
            styles.featuresCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Unlimited AI Food & Barcode Scans
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Gemini AI Custom Diet Plan Generator
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Advanced Macro & Diet Breach Recovery
            </Text>
          </View>
        </View>

        {/* Dynamic Offerings List */}
        {packages.length > 0 ? (
          packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[styles.buyButton, { backgroundColor: colors.primary }]}
              disabled={purchasing}
              onPress={() => handlePurchase(pkg)}
              activeOpacity={0.8}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>
                  Upgrade to Pro — {pkg.product?.priceString || "$--"} / mo
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View
            style={[
              styles.noPackageCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.noPackageText, { color: colors.textSecondary }]}
            >
              {!isRevenueCatAvailable
                ? "In-App Subscriptions are disabled in Expo Go mode. Please use an EAS Development Build to test purchases."
                : "No active plans available at the moment. Please check back later."}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  crownBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  featuresCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "600",
  },
  buyButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  noPackageCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  noPackageText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  restoreButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
