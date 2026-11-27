import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";
import NotificationSettings from "../components/NotificationSettings";
import DeviceSyncSection from "../components/DeviceSyncSection";
import AdBanner from "../components/AdBanner";
import { isActiveProUser, getPlanLabel } from "../utils/subscription";

export default function ProfileScreen({ navigation }) {
  const {
    user,
    theme,
    toggleTheme,
    updateProfile,
    logout,
    deleteAccount,
    isLoading,
    refreshUserProfile,
  } = useAuthStore();
  const colors = getThemeColors(theme);

  const openSupportEmail = async () => {
    try {
      await Linking.openURL("mailto:nutrimorphsupport@gmail.com");
    } catch (error) {
      console.error("Could not open the support email app:", error);
      Alert.alert(
        "Support",
        "Email nutrimorphsupport@gmail.com for assistance.",
      );
    }
  };

  const openOfficialWebsite = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://nutrimorph.app");
    } catch (error) {
      console.error("Could not open the NutriMorph website:", error);
      Alert.alert("Website", "Visit https://nutrimorph.app.");
    }
  };

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
  const [refreshing, setRefreshing] = useState(false);
  const [dietPreference, setDietPreference] = useState(user?.dietPreference || "");

  useEffect(() => {
    if (user) {
      setDietPreference(user.dietPreference || "");
      setName(user.name || "");
      setHeight(user.height ? String(user.height) : "");
      setWeight(user.weight ? String(user.weight) : "");
      setDailyCalorieGoal(
        user.dailyCalorieGoal ? String(user.dailyCalorieGoal) : "2000",
      );
      setProfileImage(user.avatar || user.profileImage || null);
    }
  }, [user]);

  const isPro = isActiveProUser(user);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await refreshUserProfile({ force: true });
      if (!result.success && !result.sessionExpired) {
        Alert.alert(
          "Refresh failed",
          result.message || "Could not refresh your profile.",
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  // RevenueCat is the billing flow: the subscription screen shows store
  // offerings, restore, and subscription management.
  const openSubscription = () => {
    navigation.navigate("SubscriptionScreen");
  };

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
      dietPreference,
    };

    const res = await updateProfile(payload);
    if (res?.success) {
      Alert.alert("Success", "Profile updated successfully!");
    } else {
      Alert.alert("Error", res?.message || "Failed to update profile.");
    }
  };

  // Same lifecycle as the website/backend: immediate deactivation, 30-day
  // recovery by signing in, then permanent deletion. Step 1 explains it,
  // step 2 confirms with the account password.
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeleteConfirmVisible(false);
    setDeletePassword("");
    setDeleteError("");
  };

  const handleDeleteAccountPress = () => {
    const storeNote =
      user?.billingProvider === "revenuecat" && isPro
        ? "\n\nYour Google Play / App Store subscription is not cancelled automatically. Cancel it in the store to stop future charges."
        : "";
    Alert.alert(
      "Delete your account?",
      "Your account will be deactivated right away and you'll be signed out.\n\n" +
        "You have 30 days to change your mind: just sign in again to restore everything.\n\n" +
        "After 30 days, your profile, meals, weight history, and chats are permanently deleted." +
        storeNote,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            setDeletePassword("");
            setDeleteError("");
            setDeleteConfirmVisible(true);
          },
        },
      ],
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    const res = await deleteAccount({ password: deletePassword });
    setDeleting(false);
    if (res?.success) {
      // deleteAccount already signed out; this screen is unmounting.
      Alert.alert(
        "Account deactivated",
        res.message ||
          "Your account is deactivated. Sign in within 30 days to restore it.",
      );
      return;
    }
    setDeleteError(res?.message || "Failed to delete account. Please try again.");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
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
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {name ? name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.changePhotoBtn,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
              onPress={handlePickImage}
            >
              <Ionicons name="camera" size={14} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>
                Change Photo
              </Text>
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

          {/* Used to personalise AI suggestions (e.g. calorie recovery tips). */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Diet style
          </Text>
          <View style={styles.dietRow}>
            {[
              "Desi / Pakistani",
              "Indian",
              "Middle Eastern",
              "Western",
              "Mediterranean",
              "Vegetarian",
            ].map((option) => {
              const selected = dietPreference === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setDietPreference(selected ? "" : option)}
                  style={[
                    styles.dietChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.inputBg,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={{
                      color: selected ? "#FFF" : colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
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

        {/* App Appearance Switcher Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
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
              trackColor={{ false: "#CBD5E1", true: colors.primary }}
              thumbColor={theme === "dark" ? "#FFF" : "#F4F4F5"}
            />
          </View>
        </View>

        {/* Notifications Settings Card */}
        <NotificationSettings />

        {/* Health & Device Sync Section */}
        <DeviceSyncSection />

        {/* Subscription Plan Box (RevenueCat) */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
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
            {isPro
              ? getPlanLabel(user) === "TRIAL"
                ? "Pro Trial Active"
                : "Pro Plan Active"
              : "Free Tier Plan"}
          </Text>

          <TouchableOpacity
            style={[
              styles.planToggleBtn,
              { backgroundColor: isPro ? colors.cardBgGlow : colors.primary },
              isPro && { borderWidth: 1, borderColor: colors.primary },
            ]}
            onPress={openSubscription}
          >
            <Ionicons
              name={isPro ? "settings-outline" : "star-outline"}
              size={18}
              color={isPro ? colors.primary : "#FFF"}
            />
            <Text
              style={[styles.planToggleText, isPro && { color: colors.primary }]}
            >
              {isPro ? "Manage Subscription" : "Upgrade to Pro"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Support
          </Text>
          <TouchableOpacity
            style={styles.supportLink}
            onPress={openSupportEmail}
            accessibilityRole="button"
          >
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={[styles.supportLinkText, { color: colors.text }]}>
              Contact support
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.supportLink}
            onPress={openOfficialWebsite}
            accessibilityRole="link"
          >
            <Ionicons name="globe-outline" size={18} color={colors.primary} />
            <Text style={[styles.supportLinkText, { color: colors.text }]}>
              Visit nutrimorph.app
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccountPress}
          disabled={isLoading}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
      <AdBanner />
      {/* Step 2 of account deletion: password confirmation */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBg, borderColor: "#EF4444" },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirm account deletion
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Enter the password for {user?.email || "your account"}. You can
              restore the account by signing in within 30 days.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={(value) => {
                setDeletePassword(value);
                if (deleteError) setDeleteError("");
              }}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
              onSubmitEditing={handleConfirmDelete}
              style={[
                styles.modalInput,
                {
                  color: colors.text,
                  borderColor: deleteError ? "#EF4444" : colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
            />
            {deleteError ? (
              <Text style={styles.modalError}>{deleteError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.modalDanger, { opacity: deleting ? 0.6 : 1 }]}
              onPress={handleConfirmDelete}
              disabled={deleting}
              accessibilityRole="button"
            >
              {deleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalDangerText}>Deactivate account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={closeDeleteConfirm}
              disabled={deleting}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                Keep my account
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  modalCard: { borderWidth: 1, borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  modalBody: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalError: { color: "#EF4444", fontSize: 13, marginTop: 8 },
  modalDanger: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDangerText: { color: "#FFFFFF", fontWeight: "800" },
  modalCancel: { alignItems: "center", padding: 12, marginTop: 4 },
  dietRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  dietChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  supportLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  supportLinkText: { fontSize: 14, fontWeight: "600" },
  safeArea: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarContainer: { alignItems: "center", marginBottom: 16 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInitial: { fontSize: 32, fontWeight: "bold", color: "#FFF" },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  label: { fontSize: 12, marginBottom: 6, fontWeight: "600" },
  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { width: "48%" },
  saveButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    borderRadius: 12,
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
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
    marginBottom: 12,
  },
  logoutText: { color: "#EF4444", fontWeight: "bold", marginLeft: 8 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  deleteText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
    textDecorationLine: "underline",
  },
});
