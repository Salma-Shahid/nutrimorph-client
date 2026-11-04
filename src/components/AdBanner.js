import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import Constants from "expo-constants";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";
import { isActiveProUser } from "../utils/subscription";
import { areMobileAdsReady } from "../services/ads";

let BannerAd, BannerAdSize, TestIds;
try {
  const MobileAds = require("react-native-google-mobile-ads");
  BannerAd = MobileAds.BannerAd;
  BannerAdSize = MobileAds.BannerAdSize;
  TestIds = MobileAds.TestIds;
} catch {
  console.log("AdMob native module not found in this runtime environment.");
}

export default function AdBanner() {
  const { user, theme } = useAuthStore();
  const colors = getThemeColors(theme);
  const isPro = isActiveProUser(user);

  // Check if running inside Expo Go or Web where native AdMob modules are unsupported
  const isExpoGo = Constants.appOwnership === "expo";
  if (
    isPro ||
    isExpoGo ||
    Platform.OS === "web" ||
    !BannerAd ||
    !areMobileAdsReady()
  ) {
    return null;
  }

  const adUnitId = TestIds.BANNER;

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
        onAdLoaded={() => console.log("AdMob banner loaded successfully.")}
        onAdFailedToLoad={(error) =>
          console.error("AdMob banner failed to load:", error)
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
