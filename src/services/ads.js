import Constants from "expo-constants";
import { Platform } from "react-native";
import { isActiveProUser } from "../utils/subscription";

let adsReady = false;

export const initializeMobileAds = async () => {
  if (Platform.OS === "web" || Constants.appOwnership === "expo") return false;
  try {
    const { AdsConsent, MobileAds } = require("react-native-google-mobile-ads");
    await AdsConsent.requestInfoUpdate();
    const updatedConsent =
      await AdsConsent.loadAndShowConsentFormIfRequired();
    if (!updatedConsent.canRequestAds) return false;
    await MobileAds().initialize();
    adsReady = true;
    return true;
  } catch (error) {
    console.error("Could not initialize Google Mobile Ads:", error);
    return false;
  }
};

export const areMobileAdsReady = () => adsReady;

export const showTestInterstitialAfterAction = async (user) => {
  if (
    !adsReady ||
    isActiveProUser(user) ||
    Platform.OS === "web" ||
    Constants.appOwnership === "expo"
  ) {
    return false;
  }

  try {
    const { AdEventType, InterstitialAd, TestIds } = require(
      "react-native-google-mobile-ads",
    );
    const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise((resolve) => {
      let completed = false;
      const subscriptions = [];
      const finish = (shown) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);
        subscriptions.forEach((subscription) => subscription.remove());
        resolve(shown);
      };
      const timeout = setTimeout(() => finish(false), 12000);

      subscriptions.push(
        ad.addAdEventListener(AdEventType.LOADED, () => {
          ad.show().catch((error) => {
            console.error("Could not display the test interstitial ad:", error);
            finish(false);
          });
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () => finish(true)),
        ad.addAdEventListener(AdEventType.ERROR, (error) => {
          console.error("Could not load the test interstitial ad:", error);
          finish(false);
        }),
      );
      ad.load();
    });
  } catch (error) {
    console.error("Google Mobile Ads is unavailable in this build:", error);
    return false;
  }
};
