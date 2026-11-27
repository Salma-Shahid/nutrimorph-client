import { NativeModules, Platform } from "react-native";

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

// Expo Go has no native store. The SDK then runs in "browser mode", which
// only accepts a RevenueCat Test Store key (test_...); store keys (goog_/appl_)
// make configure() throw. Same detection the SDK itself uses.
export const isExpoGo = () =>
  !NativeModules?.RNPurchases && Boolean(globalThis.expo?.modules?.ExpoGo);

const STORE_API_KEY =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
// Optional, development only: RevenueCat > API keys > Test Store key.
const TEST_STORE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY;
const API_KEY = isExpoGo()
  ? TEST_STORE_API_KEY?.startsWith("test_")
    ? TEST_STORE_API_KEY
    : null
  : STORE_API_KEY;
export const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "pro";

const SDK_TIMEOUT_MS = 15000;
const withTimeout = (promise, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), SDK_TIMEOUT_MS),
    ),
  ]);

let configuredUserId = null;
let configurePromise = null;
let lastError = null;

// Turns RevenueCat SDK errors into actionable, user-facing sentences.
const friendlyError = (error, fallback) => {
  const codes = Purchases?.PURCHASES_ERROR_CODE || {};
  switch (error?.code) {
    case codes.CONFIGURATION_ERROR:
      return __DEV__
        ? "RevenueCat couldn't fetch store products. Check the products/offering in RevenueCat, and install from a Play testing track (sideloaded builds can't reach Play billing)."
        : "Plans aren't available on this device yet. Make sure the app was installed from Google Play, then try again.";
    case codes.NETWORK_ERROR:
      return "No connection to the store. Check your internet and try again.";
    case codes.STORE_PROBLEM_ERROR:
      return "The store is having a problem right now. Please try again in a moment.";
    case codes.PURCHASE_NOT_ALLOWED_ERROR:
      return "Purchases aren't allowed on this device or account.";
    case codes.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return "This plan isn't available for your account or region.";
    case codes.PRODUCT_ALREADY_PURCHASED_ERROR:
      return "You already own this subscription. Tap \"Restore purchases\" to activate it.";
    case codes.PAYMENT_PENDING_ERROR:
      return "Your payment is pending. Pro will activate as soon as the store confirms it.";
    default:
      return error?.message || fallback;
  }
};

export const isRevenueCatAvailable = () => Boolean(Purchases && API_KEY);

// Last setup/offerings error, as a user-facing sentence (or null).
export const getRevenueCatError = () => lastError;

export const getUnavailableReason = () => {
  if (Platform.OS === "web") {
    return "In-app subscriptions are available in the NutriMorph Android and iOS apps.";
  }
  if (!Purchases) {
    return "This app build does not include in-app purchases yet. Update to the latest version.";
  }
  if (isExpoGo() && !API_KEY) {
    return "Expo Go can't open Google Play or App Store billing. Use a development build, or set EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY (test_...) to try purchases with RevenueCat's Test Store.";
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
      await withTimeout(Purchases.logIn(appUserID), "RevenueCat sign-in timed out.");
      configuredUserId = appUserID;
    }
    lastError = null;
    return true;
  } catch (error) {
    // Don't cache a failed setup: the next attempt (e.g. Retry) starts fresh.
    if (!configuredUserId) configurePromise = null;
    lastError = friendlyError(error, "In-app purchases could not be started.");
    console.warn("RevenueCat identify failed:", lastError);
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

// Returns the current offering's packages, sorted monthly → annual. Falls back
// to the first offering when none is marked "current" in the dashboard.
export const getCurrentPackages = async () => {
  if (!isRevenueCatAvailable() || !configurePromise) {
    throw new Error(lastError || getUnavailableReason() || "In-app purchases are not ready.");
  }
  await configurePromise;
  let offerings;
  try {
    offerings = await withTimeout(
      Purchases.getOfferings(),
      "Loading plans timed out. Check your connection and try again.",
    );
  } catch (error) {
    throw new Error(friendlyError(error, "Plans couldn't be loaded. Please try again."));
  }
  const current =
    offerings?.current || Object.values(offerings?.all || {})[0] || null;
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
      message: friendlyError(error, "The purchase could not be completed."),
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
      message: friendlyError(error, "Purchases could not be restored."),
    };
  }
};

export const addRevenueCatListener = (listener) => {
  if (!isRevenueCatAvailable() || !configurePromise) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
};

// --- Free trial / intro offer detection -----------------------------------
// iOS reports trials on `product.introPrice`. Google Play reports them as
// pricing phases on `product.defaultOption` / `product.subscriptionOptions`
// (`freePhase` for free trials, `introPhase` for discounted intro prices).

const UNIT_DAYS = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

const toDays = (unit, value, cycles = 1) => {
  const days = UNIT_DAYS[String(unit || "").toUpperCase()];
  const count = Number(value) || 0;
  return days && count ? days * count * (Number(cycles) || 1) : 0;
};

const isZeroPhase = (phase) =>
  phase?.price?.amountMicros != null && Number(phase.price.amountMicros) === 0;

// Returns { days, isFree, priceString } for the first trial/intro phase, or null.
export const getTrialOffer = (product) => {
  if (!product) return null;

  // Android: the default option first, then any other option with a free phase.
  const options = [
    product.defaultOption,
    ...(Array.isArray(product.subscriptionOptions) ? product.subscriptionOptions : []),
  ].filter(Boolean);
  for (const option of options) {
    const phase = option.freePhase || (isZeroPhase(option.introPhase) ? option.introPhase : null);
    if (phase) {
      return {
        days: toDays(
          phase.billingPeriod?.unit,
          phase.billingPeriod?.value,
          phase.billingCycleCount,
        ),
        isFree: true,
        priceString: null,
      };
    }
  }
  const introPhase = product.defaultOption?.introPhase;
  if (introPhase) {
    return {
      days: toDays(
        introPhase.billingPeriod?.unit,
        introPhase.billingPeriod?.value,
        introPhase.billingCycleCount,
      ),
      isFree: false,
      priceString: introPhase.price?.formatted || null,
    };
  }

  // iOS (and Android fallback): introPrice.
  const intro = product.introPrice;
  if (intro) {
    const isFree = Number(intro.price) === 0;
    return {
      days: toDays(intro.periodUnit, intro.periodNumberOfUnits, intro.cycles),
      isFree,
      priceString: isFree ? null : intro.priceString || null,
    };
  }
  return null;
};

// "3-day free trial", or null when the product has no free trial.
export const formatTrialLabel = (offer) => {
  if (!offer?.isFree) return null;
  return offer.days ? `${offer.days}-day free trial` : "Free trial";
};

// Product identifiers the user is NOT eligible to get a trial for.
// iOS answers via StoreKit; Google Play only returns offers the user is
// eligible for, so Android needs no extra check (status is UNKNOWN there).
export const getIneligibleTrialProductIds = async (packages = []) => {
  const ineligible = new Set();
  if (!isRevenueCatAvailable() || Platform.OS !== "ios" || !packages.length) {
    return ineligible;
  }
  try {
    const ids = packages.map((p) => p?.product?.identifier).filter(Boolean);
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
    const INELIGIBLE = Purchases.INTRO_ELIGIBILITY_STATUS?.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ?? 1;
    Object.entries(result || {}).forEach(([id, value]) => {
      if (value?.status === INELIGIBLE) ineligible.add(id);
    });
  } catch {
    // Unknown eligibility: let the store decide at purchase time.
  }
  return ineligible;
};

// Best eligible free trial in the current offering, e.g. { days: 3, label }.
// `trialUsedAt` (from the server) hides trial copy for users who already had one.
export const getAvailableFreeTrial = async ({ trialUsedAt } = {}) => {
  if (trialUsedAt || !isRevenueCatAvailable()) return null;
  try {
    const { packages } = await getCurrentPackages();
    const ineligible = await getIneligibleTrialProductIds(packages);
    for (const aPackage of packages) {
      if (ineligible.has(aPackage?.product?.identifier)) continue;
      const offer = getTrialOffer(aPackage.product);
      const label = formatTrialLabel(offer);
      if (label) return { days: offer.days || null, label };
    }
  } catch {
    // Offerings unavailable: fall back to generic upgrade copy.
  }
  return null;
};

// Human-readable price/period for a package, e.g. "Rs 900 / month".
export const describePackage = (aPackage, { trialEligible = true } = {}) => {
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
    ...(() => {
      const offer = trialEligible ? getTrialOffer(product) : null;
      const trialLabel = formatTrialLabel(offer);
      return {
        hasTrial: Boolean(trialLabel),
        trialDays: trialLabel ? offer.days || null : null,
        trialLabel,
        // Paid intro price (not free), e.g. "Rs 300 for the first month".
        introLabel:
          offer && !offer.isFree && offer.priceString
            ? `${offer.priceString} intro price${offer.days ? ` for ${offer.days} days` : ""}`
            : null,
      };
    })(),
  };
};
