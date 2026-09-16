import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import Purchases from "react-native-purchases";
import { useAuthStore } from "../store/useAuthStore";

export default function SubscriptionScreen({ navigation }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // 🟢 Zustand store se user state sync karne ke liye
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const isConfigured = await Purchases.isConfigured();
      if (!isConfigured) {
        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
        if (apiKey) {
          Purchases.configure({ apiKey });
        }
      }

      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

      const offerings = await Purchases.getOfferings();
      if (
        offerings.current !== null &&
        offerings.current.availablePackages.length !== 0
      ) {
        setPackages(offerings.current.availablePackages);
      } else {
        console.log("No offerings/packages found.");
      }
    } catch (error) {
      console.error("RevenueCat Offerings Error:", error);
      Alert.alert("Error", "Subscription plans are not available.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageToBuy) => {
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);

      if (customerInfo.entitlements.active["nutrimorph_pro"]?.isActive) {
        // 🟢 Purchase success par local store sync karein
        if (setUser) {
          setUser({ ...user, subscriptionTier: "pro" });
        }

        Alert.alert("Success 🎉", "You are now a Pro member!", [
          {
            text: "OK",
            onPress: () => navigation.navigate("HomeScreen"),
          },
        ]);
      }
    } catch (error) {
      if (!error.userCancelled) {
        Alert.alert("Purchase Failed", error.message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isProActive =
        customerInfo.entitlements.active["nutrimorph_pro"]?.isActive;

      if (isProActive) {
        // 🟢 Restore par bhi local store sync karein
        if (setUser) {
          setUser({ ...user, subscriptionTier: "pro" });
        }
        Alert.alert("Success 🎉", "Your subscription has been restored!");
      } else {
        Alert.alert("Notice", "No active subscription found.");
      }
    } catch (error) {
      Alert.alert("Restore Error", error.message);
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
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Plan 🚀</Text>

      {packages.map((pkg) => (
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
              Upgrade to Pro — {pkg.product.priceString} / mo
            </Text>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#0B0F17",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0F17",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 30,
  },
  buyButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  restoreButton: { marginTop: 20, alignItems: "center" },
  restoreText: { color: "#9CA3AF", fontSize: 14 },
});
