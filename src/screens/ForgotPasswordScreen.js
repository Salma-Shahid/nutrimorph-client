import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { getThemeColors } from "../theme/colors";
import { useAuthStore } from "../store/useAuthStore";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app"}/api/auth`;

export default function ForgotPasswordScreen({ navigation }) {
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const requestReset = async () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Enter your account email address.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/forgot-password`, {
        email: email.trim().toLowerCase(),
      });
      setRequested(true);
      Alert.alert("Check your email", response.data.message);
    } catch (error) {
      Alert.alert(
        "Request failed",
        error.response?.data?.message || "Could not send the reset email.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!token.trim() || password.length < 8) {
      Alert.alert(
        "Invalid details",
        "Enter the reset token and a password of at least 8 characters.",
      );
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/reset-password`, {
        email: email.trim().toLowerCase(),
        token: token.trim(),
        password,
      });
      Alert.alert("Password updated", response.data.message, [
        { text: "Sign in", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      Alert.alert(
        "Reset failed",
        error.response?.data?.message || "Could not reset the password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.primary }]}>
        <Ionicons name="lock-closed-outline" size={34} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          {resetMode ? "Reset password" : "Forgot password"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {resetMode
            ? "Enter the reset token from your email and choose a new password."
            : "We will email a secure, time-limited password reset link if the account exists."}
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {resetMode && (
          <>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
              value={token}
              onChangeText={setToken}
              placeholder="Reset token"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="New password (at least 8 characters)"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
          </>
        )}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={resetMode ? submitReset : requestReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.bg }]}>
              {resetMode ? "Update password" : "Send reset link"}
            </Text>
          )}
        </TouchableOpacity>
        {requested && !resetMode && (
          <TouchableOpacity onPress={() => setResetMode(true)}>
            <Text style={[styles.link, { color: colors.secondary }]}>
              Have a reset token? Enter it here
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={[styles.link, { color: colors.textSecondary }]}>
            Return to sign in
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    shadowColor: "#42F5A1",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14 },
  button: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { fontWeight: "700" },
  link: { textAlign: "center", paddingVertical: 8 },
});
