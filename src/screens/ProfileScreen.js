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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function ProfileScreen({ navigation }) {
  const { user, theme, updateProfile, updateUserGlobally, logout, isLoading } =
    useAuthStore();
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

  // Sync state if user object updates globally
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

  // Image Picker Logic
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to change profile photo!",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      const base64Img = result.assets[0].base64
        ? `data:image/jpeg;base64,${result.assets[0].base64}`
        : selectedImageUri;

      setProfileImage(selectedImageUri);

      // Instantly save image locally and globally
      await updateUserGlobally({
        avatar: base64Img,
        profileImage: selectedImageUri,
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      dailyCalorieGoal: dailyCalorieGoal ? Number(dailyCalorieGoal) : 2000,
      avatar: profileImage,
    };

    const result = await updateProfile(payload);
    if (result.success) {
      Alert.alert("Success 🎉", "Profile updated successfully!");
    } else {
      Alert.alert("Error", result.message || "Failed to update profile.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Kya aap logout karna chahte hain?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Profile Settings
          </Text>
        </View>

        {/* Profile Avatar Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
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
              <Ionicons name="camera" size={16} color="#FFF" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* User Details Form */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[
              styles.input,
              styles.disabledInput,
              { color: "#94A3B8", borderColor: colors.border },
            ]}
            value={email}
            editable={false}
          />

          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder="e.g. 175"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="e.g. 70"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          <Text style={styles.label}>Daily Calorie Goal (kcal)</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            value={dailyCalorieGoal}
            onChangeText={setDailyCalorieGoal}
            keyboardType="numeric"
            placeholder="e.g. 2000"
            placeholderTextColor="#64748B"
          />

          <TouchableOpacity
            style={[styles.saveButton, isLoading && { opacity: 0.7 }]}
            onPress={handleSaveChanges}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Dynamic Pro Plan Banner */}
        {isPro ? (
          <View style={styles.proActiveCard}>
            <Ionicons name="ribbon" size={28} color="#F59E0B" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.proActiveTitle}>Pro Member Active 👑</Text>
              <Text style={styles.proActiveSub}>
                You have unlimited access to NutriBot & AI Meal Scanner.
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.proBanner}
            onPress={() => navigation.navigate("SubscriptionScreen")}
          >
            <Ionicons name="star" size={28} color="#FFD700" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.proBannerTitle}>⭐ Upgrade to Pro Plan</Text>
              <Text style={styles.proBannerSub}>
                Unlock Voice AI Bot, Custom Meal Plans & Advanced Analytics
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Prominent Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#EF4444"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changePhotoText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  label: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  disabledInput: {
    backgroundColor: "#1E293B",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInputContainer: {
    width: "48%",
  },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  proBanner: {
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  proBannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  proBannerSub: {
    color: "#E0E7FF",
    fontSize: 12,
    marginTop: 2,
  },
  proActiveCard: {
    backgroundColor: "#1E293B",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  proActiveTitle: {
    color: "#F59E0B",
    fontSize: 16,
    fontWeight: "bold",
  },
  proActiveSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "bold",
    fontSize: 16,
  },
});
