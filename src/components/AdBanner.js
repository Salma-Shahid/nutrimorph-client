import React from "react";
import { View, StyleSheet } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

let BannerAd, BannerAdSize, TestIds;
try {
  const MobileAds = require("react-native-google-mobile-ads");
  BannerAd = MobileAds.BannerAd;
  BannerAdSize = MobileAds.BannerAdSize;
  TestIds = MobileAds.TestIds;
} catch (e) {
  console.log("AdMob native module not found in this runtime environment.");
}

export default function AdBanner() {
  const { user, theme } = useAuthStore();
  const colors = getThemeColors(theme);
  const isPro = user?.subscriptionTier === "pro" || user?.isPro === true;

  // Agar Pro user hai ya native module runtime mein load nahi hua (Expo Go)
  if (isPro || !BannerAd) {
    return null;
  }

  const adUnitId = __DEV__
    ? TestIds.BANNER
    : "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBg,
          borderTopColor: colors.border,
        },
      ]}
    >
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
    borderTopWidth: 1,
    paddingVertical: 4,
  },
});
