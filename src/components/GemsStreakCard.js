import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore";
import {
  TIER_STYLES,
  claimAdGems,
  fetchGemStatus,
  reviveStreak,
} from "../services/gems";
import { canShowRewardedAds, showRewardedAd } from "../services/ads";

// Gems balance, Pro tier, and the broken-streak revive flow.
// Free: watch a rewarded ad (+2 gems) → revive. Pro: monthly tier gems.
export default function GemsStreakCard({ colors, refreshKey, onStatus, onUpgrade }) {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => String(state.user?._id || state.user?.id || ""));
  const updateUserStats = useAuthStore((state) => state.updateUserStats);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(""); // "" | ad | revive
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applyStatus = useCallback(
    (data) => {
      if (!data || !mounted.current) return;
      setStatus(data);
      onStatusRef.current?.(data);
      updateUserStats({ gems: data.gems });
    },
    [updateUserStats],
  );

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetchGemStatus(token);
    if (!mounted.current) return;
    if (res.success) {
      applyStatus(res.data);
      if (res.data?.justGranted) {
        setNotice(
          `+${res.data.justGranted.amount} gems from your ${res.data.justGranted.tier} tier this month!`,
        );
      }
    }
  }, [applyStatus, token]);

  useEffect(() => {
    load();
  }, [load, refreshKey, userId]);

  const handleWatchAd = async () => {
    if (busy) return;
    setBusy("ad");
    setNotice("");
    try {
      let watched = false;
      if (canShowRewardedAds()) {
        const result = await showRewardedAd({ userId });
        watched = result.rewarded;
        if (!watched) {
          Alert.alert(
            result.reason === "closed_early" ? "Ad not finished" : "No ad available",
            result.reason === "closed_early"
              ? "Watch the whole ad to earn your gems."
              : "There's no ad to show right now. Please try again in a few minutes.",
          );
        }
      } else if (__DEV__) {
        // Expo Go / dev without AdMob: simulate a completed ad for testing.
        watched = await new Promise((resolve) =>
          Alert.alert(
            "Simulated rewarded ad",
            "Ads can't play in this build. Simulate watching an ad to the end?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Simulate", onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          ),
        );
      } else {
        Alert.alert("Ads unavailable", "Ads can't be shown right now. Please try again later.");
      }
      if (!watched || !mounted.current) return;

      const res = await claimAdGems(token);
      if (!mounted.current) return;
      if (res.data) applyStatus(res.data);
      setNotice(res.success ? res.message : "");
      if (!res.success) Alert.alert("Gems", res.message);
    } finally {
      if (mounted.current) setBusy("");
    }
  };

  const handleRevive = async () => {
    if (busy || !status) return;
    setBusy("revive");
    setNotice("");
    try {
      const res = await reviveStreak(token);
      if (!mounted.current) return;
      if (res.userStats) await updateUserStats(res.userStats);
      if (res.data) applyStatus(res.data);
      if (res.success) {
        setNotice(res.message);
      } else {
        Alert.alert("Couldn't revive", res.message);
        if (res.code === "STATE_CHANGED") load();
      }
    } finally {
      if (mounted.current) setBusy("");
    }
  };

  if (!status) return null;

  const { gems, isPro, tier, streak, ad, monthlyGrant } = status;
  const tierStyle = TIER_STYLES[tier?.id] || { color: colors.primary, icon: "diamond" };
  const gemColor = isPro ? tierStyle.color : "#38BDF8";

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.balance}>
          <Ionicons name="diamond" size={20} color={gemColor} />
          <Text style={[styles.balanceText, { color: colors.text }]}>
            {gems} {gems === 1 ? "gem" : "gems"}
          </Text>
        </View>
        {isPro && tier ? (
          <View style={[styles.tierChip, { borderColor: tierStyle.color }]}>
            <Text style={[styles.tierText, { color: tierStyle.color }]}>
              {tier.name} · {tier.monthlyGems}/month
            </Text>
          </View>
        ) : (
          <TouchableOpacity onPress={onUpgrade} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.primary }]}>Pro: monthly gems</Text>
          </TouchableOpacity>
        )}
      </View>

      {isPro && tier?.next ? (
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {tier.next.name} ({tier.next.monthlyGems} gems/month) at a{" "}
          {tier.next.minBestStreak}-day best streak · {tier.next.daysToGo} to go
        </Text>
      ) : null}
      {isPro && monthlyGrant && !notice ? (
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {monthlyGrant.grantedThisMonth
            ? "This month's gems have been added."
            : "Your monthly gems arrive shortly."}
        </Text>
      ) : null}

      {streak.broken ? (
        <View style={[styles.revivePanel, { borderColor: "#F59E0B" }]}>
          <View style={styles.reviveHeader}>
            <Ionicons name="flame-outline" size={18} color="#F59E0B" />
            <Text style={[styles.reviveTitle, { color: colors.text }]}>
              {streak.revivable
                ? `Your ${streak.lostStreak}-day streak broke`
                : "Your streak ended"}
            </Text>
          </View>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {streak.revivable
              ? `You missed ${streak.missedDays} day${streak.missedDays === 1 ? "" : "s"}. Revive it for ${streak.reviveCost} gems.`
              : "It was missed for too long to revive. Log today to start a new streak."}
          </Text>

          {streak.revivable ? (
            streak.canAfford ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#F59E0B", opacity: busy ? 0.6 : 1 }]}
                onPress={handleRevive}
                disabled={Boolean(busy)}
                accessibilityRole="button"
              >
                {busy === "revive" ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>
                    Revive streak · {streak.reviveCost} 💎
                  </Text>
                )}
              </TouchableOpacity>
            ) : ad.eligible ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#38BDF8", opacity: busy ? 0.6 : 1 }]}
                onPress={handleWatchAd}
                disabled={Boolean(busy)}
                accessibilityRole="button"
              >
                {busy === "ad" ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>Watch ad · +{ad.rewardGems} 💎</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={[styles.muted, { color: colors.textSecondary }]}>
                {isPro
                  ? "Not enough gems. Your next monthly gems will arrive at the start of next month."
                  : "Today's ad rewards are used up. Upgrade to Pro for monthly gems."}
              </Text>
            )
          ) : null}
        </View>
      ) : null}

      {notice ? (
        <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12, gap: 6 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  balance: { flexDirection: "row", alignItems: "center", gap: 6 },
  balanceText: { fontSize: 16, fontWeight: "800" },
  tierChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tierText: { fontSize: 12, fontWeight: "700" },
  link: { fontSize: 12, fontWeight: "700" },
  muted: { fontSize: 12, lineHeight: 17 },
  revivePanel: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 6, gap: 6 },
  reviveHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviveTitle: { fontSize: 14, fontWeight: "800" },
  primaryBtn: {
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  notice: { fontSize: 12, fontWeight: "700", marginTop: 4 },
});
