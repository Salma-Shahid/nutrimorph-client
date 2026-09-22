import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function ProfileScreen({ navigation }) {
  const {
    user,
    theme,
    toggleTheme, // 👈 toggleTheme yahan add kiya gaya hai
    updateProfile,
    toggleSubscriptionTier,
    logout,
    isLoading,
  } = useAuthStore();
  const colors = getThemeColors(theme);

  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [height, setHeight] = useState(user?.height ? String(user.height) : "");
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : "");
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(
    user?.dailyCalorieGoal ? String(user.dailyCalorieGoal) : "2000",
  );
  const [profileImage, setProfileImage] = useState(
    user?.avatar || user?.profileImage || null,
  );

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setHeight(user.height ? String(user.height) : "");
      setWeight(user.weight ? String(user.weight) : "");
      setDailyCalorieGoal(
        user.dailyCalorieGoal ? String(user.dailyCalorieGoal) : "2000",
      );
      setProfileImage(user.avatar || user.profileImage || null);
    }
  }, [user]);

  const isPro = user?.subscriptionTier === "pro" || user?.isPro === true;

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera roll permission is required.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const base64Img = result.assets[0].base64
        ? `data:image/jpeg;base64,${result.assets[0].base64}`
        : result.assets[0].uri;

      setProfileImage(base64Img);
      await updateProfile({ avatar: base64Img });
    }
  };

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      dailyCalorieGoal: dailyCalorieGoal ? Number(dailyCalorieGoal) : 2000,
      avatar: profileImage,
    };

    const res = await updateProfile(payload);
    if (res?.success) {
      Alert.alert("Success 🎉", "Profile updated successfully!");
    } else {
      Alert.alert("Error", res?.message || "Failed to update profile.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile Settings
        </Text>

        {/* Profile Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {name ? name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.changePhotoBtn}
              onPress={handlePickImage}
            >
              <Ionicons name="camera" size={14} color="#FFF" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Full Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Email Address
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.textSecondary,
                borderColor: colors.border,
              },
            ]}
            value={email}
            editable={false}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Height (cm)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Weight (kg)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Daily Calorie Goal (kcal)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={dailyCalorieGoal}
            onChangeText={setDailyCalorieGoal}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveChanges}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 🌙 / ☀️ Light Mode & Dark Mode Switcher Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            App Appearance
          </Text>
          <View style={styles.themeRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={theme === "dark" ? "moon" : "sunny"}
                size={20}
                color={theme === "dark" ? "#F59E0B" : "#EAB308"}
              />
              <Text
                style={[
                  styles.themeText,
                  { color: colors.text, marginLeft: 10 },
                ]}
              >
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </Text>
            </View>

            <Switch
              value={theme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: "#CBD5E1", true: "#10B981" }}
              thumbColor={theme === "dark" ? "#FFF" : "#F4F4F5"}
            />
          </View>
        </View>

        {/* Plan Switcher Box */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Current Subscription
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: isPro ? "#F59E0B" : colors.text,
              marginBottom: 10,
            }}
          >
            {isPro ? "Pro Plan Active 👑" : "Free Tier Plan"}
          </Text>

          <TouchableOpacity
            style={[
              styles.planToggleBtn,
              { backgroundColor: isPro ? "#64748B" : "#10B981" },
            ]}
            onPress={() => toggleSubscriptionTier(isPro ? "free" : "pro")}
          >
            <Ionicons
              name={isPro ? "arrow-down-circle-outline" : "star-outline"}
              size={18}
              color="#FFF"
            />
            <Text style={styles.planToggleText}>
              {isPro ? "Switch to Free Plan" : "Switch to Pro Plan"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  card: { borderRadius: 16, padding: 18, marginBottom: 16 },
  avatarContainer: { alignItems: "center", marginBottom: 16 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarInitial: { fontSize: 32, fontWeight: "bold", color: "#FFF" },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changePhotoText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  label: { fontSize: 12, marginBottom: 6, fontWeight: "600" },
  input: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { width: "48%" },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
  themeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  themeText: { fontWeight: "bold", fontSize: 15 },
  planToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
  },
  planToggleText: { color: "#FFF", fontWeight: "bold", marginLeft: 8 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 14,
    borderRadius: 12,
  },
  logoutText: { color: "#EF4444", fontWeight: "bold", marginLeft: 8 },
});
