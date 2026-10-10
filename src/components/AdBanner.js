import React from "react";
import { View, StyleSheet } from "react-native";
// import {
//   BannerAd,
//   BannerAdSize,
//   TestIds,
// } from "react-native-google-mobile-ads";
// import { useAuthStore } from "../store/useAuthStore";

// // Testing ke liye TestIds.ANCHORED_ADAPTIVE_BANNER use hoga
// // Jab app Play Store par deni ho, tab yahan apni real Ad Unit ID daal dhiyega
// const adUnitId = __DEV__
//   ? TestIds.ANCHORED_ADAPTIVE_BANNER
//   : "ca-app-pub-xxxxxxxxxxxx/yyyyyyyyyy";

export default function AdBanner() {
  // const { user } = useAuthStore();
  // const isPro = user?.subscriptionTier === "pro" || user?.isPro === true;

  // // Pro users ke liye ads show nahi honge
  // if (isPro) {
  //   return null;
  // }

  return null; // Expo Go par testing ke liye filhal empty return kar raha hai
}

// const styles = StyleSheet.create({
//   container: {
//     width: "100%",
//     alignItems: "center",
//     backgroundColor: "#1E293B",
//     borderTopWidth: 1,
//     borderTopColor: "#334155",
//     paddingVertical: 4,
//   },
// });
