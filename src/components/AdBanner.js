import React from "react";
import { View, StyleSheet } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { useAuthStore } from "../store/useAuthStore";

// Testing ke liye TestIds.BANNER use hoga. Play Store release ke waqt yahan apni real Ad Unit ID dal dijiyega.
const adUnitId = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy";

export default function AdBanner() {
  const user = useAuthStore((state) => state.user);
  const isPro = user?.subscriptionTier === "pro" || user?.isPro === true;

  // 👑 Pro users ke liye ads show nahi honge
  if (isPro) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => console.log("✅ AdMob Banner loaded successfully")}
        onAdFailedToLoad={(error) =>
          console.error("❌ AdMob Banner failed to load: ", error)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingVertical: 4,
  },
});
