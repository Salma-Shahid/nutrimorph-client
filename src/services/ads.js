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

export const getBannerAdUnitId = () => {
  const { TestIds } = require("react-native-google-mobile-ads");
  return process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TestIds.BANNER;
};

const showInterstitialAfterAction = async (user) => {
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
    const ad = InterstitialAd.createForAdRequest(
      process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || TestIds.INTERSTITIAL,
      {
      requestNonPersonalizedAdsOnly: true,
      },
    );

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

export const showTestInterstitialAfterAction = showInterstitialAfterAction;

// Rewarded ads need the native AdMob module (dev/preview/production builds).
export const canShowRewardedAds = () =>
  adsReady && Platform.OS !== "web" && Constants.appOwnership !== "expo";

// Shows a rewarded ad. Resolves { rewarded: true } only when AdMob reports the
// reward was earned (the user watched to the end); never rejects.
// `userId` is attached for AdMob server-side verification (SSV).
export const showRewardedAd = async ({ userId } = {}) => {
  if (!canShowRewardedAds()) {
    return { rewarded: false, reason: "unavailable" };
  }
  try {
    const { AdEventType, RewardedAd, RewardedAdEventType, TestIds } = require(
      "react-native-google-mobile-ads",
    );
    const ad = RewardedAd.createForAdRequest(
      process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || TestIds.REWARDED,
      {
        requestNonPersonalizedAdsOnly: true,
        ...(userId
          ? { serverSideVerificationOptions: { userId: String(userId) } }
          : {}),
      },
    );

    return await new Promise((resolve) => {
      let completed = false;
      let earned = false;
      const subscriptions = [];
      const finish = (result) => {
        if (completed) return;
        completed = true;
        clearTimeout(loadTimeout);
        subscriptions.forEach((subscription) => subscription.remove());
        resolve(result);
      };
      // Only the load is time-limited; watching the ad is not.
      const loadTimeout = setTimeout(
        () => finish({ rewarded: false, reason: "timeout" }),
        15000,
      );

      subscriptions.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          clearTimeout(loadTimeout);
          ad.show().catch(() => finish({ rewarded: false, reason: "show_failed" }));
        }),
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () =>
          finish(earned ? { rewarded: true } : { rewarded: false, reason: "closed_early" }),
        ),
        ad.addAdEventListener(AdEventType.ERROR, (error) => {
          console.warn("Rewarded ad failed:", error?.message);
          finish({ rewarded: false, reason: "no_fill" });
        }),
      );
      ad.load();
    });
  } catch (error) {
    console.warn("Rewarded ads are unavailable in this build:", error?.message);
    return { rewarded: false, reason: "unavailable" };
  }
};
