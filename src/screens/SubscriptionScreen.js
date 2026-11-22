import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";
import { isActiveProUser } from "../utils/subscription";
import PaddleCheckoutModal from "../components/PaddleCheckoutModal";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";

export default function SubscriptionScreen() {
  const { theme, user, token, setUser, refreshUserProfile } = useAuthStore();
  const colors = getThemeColors(theme || "dark");
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const verifyCheckout = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        const verification = await axios.post(
          `${BASE_URL}/api/payment/verify-payment`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const verifiedUser = verification.data?.user;
        if (verifiedUser) {
          await setUser({
            subscriptionTier: verifiedUser.subscriptionTier,
            isPro: verifiedUser.isPro,
            subscriptionExpiresAt: verifiedUser.subscriptionExpiresAt,
            subscriptionStatus: verifiedUser.subscriptionStatus,
          });
          if (verifiedUser.isPro) {
            const refreshed = await refreshUserProfile();
            if (!refreshed.success) {
              throw new Error(
                refreshed.message || "Could not refresh the account profile.",
              );
            }
            Alert.alert("NutriMorph Pro", "Your Pro subscription is active.");
            return;
          }
        }
      }
      Alert.alert(
        "Payment processing",
        "Paddle confirmed checkout, but the verified webhook has not reached us yet. Pro access will update after the payment event is processed.",
      );
    } catch (error) {
      console.error("Could not refresh subscription after Paddle checkout:", error);
      Alert.alert(
        "Subscription Status",
        error?.response?.data?.message ||
          error.message ||
          "Could not refresh your subscription status. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [refreshUserProfile, setUser, token]);

  const isPro = isActiveProUser(user);
  const configuredPriceId =
    billingCycle === "yearly"
      ? process.env.EXPO_PUBLIC_PADDLE_YEARLY_PRICE_ID
      : process.env.EXPO_PUBLIC_PADDLE_MONTHLY_PRICE_ID;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.heading}>
        <Ionicons name="ribbon-outline" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>
          Upgrade to NutriMorph Pro
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Unlock AI meal scanning, advanced analytics, and unlimited macro
        tracking.
      </Text>
      {isPro ? (
        <Text style={[styles.currentPlan, { color: colors.primary }]}>
          Your Pro subscription is active.
        </Text>
      ) : (
        <>
          <View style={styles.planRow}>
            {[
              { id: "monthly", title: "Monthly" },
              { id: "yearly", title: "Yearly" },
            ].map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planOption,
                  {
                    backgroundColor:
                      billingCycle === plan.id ? colors.glassGlow : colors.cardBg,
                    borderColor:
                      billingCycle === plan.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setBillingCycle(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: billingCycle === plan.id }}
              >
                <Text style={[styles.planTitle, { color: colors.text }]}>
                  {plan.title}
                </Text>
                <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                  Secure Paddle billing
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.proButton,
              { backgroundColor: colors.primary, opacity: configuredPriceId ? 1 : 0.6 },
            ]}
            onPress={() => setCheckoutVisible(true)}
            disabled={loading || !configuredPriceId}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.proButtonText}>
                Continue to secure checkout
              </Text>
            )}
          </TouchableOpacity>
          {!configuredPriceId && (
            <Text style={[styles.configNotice, { color: colors.textSecondary }]}>
              This billing option is not configured yet.
            </Text>
          )}
        </>
      )}
      <PaddleCheckoutModal
        visible={checkoutVisible}
        token={token}
        billingCycle={billingCycle}
        theme={theme}
        onClose={() => setCheckoutVisible(false)}
        onComplete={() => {
          setCheckoutVisible(false);
          verifyCheckout();
        }}
      />
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
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  currentPlan: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
  planRow: { width: "100%", flexDirection: "row", gap: 12, marginBottom: 20 },
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
  configNotice: { fontSize: 12, marginTop: 10, textAlign: "center" },
});
