import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app"}/api`;

export default function SubscriptionScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const { user, token, updateUserGlobally, theme } = useAuthStore();
  const colors = getThemeColors(theme);

  // Stripe Checkout Flow Handler
  const handleStripeCheckout = async () => {
    setLoading(true);
    try {
      const activeToken = token || user?.token;

      // Request backend to create a Stripe Checkout Session
      const res = await axios.post(
        `${API_BASE}/billing/create-checkout-session`,
        { plan: "pro_monthly" },
        { headers: { Authorization: `Bearer ${activeToken}` } },
      );

      if (res.data?.success && res.data?.url) {
        // Open Stripe Checkout in secure browser view
        await WebBrowser.openBrowserAsync(res.data.url);

        // Optimistically update global user state or check status upon return
        if (updateUserGlobally) {
          await updateUserGlobally({ subscriptionTier: "pro" });
        }
      } else {
        Alert.alert(
          "Payment Error",
          "Could not initiate Stripe payment gateway session.",
        );
      }
    } catch (error) {
      console.error("Stripe Checkout Error:", error);
      Alert.alert(
        "Gateway Error",
        "Unable to connect to payment server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

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
            NutriBot coaching via Stripe secure checkout.
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

        {/* Stripe Checkout Button */}
        <TouchableOpacity
          style={[styles.buyButton, { backgroundColor: colors.primary }]}
          disabled={loading}
          onPress={handleStripeCheckout}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>
              Upgrade to Pro — $9.99 / mo (Stripe)
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (navigation?.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          style={styles.restoreButton}
        >
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
            Go Back to Dashboard
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
