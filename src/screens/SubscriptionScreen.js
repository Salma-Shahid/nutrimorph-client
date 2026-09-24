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
import Purchases from "react-native-purchases";
import { useAuthStore } from "../store/useAuthStore";

// 🛡️ Guard: Check if native RevenueCat module is linked and available
const isRevenueCatAvailable =
  typeof Purchases?.isConfigured === "function" &&
  typeof Purchases?.configure === "function" &&
  typeof Purchases?.getOfferings === "function";

export default function SubscriptionScreen({ navigation }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const { user, updateUserGlobally } = useAuthStore();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      // Bypass gracefully if running in standard Expo Go or unsupported environment
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

      // Safe check for Log Level to avoid synchronous TypeError
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Unlock NutriMorph Pro 🚀</Text>
      <Text style={styles.subtitle}>
        Get unlimited AI meal scans, personalized diet plans, and priority
        NutriBot access.
      </Text>

      {packages.length > 0 ? (
        packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            style={styles.buyButton}
            disabled={purchasing}
            onPress={() => handlePurchase(pkg)}
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
        <View style={styles.noPackageCard}>
          <Text style={styles.noPackageText}>
            {!isRevenueCatAvailable
              ? "In-App Subscriptions are disabled in Expo Go mode. Please use EAS Development Build to test purchases."
              : "No active plans available at the moment. Please check back later."}
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  buyButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  noPackageCard: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  noPackageText: {
    color: "#94A3B8",
    textAlign: "center",
  },
  restoreButton: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 10,
  },
  restoreText: {
    color: "#94A3B8",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
