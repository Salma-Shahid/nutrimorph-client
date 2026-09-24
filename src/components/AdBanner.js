import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { useAuthStore } from "../store/useAuthStore";

/**
 * AdBanner Component
 * Shows AdMob Test Banner for Free Tier Users
 * Auto-hides for Pro Users
 */
export default function AdBanner() {
  const { user } = useAuthStore();
  const isPro = user?.subscriptionTier === "pro" || user?.isPro === true;

  // Do not render ads for Pro tier users
  if (isPro) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.adLabel}>AdMob Banner Placeholder (Free Tier)</Text>
      {/* 
        Production Release Integration:
        import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
        <BannerAd
          unitId={TestIds.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 50,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  adLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
});
