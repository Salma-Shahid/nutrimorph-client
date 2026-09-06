import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Purchases from "react-native-purchases";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

// 🔑 Aap ki RevenueCat Public API Key (Dashboard se copy ki hui key yahan paste karein)
const REVENUECAT_PUBLIC_KEY = "goog_zLgYlrhoVSdXjBjFCPoTlcQUOPz";

// 📍 Centralized API base URL (MongoDB Sync ke liye)
const API_URL = "http://192.168.18.113:5000/api/payment";

const SubscriptionScreen = ({ navigation }) => {
  const { user, token, theme, setUser } = useAuthStore();
  const colors = getThemeColors(theme);

  const currentTier = user?.subscriptionTier || "free";
  const [selectedPlan, setSelectedPlan] = useState(
    currentTier === "pro" ? "pro_monthly" : "free",
  );
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState(null);

  // 1️⃣ Initialize RevenueCat & Fetch Available Offerings
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        await Purchases.configure({ apiKey: REVENUECAT_PUBLIC_KEY });

        // User ko RevenueCat mein identify karein (MongoDB _id se)
        if (user?._id) {
          await Purchases.logIn(user._id);
        }

        // Dashboard se current package/offering fetch karein
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null) {
          setOffering(offerings.current);
        }
      } catch (e) {
        console.error("RevenueCat Init Error:", e);
      }
    };

    initRevenueCat();
  }, [user]);

  // 🔄 Auto-Verify Payment Status when screen is focused
  useFocusEffect(
    useCallback(() => {
      verifyPaymentStatus();
    }, []),
  );

  const verifyPaymentStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/verify-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data?.success && data?.user) {
        if (setUser) setUser(data.user);
      }
    } catch (err) {
      console.error("Verification error:", err);
    }
  };

  // 💳 Upgrade to Pro (RevenueCat Google Play Billing)
  const handleUpgradeToPro = async () => {
    setLoading(true);
    try {
      if (
        !offering ||
        !offering.availablePackages ||
        offering.availablePackages.length === 0
      ) {
        Alert.alert(
          "Error",
          "Subscription plans load nahi ho sake. Koshish karein ke internet active ho.",
        );
        setLoading(false);
        return;
      }

      // Pro package purchase trigger karein (Native Google Play Sheet kholega)
      const packageToPurchase = offering.availablePackages[0];
      const { customerInfo } =
        await Purchases.purchasePackage(packageToPurchase);

      // Check karein ke "NutriMorph Pro" entitlement active hui ya nahi
      if (
        typeof customerInfo.entitlements.active["NutriMorph Pro"] !==
        "undefined"
      ) {
        Alert.alert(
          "Success! 🎉",
          "Aap Pro Plan par successfully upgrade ho chuke hain!",
        );

        // Backend DB sync karein
        await verifyPaymentStatus();
      }
    } catch (error) {
      // Jab user khud purchase modal close/cancel kar de
      if (!error.userCancelled) {
        Alert.alert(
          "Payment Error",
          error.message || "Purchase process mein masla aaya.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Downgrade to Free Plan (No Charge)
  const handleSwitchToFree = async () => {
    Alert.alert(
      "Switch to Free Plan",
      "Kya aap Free Plan par wapis switch karna chahte hain? Aap ke Pro features lock ho jayenge.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch to Free",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(`${API_URL}/switch-to-free`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              const data = await response.json();
              if (data?.success && data?.user) {
                if (setUser) setUser(data.user);
                Alert.alert(
                  "Plan Changed",
                  "Aap ab Free Plan par switch ho chuke hain.",
                );
              } else {
                Alert.alert("Error", data?.message || "Failed to switch plan.");
              }
            } catch (error) {
              Alert.alert("Error", "Could not connect to server.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // 🔘 Action Handler based on user selection
  const handleAction = () => {
    if (
      selectedPlan === currentTier ||
      (selectedPlan === "pro_monthly" && currentTier === "pro")
    ) {
      return;
    }

    if (selectedPlan === "free" && currentTier === "pro") {
      // Pro -> Free
      handleSwitchToFree();
    } else if (selectedPlan === "pro_monthly" && currentTier === "free") {
      // Free -> Pro (RevenueCat)
      handleUpgradeToPro();
    }
  };

  const isCurrentSelectionActive =
    (selectedPlan === "free" && currentTier === "free") ||
    (selectedPlan === "pro_monthly" && currentTier === "pro");

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Choose Your Plan 🚀
        </Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>
          Manage your subscription or upgrade to premium features.
        </Text>

        {/* 1️⃣ FREE PLAN CARD */}
        <TouchableOpacity
          style={[
            styles.planCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
            selectedPlan === "free" && styles.activeBorder,
          ]}
          onPress={() => setSelectedPlan("free")}
        >
          {currentTier === "free" && (
            <View style={styles.currentBadge}>
              <Text style={styles.badgeText}>CURRENT PLAN</Text>
            </View>
          )}
          <Text style={[styles.planName, { color: colors.text }]}>
            Free Starter
          </Text>
          <Text style={styles.planPrice}>$0 / month</Text>
          <Text style={[styles.featureText, { color: colors.subText }]}>
            • Basic Meal Tracking
          </Text>
          <Text style={[styles.featureText, { color: colors.subText }]}>
            • 5 AI Chatbot messages/day
          </Text>
        </TouchableOpacity>

        {/* 2️⃣ PRO PLAN CARD */}
        <TouchableOpacity
          style={[
            styles.planCard,
            styles.recommendedCard,
            selectedPlan === "pro_monthly" && styles.activeBorder,
          ]}
          onPress={() => setSelectedPlan("pro_monthly")}
        >
          {currentTier === "pro" ? (
            <View style={styles.activeProBadge}>
              <Text style={styles.badgeText}>CURRENT ACTIVE PLAN ✨</Text>
            </View>
          ) : (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>POPULAR</Text>
            </View>
          )}

          <Text style={styles.proTitle}>Pro Nutritionist</Text>
          <Text style={styles.proPrice}>$9.99 / month</Text>
          <Text style={styles.proFeature}>
            • Unlimited Multilingual AI Chatbot
          </Text>
          <Text style={styles.proFeature}>• Instant Camera Meal Scanner</Text>
          <Text style={styles.proFeature}>
            • Voice AI Talking Bot (Upcoming)
          </Text>
          <Text style={styles.proFeature}>• Full Macro & Calorie History</Text>
        </TouchableOpacity>

        {/* 3️⃣ DYNAMIC ACTION BUTTON */}
        <TouchableOpacity
          style={[
            styles.subscribeBtn,
            isCurrentSelectionActive && styles.disabledBtn,
            loading && styles.disabledBtn,
          ]}
          onPress={handleAction}
          disabled={isCurrentSelectionActive || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.subscribeText}>
              {isCurrentSelectionActive
                ? "Current Active Plan"
                : selectedPlan === "free"
                  ? "Switch to Free Plan (No Charge)"
                  : "Upgrade to Pro - $9.99/mo"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    marginTop: 6,
  },
  planCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  recommendedCard: {
    backgroundColor: "#1E1B4B",
    borderColor: "#6366F1",
    borderWidth: 2,
  },
  activeBorder: { borderColor: "#10B981", borderWidth: 3 },
  badge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  currentBadge: {
    backgroundColor: "#6B7280",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  activeProBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  planName: { fontSize: 18, fontWeight: "bold" },
  planPrice: {
    fontSize: 22,
    color: "#10B981",
    fontWeight: "bold",
    marginVertical: 6,
  },
  proTitle: { fontSize: 20, color: "#FFF", fontWeight: "bold" },
  proPrice: {
    fontSize: 24,
    color: "#38BDF8",
    fontWeight: "bold",
    marginVertical: 6,
  },
  featureText: { fontSize: 13, marginTop: 4 },
  proFeature: { fontSize: 13, color: "#E0E7FF", marginTop: 4 },
  subscribeBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  disabledBtn: { opacity: 0.5 },
  subscribeText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

export default SubscriptionScreen;
