import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";
import { getPlanLabel, isActiveProUser } from "../utils/subscription";
import NeonCard from "../components/NeonCard";
import LottieFeedback from "../components/LottieFeedback";
import {
  addRevenueCatListener,
  describePackage,
  getCurrentPackages,
  getIneligibleTrialProductIds,
  getRevenueCatError,
  getUnavailableReason,
  hasProEntitlement,
  identifyRevenueCatUser,
  isExpoGo,
  isRevenueCatAvailable,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from "../services/revenueCat";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BENEFITS = [
  { icon: "scan-outline", text: "Unlimited AI meal & barcode scans" },
  { icon: "chatbubbles-outline", text: "Unlimited NutriBot conversations" },
  { icon: "restaurant-outline", text: "7-day and longer AI meal plans" },
  { icon: "create-outline", text: "AI text meal logging" },
];

export default function SubscriptionScreen({ navigation }) {
  const { theme, user, token, setUser, refreshUserProfile } = useAuthStore();
  const colors = getThemeColors(theme || "dark");
  const userId = String(user?._id || user?.id || "");
  const isPro = isActiveProUser(user);

  const [packages, setPackages] = useState([]);
  // Product IDs whose trial this user can't get (iOS StoreKit check).
  const [trialIneligible, setTrialIneligible] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [offeringsState, setOfferingsState] = useState("loading"); // loading | ready | empty | error | unavailable
  const [offeringsError, setOfferingsError] = useState("");
  const [busy, setBusy] = useState(""); // "" | purchase | restore | verify
  const [notice, setNotice] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const useRevenueCat = isRevenueCatAvailable();

  // Ask the server to verify the RevenueCat entitlement and update the
  // account. Retries briefly because store receipts can take a few seconds.
  const syncWithServer = useCallback(
    async ({ quiet = false } = {}) => {
      if (!token) return false;
      setBusy((current) => current || "verify");
      try {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          if (attempt > 0) await wait(2000);
          try {
            const res = await axios.post(
              `${BASE_URL}/api/payment/revenuecat/sync`,
              {},
              { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 },
            );
            const snapshot = res.data?.user;
            if (snapshot && String(useAuthStore.getState().user?._id || "") === userId) {
              await setUser(snapshot);
            }
            if (snapshot?.isPro) {
              await refreshUserProfile({ force: true });
              return true;
            }
          } catch (error) {
            const data = error?.response?.data;
            if (data?.user && String(useAuthStore.getState().user?._id || "") === userId) {
              await setUser(data.user);
            }
            // Server setup problem (503): retrying now won't help.
            if (error?.response?.status === 503) {
              if (!quiet) setNotice(data?.message || "Pro will activate once verification completes.");
              return false;
            }
            if (attempt === 3 && !quiet) {
              setNotice(
                error?.response?.data?.message ||
                  "Purchase received. We'll finish activating Pro as soon as you're back online.",
              );
            }
          }
        }
        return false;
      } finally {
        if (mounted.current) setBusy("");
      }
    },
    [refreshUserProfile, setUser, token, userId],
  );

  const loadOfferings = useCallback(async () => {
    if (!useRevenueCat) {
      setOfferingsState("unavailable");
      return;
    }
    if (!userId) {
      // Profile still loading; this re-runs when the user ID arrives.
      setOfferingsState("loading");
      return;
    }
    setOfferingsState("loading");
    setOfferingsError("");
    try {
      // Stop here if setup failed (bad key, no network) instead of calling
      // getOfferings() on an unconfigured SDK.
      if (!(await identifyRevenueCatUser(userId))) {
        throw new Error(getRevenueCatError() || "In-app purchases could not be started.");
      }
      const { packages: list } = await getCurrentPackages();
      const ineligible = await getIneligibleTrialProductIds(list);
      if (!mounted.current) return;
      setTrialIneligible(ineligible);
      setPackages(list);
      setSelectedId((current) =>
        list.some((p) => p.identifier === current)
          ? current
          : (list.find((p) => p.packageType === "ANNUAL") || list[0])?.identifier || null,
      );
      setOfferingsState(list.length ? "ready" : "empty");
    } catch (error) {
      if (__DEV__) console.warn("RevenueCat offerings failed:", error?.message);
      if (!mounted.current) return;
      setPackages([]);
      setSelectedId(null);
      setOfferingsError(error?.message || "");
      setOfferingsState("error");
    }
  }, [useRevenueCat, userId]);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const retryBilling = () => {
    loadOfferings();
  };

  // Renewals/expirations reported by the SDK while this screen is open.
  // Attached once the SDK is configured (offerings loaded), not before.
  const sdkReady = offeringsState === "ready" || offeringsState === "empty";
  useEffect(() => {
    if (!useRevenueCat || !sdkReady) return undefined;
    return addRevenueCatListener((customerInfo) => {
      if (hasProEntitlement(customerInfo) !== isActiveProUser(useAuthStore.getState().user)) {
        syncWithServer({ quiet: true });
      }
    });
  }, [sdkReady, syncWithServer, useRevenueCat]);

  const selectedPackage = packages.find((p) => p.identifier === selectedId);
  // A trial is offered only if the store says so, the user is eligible, and
  // the server has no record of an earlier trial.
  const packageInfo = (aPackage) =>
    describePackage(aPackage, {
      trialEligible:
        !user?.trialUsedAt &&
        !trialIneligible.has(aPackage?.product?.identifier),
    });
  const selectedInfo = selectedPackage ? packageInfo(selectedPackage) : null;

  const handlePurchase = async () => {
    if (!selectedPackage || busy) return;
    setNotice("");
    setBusy("purchase");
    const result = await purchaseRevenueCatPackage(selectedPackage);
    if (!mounted.current) return;
    if (result.cancelled) {
      setBusy("");
      return;
    }
    if (!result.success) {
      setBusy("");
      Alert.alert("Purchase not completed", result.message);
      return;
    }
    setBusy("verify");
    const activated = await syncWithServer();
    if (activated && mounted.current) setCelebrate(true);
  };

  const handleRestore = async () => {
    if (busy) return;
    setNotice("");
    setBusy("restore");
    const result = await restoreRevenueCatPurchases();
    if (!mounted.current) return;
    if (!result.success) {
      setBusy("");
      Alert.alert("Restore failed", result.message);
      return;
    }
    if (!result.active) {
      setBusy("");
      Alert.alert(
        "Nothing to restore",
        "No active NutriMorph Pro subscription was found for this store account.",
      );
      return;
    }
    setBusy("verify");
    const activated = await syncWithServer();
    if (activated && mounted.current) setCelebrate(true);
  };

  const manageUrl =
    Platform.OS === "ios"
      ? "https://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions";

  const renderPackages = () => {
    if (offeringsState === "loading") {
      return (
        <View style={styles.centerRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Loading plans…
          </Text>
        </View>
      );
    }
    if (offeringsState === "error" || offeringsState === "empty") {
      return (
        <NeonCard accent="amber">
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            {offeringsState === "error" ? "Plans couldn't load" : "No plans available yet"}
          </Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {offeringsState === "error"
              ? offeringsError || "Check your connection and try again."
              : __DEV__
                ? "RevenueCat returned no packages. Mark an offering as Current and attach products to it in the RevenueCat dashboard."
                : "Subscriptions are being set up for your region. Please check back soon."}
          </Text>
          <TouchableOpacity onPress={retryBilling} style={styles.inlineAction}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </NeonCard>
      );
    }
    return packages.map((aPackage) => {
      const info = packageInfo(aPackage);
      const selected = aPackage.identifier === selectedId;
      return (
        <NeonCard
          key={aPackage.identifier}
          active={selected}
          onPress={() => setSelectedId(aPackage.identifier)}
          accessibilityRole="radio"
          accessibilityLabel={`${info.title} ${info.price} ${info.period}`}
          style={styles.packageCard}
        >
          <Ionicons
            name={selected ? "radio-button-on" : "radio-button-off"}
            size={22}
            color={selected ? colors.primary : colors.textSecondary}
          />
          <View style={styles.packageText}>
            <Text style={[styles.packageTitle, { color: colors.text }]} numberOfLines={1}>
              {info.title}
            </Text>
            {info.hasTrial ? (
              <Text style={[styles.trialTag, { color: colors.primary }]}>
                {info.trialLabel}, then {info.price} {info.period}
              </Text>
            ) : info.introLabel ? (
              <Text style={[styles.trialTag, { color: colors.primary }]}>
                {info.introLabel}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.packagePrice, { color: colors.text }]} numberOfLines={1}>
            {info.price}
            <Text style={[styles.packagePeriod, { color: colors.textSecondary }]}>
              {info.period ? ` ${info.period}` : ""}
            </Text>
          </Text>
        </NeonCard>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={[styles.planPill, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
              Current plan: {getPlanLabel(user)}
            </Text>
          </View>
        </View>

        <View style={styles.heading}>
          {celebrate ? (
            <LottieFeedback name="success" size={88} loop={false} color={colors.primary} />
          ) : (
            <Ionicons name="ribbon-outline" size={40} color={colors.primary} />
          )}
          <Text style={[styles.title, { color: colors.text }]}>
            {isPro ? "You're on NutriMorph Pro" : "Upgrade to NutriMorph Pro"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isPro
              ? user?.subscriptionExpiresAt
                ? `Active until ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}.`
                : "All Pro features are unlocked."
              : "Unlock unlimited AI tracking and coaching."}
          </Text>
        </View>

        <NeonCard>
          {BENEFITS.map((benefit) => (
            <View key={benefit.text} style={styles.benefitRow}>
              <Ionicons name={benefit.icon} size={18} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </NeonCard>

        {notice ? (
          <NeonCard accent="amber" active>
            <Text style={[styles.muted, { color: colors.text }]}>{notice}</Text>
          </NeonCard>
        ) : null}

        {isPro ? (
          user?.billingProvider === "revenuecat" ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={() => Linking.openURL(manageUrl)}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Manage subscription
              </Text>
            </TouchableOpacity>
          ) : null
        ) : useRevenueCat ? (
          <>
            {renderPackages()}
            <TouchableOpacity
              style={[
                styles.proButton,
                {
                  backgroundColor: colors.primary,
                  opacity: !selectedPackage || busy ? 0.6 : 1,
                },
              ]}
              onPress={handlePurchase}
              disabled={!selectedPackage || Boolean(busy)}
              accessibilityRole="button"
            >
              {busy === "purchase" || busy === "verify" ? (
                <View style={styles.centerRow}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={styles.proButtonText}>
                    {busy === "verify" ? "Activating Pro…" : "Processing…"}
                  </Text>
                </View>
              ) : (
                <Text style={styles.proButtonText}>
                  {selectedInfo?.hasTrial
                    ? selectedInfo.trialDays
                      ? `Start ${selectedInfo.trialDays}-day free trial`
                      : "Start free trial"
                    : "Continue"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <NeonCard accent="sky">
            <Text style={[styles.noticeTitle, { color: colors.text }]}>
              {Platform.OS === "web"
                ? "Subscribe in the NutriMorph app"
                : isExpoGo()
                  ? "Store billing isn't available in Expo Go"
                  : "Subscriptions aren't available in this build"}
            </Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              {getUnavailableReason() ||
                "Pro will be available to purchase soon. Your free features keep working in the meantime."}
            </Text>
          </NeonCard>
        )}

        {useRevenueCat && (
          <TouchableOpacity
            onPress={handleRestore}
            disabled={Boolean(busy)}
            style={styles.restoreBtn}
            accessibilityRole="button"
          >
            {busy === "restore" ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Restore purchases
              </Text>
            )}
          </TouchableOpacity>
        )}

        {useRevenueCat && !isPro && (
          <Text style={[styles.legal, { color: colors.textSecondary }]}>
            Payment is charged to your {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account.
            Subscriptions renew automatically unless cancelled at least 24 hours before the
            end of the period. Manage or cancel anytime in your store account settings.
          </Text>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  planPill: {
    marginLeft: "auto",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heading: { alignItems: "center", marginVertical: 12, gap: 6 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  benefitText: { fontSize: 14, flex: 1, minWidth: 0 },
  packageCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  packageText: { flex: 1, minWidth: 0 },
  packageTitle: { fontSize: 15, fontWeight: "700" },
  packagePrice: { fontSize: 16, fontWeight: "800", flexShrink: 0 },
  packagePeriod: { fontSize: 12, fontWeight: "500" },
  trialTag: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  proButton: {
    minHeight: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  proButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreBtn: { alignItems: "center", paddingVertical: 14 },
  centerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 8 },
  muted: { fontSize: 13, lineHeight: 19 },
  noticeTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  inlineAction: { marginTop: 8, alignSelf: "flex-start" },
  legal: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 4 },
});
