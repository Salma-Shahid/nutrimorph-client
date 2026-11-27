import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore";
import { getAvailableFreeTrial } from "../services/revenueCat";

export default function UpgradeTrialModal({
  visible,
  colors,
  loading = false,
  onClose,
  onContinue,
}) {
  const trialUsedAt = useAuthStore((state) => state.user?.trialUsedAt);
  // Eligible store free trial, e.g. { days: 3, label: "3-day free trial" }.
  const [trial, setTrial] = useState(null);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    getAvailableFreeTrial({ trialUsedAt }).then((offer) => {
      if (active) setTrial(offer);
    });
    return () => {
      active = false;
    };
  }, [visible, trialUsedAt]);

  const trialDays = trial?.days;
  const title = trial
    ? trialDays
      ? `Try Pro free for ${trialDays} days`
      : "Try Pro free"
    : "Upgrade to Pro";
  const cta = trial
    ? trialDays
      ? `Start ${trialDays}-day free trial`
      : "Start free trial"
    : "View Pro plans";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.primary },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close upgrade dialog"
            style={styles.close}
            onPress={onClose}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.glassGlow || colors.inputBg },
            ]}
          >
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Unlock premium NutriBot support, meal scans, and longer personalized plans with NutriMorph Pro.
          </Text>
          {trial ? (
            <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
              No charge today. Your subscription starts after the {trial.label}{" "}
              unless you cancel before it ends in Google Play or the App Store.
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={onContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>{cta}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={{ color: colors.textSecondary }}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  card: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    shadowColor: "#42F5A1",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  close: { position: "absolute", top: 12, right: 12, padding: 6 },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  description: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  trialNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: -10,
    marginBottom: 18,
  },
  primaryButton: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: { padding: 14, marginTop: 4 },
});
