import { Platform } from "react-native";

// RevenueCat is the primary subscription provider in the mobile app.
//
// The SDK is identified with the NutriMorph user ID (never anonymous) so a
// purchase is always attached to the signed-in account, and is logged out on
// sign-out so entitlements never leak between accounts on a shared device.
// Pro access itself is granted only after the backend verifies the
// entitlement with RevenueCat's REST API (/api/payment/revenuecat/sync).

let Purchases = null;
try {
  // Lazy so web builds and binaries without the native module still run.
  Purchases = Platform.OS === "web" ? null : require("react-native-purchases").default;
} catch {
  Purchases = null;
}

const API_KEY =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
export const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "pro";

let configuredUserId = null;
let configurePromise = null;

export const isRevenueCatAvailable = () => Boolean(Purchases && API_KEY);

export const getUnavailableReason = () => {
  if (Platform.OS === "web") {
    return "In-app subscriptions are available in the NutriMorph Android and iOS apps.";
  }
  if (!Purchases) {
    return "This app build does not include in-app purchases yet. Update to the latest version.";
  }
  if (!API_KEY) {
    return "In-app subscriptions are not configured for this build yet.";
  }
  return null;
};

// Configure once, then switch identity with logIn when the account changes.
export const identifyRevenueCatUser = async (userId) => {
  if (!isRevenueCatAvailable() || !userId) return false;
  const appUserID = String(userId);
  try {
    if (!configurePromise) {
      configurePromise = (async () => {
        if (__DEV__ && Purchases.LOG_LEVEL) {
          await Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN).catch(() => {});
        }
        Purchases.configure({ apiKey: API_KEY, appUserID });
        configuredUserId = appUserID;
      })();
    }
    await configurePromise;
    if (configuredUserId !== appUserID) {
      await Purchases.logIn(appUserID);
      configuredUserId = appUserID;
    }
    return true;
  } catch (error) {
    console.warn("RevenueCat identify failed:", error?.message);
    return false;
  }
};

export const resetRevenueCatUser = async () => {
  if (!isRevenueCatAvailable() || !configurePromise || !configuredUserId) return;
  try {
    await configurePromise;
    await Purchases.logOut();
  } catch {
    // logOut throws for anonymous users; nothing to clear in that case.
  } finally {
    configuredUserId = null;
  }
};

export const hasProEntitlement = (customerInfo) =>
  Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);

// Returns the current offering's packages, sorted monthly → annual.
export const getCurrentPackages = async () => {
  const offerings = await Purchases.getOfferings();
  const current = offerings?.current;
  const order = ["MONTHLY", "SIX_MONTH", "THREE_MONTH", "TWO_MONTH", "ANNUAL", "LIFETIME"];
  const packages = [...(current?.availablePackages || [])].sort(
    (a, b) => order.indexOf(a.packageType) - order.indexOf(b.packageType),
  );
  return { offeringId: current?.identifier || null, packages };
};

const isCancelled = (error) =>
  error?.userCancelled === true ||
  error?.code === Purchases?.PURCHASES_ERROR_CODE?.PURCHASE_CANCELLED_ERROR;

export const purchaseRevenueCatPackage = async (aPackage) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(aPackage);
    return { success: true, customerInfo, active: hasProEntitlement(customerInfo) };
  } catch (error) {
    if (isCancelled(error)) return { success: false, cancelled: true };
    return {
      success: false,
      message: error?.message || "The purchase could not be completed.",
    };
  }
};

export const restoreRevenueCatPurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo, active: hasProEntitlement(customerInfo) };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Purchases could not be restored.",
    };
  }
};

export const addRevenueCatListener = (listener) => {
  if (!isRevenueCatAvailable() || !configurePromise) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
};

// Human-readable price/period for a package, e.g. "Rs 900 / month".
export const describePackage = (aPackage) => {
  const product = aPackage?.product || {};
  const period = {
    MONTHLY: "month",
    ANNUAL: "year",
    SIX_MONTH: "6 months",
    THREE_MONTH: "3 months",
    TWO_MONTH: "2 months",
    WEEKLY: "week",
    LIFETIME: "one-time",
  }[aPackage?.packageType];
  return {
    title:
      {
        MONTHLY: "Monthly",
        ANNUAL: "Yearly",
        LIFETIME: "Lifetime",
        WEEKLY: "Weekly",
        SIX_MONTH: "6 months",
        THREE_MONTH: "3 months",
      }[aPackage?.packageType] || product.title || "Pro",
    price: product.priceString || "",
    period: period && period !== "one-time" ? `/ ${period}` : period || "",
    hasTrial: Boolean(product.introPrice && Number(product.introPrice.price) === 0),
  };
};
