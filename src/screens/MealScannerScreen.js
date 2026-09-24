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
import { CameraView, useCameraPermissions } from "expo-camera";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app"}/api`;

export default function MealScannerScreen({ navigation }) {
  const { theme, token: storeToken } = useAuthStore();
  const colors = getThemeColors(theme);

  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Barcode Camera Modal & Lock States
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Modal & Draft State
  const [modalVisible, setModalVisible] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [confidence, setConfidence] = useState("High");
  const [savingMeal, setSavingMeal] = useState(false);

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
        "Camera and media library permissions are required to analyze food photos.",
      );
      return;
    }

    const options = {
      mediaTypes: ["images"],
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

  // 1. AI Image Analysis with Strict Non-Food Prevention
  const handleAnalyzePhoto = async () => {
    if (!imageBase64) {
      Alert.alert(
        "No Image Selected",
        "Please select or capture a food photo first.",
      );
      return;
    }

    setAnalyzing(true);
    try {
      const activeToken = await getAuthToken();
      if (!activeToken) {
        Alert.alert(
          "Authentication Error",
          "Session expired. Please log in again.",
        );
        setAnalyzing(false);
        return;
      }

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
        const nameLower = (data.name || data.foodName || "").toLowerCase();

        // Strict Non-Food Detection: Do not open modal or allow logging if non-food item
        const isNonFood =
          data.isFood === false ||
          data.isFood === "false" ||
          nameLower.includes("non-food") ||
          nameLower.includes("fabric") ||
          nameLower.includes("flower") ||
          nameLower.includes("object") ||
          nameLower.includes("not food") ||
          (Number(data.calories) === 0 &&
            Number(data.protein) === 0 &&
            Number(data.carbs) === 0 &&
            Number(data.fats) === 0);

        if (isNonFood) {
          Alert.alert(
            "Invalid Food Image 🚫",
            "This image does not appear to contain edible food. Please scan or select a valid food photo.",
          );
          setModalVisible(false);
          return;
        }

        setFoodName(data.name || data.foodName || "Scanned Meal");
        setCalories(String(data.calories || 0));
        setProtein(String(data.protein || 0));
        setCarbs(String(data.carbs || 0));
        setFats(String(data.fats || 0));
        setConfidence(data.confidence || "High");

        setModalVisible(true);
      } else {
        Alert.alert(
          "Analysis Failed",
          "Could not clearly identify food items in the image.",
        );
      }
    } catch (error) {
      console.error("Meal Analysis Error:", error);
      Alert.alert(
        "Analysis Error",
        "Failed to analyze meal photo. Please try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // 2. Barcode Product Lookup using Open Food Facts API (Fixed 404 & Lock)
  const fetchProductByBarcode = async (barcode) => {
    setShowBarcodeScanner(false);
    setAnalyzing(true);
    try {
      const cleanBarcode = String(barcode).trim();

      // 1. Try Open Food Facts API first
      const response = await axios.get(
        `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
        { validateStatus: (status) => status < 500, timeout: 6000 },
      );

      if (response.status === 200 && response.data?.status === 1) {
        const product = response.data.product || {};
        const nutriments = product.nutriments || {};

        const name =
          product.product_name ||
          product.product_name_en ||
          product.brands ||
          "Packaged Food";
        const cal =
          nutriments["energy-kcal_100g"] ||
          nutriments["energy-kcal"] ||
          nutriments["energy-kcal_value"] ||
          0;
        const prot = nutriments.proteins_100g || nutriments.proteins || 0;
        const carb =
          nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
        const fat = nutriments.fat_100g || nutriments.fat || 0;

        setFoodName(name);
        setCalories(String(Math.round(cal)));
        setProtein(String(Math.round(prot)));
        setCarbs(String(Math.round(carb)));
        setFats(String(Math.round(fat)));
        setConfidence("High (Barcode)");
        setModalVisible(true);
      } else {
        // 2. 🟢 Fallback Alert: Offer user to use AI photo scan or manual entry
        Alert.alert(
          "Product Not Registered 🔍",
          "This barcode isn't in the global database yet. Please take a photo of the food item or nutrition label using Camera/Gallery for AI scanning.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Barcode Fetch Error:", error);
      Alert.alert(
        "Barcode Error",
        "Could not retrieve barcode details. Please try taking a photo instead.",
      );
    } finally {
      setAnalyzing(false);
      setIsScanningBarcode(false);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (isScanningBarcode || !data) return;
    setIsScanningBarcode(true);
    fetchProductByBarcode(data);
  };

  const handleOpenBarcodeScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to scan barcodes.",
        );
        return;
      }
    }
    setIsScanningBarcode(false);
    setShowBarcodeScanner(true);
  };

  const handleConfirmAndSave = async () => {
    if (!foodName.trim() || !calories.trim()) {
      Alert.alert(
        "Missing Details",
        "Please provide at least a food item name and calorie count.",
      );
      return;
    }

    setSavingMeal(true);
    try {
      const activeToken = await getAuthToken();
      const localDate = new Date().toLocaleDateString("en-CA");

      const payload = {
        name: foodName.trim(),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fats: Number(fats) || 0,
        date: localDate,
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
      Alert.alert("Save Error", "Failed to save meal entry to diary.");
    } finally {
      setSavingMeal(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>AI Scan Meal</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Take or upload a food photo, or scan a packaged product barcode.
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

        {/* Reset Photo Button */}
        {imageUri && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setImageUri(null);
              setImageBase64(null);
            }}
          >
            <Ionicons
              name="refresh"
              size={16}
              color="#FFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.resetText}>Reset Photo</Text>
          </TouchableOpacity>
        )}

        {/* Picker Actions: Camera, Gallery, Barcode */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.pickerBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => pickImage(true)}
          >
            <Ionicons name="camera" size={18} color="#10B981" />
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
            <Ionicons name="images" size={18} color="#10B981" />
            <Text style={[styles.pickerText, { color: colors.text }]}>
              Gallery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pickerBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={handleOpenBarcodeScanner}
          >
            <Ionicons name="barcode-outline" size={18} color="#3B82F6" />
            <Text style={[styles.pickerText, { color: colors.text }]}>
              Barcode
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

      {/* Barcode Scanner Modal */}
      <Modal visible={showBarcodeScanner} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
            }}
          />
          <TouchableOpacity
            style={styles.closeBarcodeBtn}
            onPress={() => setShowBarcodeScanner(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Confirmation & Editing Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Confirm Nutrition
              </Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{confidence}</Text>
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
    marginBottom: 16,
  },
  imageContainer: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  placeholderBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  resetButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  resetText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "31%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: { fontWeight: "bold", marginLeft: 4, fontSize: 12 },
  analyzeBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  analyzeBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  closeBarcodeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 25,
  },
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
