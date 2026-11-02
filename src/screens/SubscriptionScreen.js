import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function SubscriptionScreen({ navigation }) {
  const { theme, user, token } = useAuthStore();
  const colors = getThemeColors(theme || "dark");
  const [loading, setLoading] = useState(false);

  const handleSubscribePro = async () => {
    try {
      setLoading(true);

      // Backend API call jo Stripe Checkout Session create kare gi
      const response = await axios.post(
        "https://your-backend-api.com/api/payment/create-checkout-session",
        { userId: user?._id || user?.id, email: user?.email },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const checkoutUrl = response.data?.url;

      if (checkoutUrl) {
        setLoading(false);
        // Expo Web Browser mein Stripe Checkout page open karein
        const result = await WebBrowser.openBrowserAsync(checkoutUrl);

        // Jab user browser band karke wapas aaye toh subscription status verify karein
        if (result.type === "dismiss") {
          console.log("User returned from Stripe checkout.");
          // Yahan aap user profile ko refresh kar sakti hain taake Pro plan status update ho jaye
        }
      } else {
        setLoading(false);
        Alert.alert("Error", "Could not initiate payment session.");
      }
    } catch (error) {
      setLoading(false);
      console.log("Stripe Checkout Error:", error);
      Alert.alert(
        "Payment Error",
        error?.response?.data?.message ||
          "Something went wrong with Stripe checkout.",
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.primary }]}>
        Upgrade to NutriMorph Pro 👑
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Unlock AI meal scanning, advanced analytics, and unlimited macro
        tracking.
      </Text>

      <TouchableOpacity
        style={[styles.proButton, { backgroundColor: colors.primary }]}
        onPress={handleSubscribePro}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.proButtonText}>Upgrade Now ($9.99/mo)</Text>
        )}
      </TouchableOpacity>
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
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 30 },
  proButton: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  proButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
