import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const ProfileScreen = ({ navigation }) => {
  const { user, updateProfile, theme, toggleTheme } = useAuthStore();
  const colors = getThemeColors(theme);

  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [height, setHeight] = useState(user?.height?.toString() || "");
  const [weight, setWeight] = useState(user?.weight?.toString() || "");
  const [calories, setCalories] = useState(
    user?.calorieTarget?.toString() || "2400",
  );
  const [loading, setLoading] = useState(false);

  // Pick profile photo from device gallery
  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Gallery access is required to change profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Submit updated profile using useAuthStore updateProfile method
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const payload = {
        name: fullName,
        email: email,
        profileImage: profileImage,
        height: Number(height),
        weight: Number(weight),
        calorieTarget: Number(calories),
      };

      const res = await updateProfile(payload);

      if (res?.success) {
        Alert.alert("Success", "Profile and Dashboard updated successfully!");
      } else {
        Alert.alert(
          "Error",
          res?.message || "Failed to update profile details.",
        );
      }
    } catch (error) {
      console.error("Profile update error:", error?.message || error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile Settings
        </Text>
        <TouchableOpacity style={styles.themeToggleBtn} onPress={toggleTheme}>
          <Text style={{ fontSize: 16 }}>
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Image & Avatar Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <TouchableOpacity
            onPress={handlePickImage}
            style={styles.imageContainer}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {typeof fullName === "string" && fullName.trim().length > 0
                    ? fullName.trim().charAt(0).toUpperCase()
                    : "U"}
                </Text>
              </View>
            )}
            <Text style={styles.changePhotoText}>Change Photo 📷</Text>
          </TouchableOpacity>
        </View>

        {/* Input Details Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.label, { color: colors.subText }]}>
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
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { color: colors.subText }]}>
            Email Address (Gmail)
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
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.subText }]}>
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
              <Text style={[styles.label, { color: colors.subText }]}>
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

          <Text style={[styles.label, { color: colors.subText }]}>
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
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>
              {loading ? "Saving..." : "Save Changes 💾"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plan Upgrade Trigger */}
        <TouchableOpacity
          style={styles.upgradeCard}
          onPress={() => navigation?.navigate("SubscriptionScreen")}
        >
          <Text style={styles.upgradeTitle}>⭐ Upgrade to Pro Plan</Text>
          <Text style={styles.upgradeSub}>
            Unlock Voice AI Bot, Custom Meal Plans & Advanced Analytics
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  themeToggleBtn: { padding: 8, borderRadius: 12, backgroundColor: "#334155" },
  scrollContent: { padding: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  imageContainer: { alignItems: "center" },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 36, color: "#FFF", fontWeight: "bold" },
  changePhotoText: {
    marginTop: 8,
    color: "#10B981",
    fontWeight: "600",
    fontSize: 13,
  },
  label: { fontSize: 13, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  saveBtn: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
  upgradeCard: {
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  upgradeTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  upgradeSub: {
    color: "#E0E7FF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});

export default ProfileScreen;
