import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";

export default function SubscriptionScreen() {
  const { theme, user, token, setUser, refreshUserProfile } = useAuthStore();
  const colors = getThemeColors(theme || "dark");
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const checkoutPendingRef = useRef(false);
  const verificationInProgressRef = useRef(false);

  const verifyCheckout = useCallback(async () => {
    if (!token || verificationInProgressRef.current) return;

    verificationInProgressRef.current = true;
    try {
      const verification = await axios.post(
        `${BASE_URL}/api/payment/verify-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (verification.data?.user) {
        const verifiedUser = verification.data.user;
        await setUser({
          subscriptionTier: verifiedUser.subscriptionTier,
          isPro: verifiedUser.isPro,
          subscriptionExpiresAt: verifiedUser.subscriptionExpiresAt,
        });
        const refreshed = await refreshUserProfile();
        if (!refreshed.success) {
          throw new Error(
            refreshed.message || "Could not refresh the account profile.",
          );
        }
      }
    } catch (error) {
      console.error("Could not verify subscription after checkout:", error);
      Alert.alert(
        "Subscription Status",
        error?.response?.data?.message ||
          "Could not refresh your subscription status. Please try again.",
      );
    } finally {
      verificationInProgressRef.current = false;
    }
  }, [refreshUserProfile, setUser, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && checkoutPendingRef.current) {
        checkoutPendingRef.current = false;
        verifyCheckout();
      }
    });

    return () => subscription.remove();
  }, [verifyCheckout]);

  const handleSubscribe = async () => {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in before subscribing.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${BASE_URL}/api/payment/create-checkout-session`,
        { plan: "pro", billingCycle },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const checkoutUrl = response.data?.url;
      if (!checkoutUrl) {
        throw new Error(
          response.data?.message || "Could not initiate payment session.",
        );
      }

      checkoutPendingRef.current = true;
      const browserResult = await WebBrowser.openBrowserAsync(checkoutUrl);
      if (
        browserResult.type !== "opened" &&
        checkoutPendingRef.current
      ) {
        checkoutPendingRef.current = false;
        const verification = await axios.post(
          `${BASE_URL}/api/payment/verify-payment`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (verification.data?.user) {
          const verifiedUser = verification.data.user;
          await setUser({
            subscriptionTier: verifiedUser.subscriptionTier,
            isPro: verifiedUser.isPro,
            subscriptionExpiresAt: verifiedUser.subscriptionExpiresAt,
          });
          const refreshed = await refreshUserProfile();
          if (!refreshed.success) {
            throw new Error(
              refreshed.message || "Could not refresh the account profile.",
            );
          }
        }
      }
    } catch (error) {
      checkoutPendingRef.current = false;
      console.error("Stripe Checkout Error:", error);
      Alert.alert(
        "Payment Error",
        error?.response?.data?.message ||
          error.message ||
          "Something went wrong with Stripe checkout.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="ribbon-outline" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>
          Upgrade to NutriMorph Pro
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Unlock AI meal scanning, advanced analytics, and unlimited macro
        tracking.
      </Text>

      {user?.subscriptionTier === "pro" || user?.isPro ? (
        <Text style={[styles.currentPlan, { color: colors.primary }]}>
          Your Pro subscription is active.
        </Text>
      ) : (
        <>
          <View style={styles.planRow}>
            {[
              { id: "monthly", title: "Monthly", price: "$9.99 / month" },
              { id: "yearly", title: "Yearly", price: "$99 / year" },
            ].map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planOption,
                  {
                    backgroundColor:
                      billingCycle === plan.id
                        ? colors.glassGlow
                        : colors.cardBg,
                    borderColor:
                      billingCycle === plan.id
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={() => setBillingCycle(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: billingCycle === plan.id }}
              >
                <Text style={[styles.planTitle, { color: colors.text }]}>
                  {plan.title}
                </Text>
                <Text
                  style={[styles.planPrice, { color: colors.textSecondary }]}
                >
                  {plan.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.proButton, { backgroundColor: colors.primary }]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.proButtonText}>
                Continue to secure checkout
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  currentPlan: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
  planRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  planOption: {
    flex: 1,
    minHeight: 86,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
  },
  planTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 6 },
  planPrice: { fontSize: 13 },
  proButton: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  proButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
