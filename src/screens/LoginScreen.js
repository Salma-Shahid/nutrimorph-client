import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login, isLoading, error, theme } = useAuthStore();
  const colors = getThemeColors(theme || "dark");

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }

    const result = await login(trimmedEmail, password);

    if (!result?.success) {
      Alert.alert(
        "Login Failed",
        result?.message || "Login failed. Please try again.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.bg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View
            style={[
              styles.logoIconContainer,
              {
                backgroundColor: colors.glassGlow,
                borderColor: colors.primary,
              },
            ]}
          >
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logoImage}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>NutriMorph</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Welcome Back! Please login to continue.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Email Address"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            isLoading && { opacity: 0.7 },
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Signup")}
          style={styles.linkContainer}
        >
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            Do not have Account?{" "}
            <Text style={[styles.linkBold, { color: colors.primary }]}>
              Sign Up
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    resizeMode: "cover",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "#ff5252",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  linkText: {
    textAlign: "center",
    fontSize: 14,
  },
  linkBold: {
    fontWeight: "bold",
  },
});
