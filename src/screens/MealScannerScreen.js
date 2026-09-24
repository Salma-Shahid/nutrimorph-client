import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app"}/api`;

export default function MealScannerScreen({ navigation }) {
  // 🟢 Extract token directly from Zustand store
  const { theme, token: storeToken } = useAuthStore();
  const colors = getThemeColors(theme);

  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Modal & Draft State for User Confirmation/Correction
  const [modalVisible, setModalVisible] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [confidence, setConfidence] = useState("High");
  const [savingMeal, setSavingMeal] = useState(false);

  // Helper function to reliably get user JWT Token
  const getAuthToken = async () => {
    let activeToken = storeToken;
    if (!activeToken) {
      activeToken = await AsyncStorage.getItem("token");
    }
    return activeToken;
  };

  const pickImage = async (useCamera = false) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "Camera/Gallery permission is required to analyze food photos.",
      );
      return;
    }

    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64);
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!imageBase64) {
      Alert.alert("No Image Selected", "Please select or take a photo first.");
      return;
    }

    setAnalyzing(true);
    try {
      const activeToken = await getAuthToken();

      if (!activeToken) {
        Alert.alert(
          "Authentication Error",
          "Session token is missing. Please log out and log in again.",
        );
        setAnalyzing(false);
        return;
      }

      // Ensure proper base64 prefix
      const formattedBase64 = imageBase64.startsWith("data:image")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const res = await axios.post(
        `${API_BASE}/meals/scan`,
        { imageBase64: formattedBase64 },
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.data?.success || res.data?.status === "success") {
        const data = res.data.data || res.data;
        setFoodName(data.name || data.foodName || "Scanned Meal");
        setCalories(String(data.calories || 350));
        setProtein(String(data.protein || 20));
        setCarbs(String(data.carbs || 30));
        setFats(String(data.fats || 10));
        setConfidence(data.confidence || "High");

        setModalVisible(true);
      } else {
        Alert.alert(
          "Analysis Failed",
          "Could not clearly identify food items. Please try another photo or enter manually.",
        );
      }
    } catch (error) {
      console.error("Meal Analysis Error:", error);
      const msg =
        error.response?.data?.message ||
        "Failed to analyze meal photo. Check your connection or token.";
      Alert.alert("Analysis Error", msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!foodName.trim() || !calories.trim()) {
      Alert.alert(
        "Missing Details",
        "Please provide at least Food Name and Calories.",
      );
      return;
    }

    setSavingMeal(true);
    try {
      const activeToken = await getAuthToken();

      if (!activeToken) {
        Alert.alert("Authentication Error", "Please log in again.");
        setSavingMeal(false);
        return;
      }

      const payload = {
        name: foodName.trim(),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fats: Number(fats) || 0,
      };

      await axios.post(`${API_BASE}/meals/log`, payload, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
      });

      setModalVisible(false);
      setImageUri(null);
      setImageBase64(null);

      Alert.alert(
        "Meal Saved! 🎉",
        `${foodName} logged into your diary successfully.`,
      );
    } catch (error) {
      console.error("Save Meal Error:", error);
      const msg =
        error.response?.data?.message || "Failed to save meal entry to diary.";
      Alert.alert("Save Error", msg);
    } finally {
      setSavingMeal(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>AI Scan Meal</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Take or upload a food photo to automatically estimate calories and
          macros.
        </Text>

        {/* Image Preview Box */}
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderBox}>
              <Ionicons
                name="camera-outline"
                size={54}
                color={colors.textSecondary}
              />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                No image selected
              </Text>
            </View>
          )}
        </View>

        {/* Picker Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.pickerBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => pickImage(true)}
          >
            <Ionicons name="camera" size={20} color="#10B981" />
            <Text style={[styles.pickerText, { color: colors.text }]}>
              Camera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pickerBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => pickImage(false)}
          >
            <Ionicons name="images" size={20} color="#10B981" />
            <Text style={[styles.pickerText, { color: colors.text }]}>
              Gallery
            </Text>
          </TouchableOpacity>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[
            styles.analyzeBtn,
            (!imageBase64 || analyzing) && { opacity: 0.6 },
          ]}
          onPress={handleAnalyzePhoto}
          disabled={!imageBase64 || analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons
                name="sparkles"
                size={18}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.analyzeBtnText}>Analyze Photo with AI</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation & Editing Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Confirm Nutrition
              </Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {confidence} Confidence
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Food Item Name
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
              value={foodName}
              onChangeText={setFoodName}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Total Calories (kcal)
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

            <View style={styles.macroRow}>
              <View style={styles.macroCol}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Protein (g)
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
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.macroCol}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Carbs (g)
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
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.macroCol}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Fats (g)
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
                  value={fats}
                  onChangeText={setFats}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#EF4444", fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmAndSave}
                disabled={savingMeal}
              >
                {savingMeal ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                    Confirm & Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  imageContainer: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  previewImage: { width: "100%", height: "100%" },
  placeholderBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  actionRow: {
    flexDirection: "row",
    justify: "space-between",
    marginBottom: 20,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "48%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: { fontWeight: "bold", marginLeft: 8 },
  analyzeBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  analyzeBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { borderRadius: 16, padding: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  confidenceBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: { color: "#10B981", fontSize: 11, fontWeight: "bold" },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
  macroCol: { width: "31%" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    alignItems: "center",
  },
  cancelBtn: { padding: 12, marginRight: 12 },
  confirmBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
