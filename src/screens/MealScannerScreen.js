import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { isActiveProUser } from "../utils/subscription";
import UpgradeTrialModal from "../components/UpgradeTrialModal";
import { useMealStore } from "../store/useMealStore";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app"}/api`;

export default function MealScannerScreen({ navigation }) {
  const { theme, token: storeToken, user, setUser } = useAuthStore();
  const colors = getThemeColors(theme);
  const isPro = isActiveProUser(user);
  const trialAvailable = !user?.trialUsedAt;
  const fetchDailySummary = useMealStore((state) => state.fetchDailySummary);

  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanStatus, setScanStatus] = useState("");

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
  const [showTrialModal, setShowTrialModal] = useState(false);
  const scanLineProgress = useRef(new Animated.Value(0)).current;
  const barcodeLockRef = useRef(false);

  useEffect(() => {
    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineProgress, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineProgress, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    scanAnimation.start();
    return () => scanAnimation.stop();
  }, [scanLineProgress]);

  const scanCount =
    user?.dailyScanDate === new Date().toISOString().slice(0, 10)
      ? Number(user?.dailyScanCount) || 0
      : 0;
  const scanAllowanceAvailable = isPro || scanCount < 1;

  const getAuthToken = async () => {
    let activeToken = storeToken;
    if (!activeToken) {
      activeToken = await AsyncStorage.getItem("token");
    }
    return activeToken;
  };

  const promptUpgrade = () => {
    setShowTrialModal(true);
  };

  const continueToTrial = () => {
    setShowTrialModal(false);
    navigation.navigate("SubscriptionScreen", {
      startTrial: trialAvailable,
    });
  };

  const pickImage = async (useCamera = false) => {
    if (!scanAllowanceAvailable) {
      promptUpgrade();
      return;
    }

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
    if (!scanAllowanceAvailable) {
      promptUpgrade();
      return;
    }

    if (!imageBase64) {
      Alert.alert(
        "No Image Selected",
        "Please select or capture a food photo first.",
      );
      return;
    }

    setAnalyzing(true);
    setScanStatus("Analyzing your meal…");
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

        // Strict Non-Food Detection
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
            "Invalid Food Image ",
            "This image does not appear to contain edible food. Please scan or select a valid food photo.",
          );
          setModalVisible(false);
          return;
        }

        setFoodName(data.name || data.foodName || "Scanned Meal");
        setCalories(String(data.calories ?? data.kcal ?? 0));
        setProtein(String(data.protein ?? 0));
        setCarbs(String(data.carbs ?? 0));
        setFats(String(data.fats ?? data.fat ?? 0));
        setConfidence(data.confidence || "High");
        if (res.data?.usage) await setUser(res.data.usage);

        setModalVisible(true);
      } else {
        Alert.alert(
          "Analysis Failed",
          "Could not clearly identify food items in the image.",
        );
      }
    } catch (error) {
      console.error("Meal Analysis Error:", error);
      if (error.response?.status === 403 || error.response?.data?.code === "PRO_REQUIRED") {
        promptUpgrade();
      } else {
        Alert.alert(
          "Analysis Error",
          error.response?.data?.message ||
            "Failed to analyze the meal photo. Please try again.",
        );
      }
    } finally {
      setAnalyzing(false);
      setScanStatus("");
    }
  };

  // 2. Barcode Product Lookup using Open Food Facts & AI Fallback
  const fetchProductByBarcode = async (barcode) => {
    setAnalyzing(true);
    setScanStatus("Looking up product details…");
    try {
      const activeToken = await getAuthToken();
      if (!activeToken) {
        Alert.alert(
          "Authentication Error",
          "Session expired. Please log in again.",
        );
        return;
      }

      const allowance = await axios.post(
        `${API_BASE}/meals/scan-allowance`,
        {},
        { headers: { Authorization: `Bearer ${activeToken}` } },
      );
      if (allowance.data?.usage) await setUser(allowance.data.usage);

      const cleanBarcode = String(barcode).trim();

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

        // Comprehensive fallback key checking for macros
        const cal =
          nutriments["energy-kcal_100g"] ||
          nutriments["energy-kcal"] ||
          nutriments["energy-kcal_value"] ||
          nutriments["energy_100g"] ||
          0;

        const prot = nutriments.proteins_100g || nutriments.proteins || 0;
        const carb =
          nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
        const fat = nutriments.fat_100g || nutriments.fat || 0;

        // If Open Food Facts returns zero values, trigger AI estimation fallback
        if (Number(cal) === 0 && Number(prot) === 0 && Number(carb) === 0) {
          const aiRes = await axios.post(
            `${API_BASE}/meals/parse-text`,
            { text: name },
            { headers: { Authorization: `Bearer ${activeToken}` } },
          );
          if (aiRes.data?.success) {
            const aiData = aiRes.data.data;
            setFoodName(name);
            setCalories(String(aiData.calories ?? aiData.kcal ?? 150));
            setProtein(String(aiData.protein ?? 2));
            setCarbs(String(aiData.carbs ?? 30));
            setFats(String(aiData.fats ?? aiData.fat ?? 1));
            setConfidence("High (AI Barcode Estimation)");
            setModalVisible(true);
            return;
          }
        }

        setFoodName(name);
        setCalories(String(Math.round(cal)));
        setProtein(String(Math.round(prot)));
        setCarbs(String(Math.round(carb)));
        setFats(String(Math.round(fat)));
        setConfidence("High (Barcode)");
        setModalVisible(true);
      } else {
        Alert.alert(
          "Product Not Registered ",
          "This barcode isn't fully detailed in the global database. Please take a photo of the food item or nutrition label using Camera/Gallery for AI scanning.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Barcode Fetch Error:", error);
      if (error.response?.status === 403 || error.response?.data?.code === "PRO_REQUIRED") {
        promptUpgrade();
      } else {
        Alert.alert(
          "Barcode Error",
          error.response?.data?.message ||
            "Could not retrieve barcode details. Please try taking a photo instead.",
        );
      }
    } finally {
      setAnalyzing(false);
      setIsScanningBarcode(false);
      setScanStatus("");
      setShowBarcodeScanner(false);
      barcodeLockRef.current = false;
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (barcodeLockRef.current || !data) return;
    barcodeLockRef.current = true;
    setIsScanningBarcode(true);
    fetchProductByBarcode(data);
  };

  const handleOpenBarcodeScanner = async () => {
    if (!scanAllowanceAvailable) {
      promptUpgrade();
      return;
    }

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
    barcodeLockRef.current = false;
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

      // 1. Log meal to daily diary
      await axios.post(`${API_BASE}/meals/log`, payload, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
      });
      await fetchDailySummary(localDate);

      // 2. Automatically save as a recipe / saved meal
      try {
        await axios.post(
          `${API_BASE}/saved-meals`,
          {
            name: foodName.trim(),
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fats: Number(fats) || 0,
          },
          {
            headers: {
              Authorization: `Bearer ${activeToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (recipeErr) {
        console.log("Saved recipe note:", recipeErr.message);
      }

      setModalVisible(false);
      setImageUri(null);
      setImageBase64(null);

      Alert.alert(
        "Meal Saved! ",
        `${foodName} logged into your diary and added to your saved recipes successfully.`,
      );
    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert("Save Error", "Failed to save meal entry to diary.");
    } finally {
      setSavingMeal(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {analyzing && (
          <View
            style={[
              styles.scanProgress,
              { backgroundColor: colors.cardBg, borderColor: colors.primary },
            ]}
            accessibilityRole="progressbar"
            accessibilityLabel={scanStatus}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {scanStatus}
            </Text>
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          AI Scan Meal 
        </Text>
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
          {analyzing && imageUri && (
            <View style={styles.laserOverlay} pointerEvents="none">
              <Animated.View
                style={[
                  styles.laserLine,
                  {
                    transform: [
                      {
                        translateY: scanLineProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 180],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.cameraLoadingBadge}>
                <ActivityIndicator color="#42F5A1" size="small" />
                <Text style={styles.cameraLoadingText}>{scanStatus}</Text>
              </View>
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

        {/* Picker Actions Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[
              styles.gridBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => pickImage(true)}
          >
            <Ionicons name="camera" size={18} color={colors.primary} />
            <Text style={[styles.gridBtnText, { color: colors.text }]}>
              Camera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.gridBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => pickImage(false)}
          >
            <Ionicons name="images" size={18} color={colors.primary} />
            <Text style={[styles.gridBtnText, { color: colors.text }]}>
              Gallery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.gridBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => navigation.navigate("SavedMealsScreen")}
          >
            <Ionicons name="bookmark-outline" size={18} color="#38BDF8" />
            <Text style={[styles.gridBtnText, { color: colors.text }]}>
              Saved Recipes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.gridBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={handleOpenBarcodeScanner}
          >
            <Ionicons name="barcode-outline" size={18} color="#3B82F6" />
            <Text style={[styles.gridBtnText, { color: colors.text }]}>
              Barcode
            </Text>
          </TouchableOpacity>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[
            styles.analyzeBtn,
            { backgroundColor: colors.primary },
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
          {isScanningBarcode && (
            <View style={styles.laserOverlay} pointerEvents="none">
              <Animated.View
                style={[
                  styles.laserLine,
                  {
                    transform: [
                      {
                        translateY: scanLineProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 240],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.cameraLoadingBadge}>
                <ActivityIndicator color="#42F5A1" size="small" />
                <Text style={styles.cameraLoadingText}>
                  Looking up product details…
                </Text>
              </View>
            </View>
          )}
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
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Confirm Nutrition 
              </Text>
              <View
                style={[
                  styles.confidenceBadge,
                  { backgroundColor: colors.glassGlow },
                ]}
              >
                <Text
                  style={[styles.confidenceText, { color: colors.primary }]}
                >
                  {confidence}
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
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
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
      <UpgradeTrialModal
        visible={showTrialModal}
        colors={colors}
        trialAvailable={trialAvailable}
        onClose={() => setShowTrialModal(false)}
        onContinue={continueToTrial}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  laserOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  laserLine: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: "#42F5A1",
    shadowColor: "#42F5A1",
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  cameraLoadingBadge: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "rgba(11,15,25,0.88)",
    borderColor: "rgba(66,245,161,0.7)",
    borderWidth: 1,
  },
  cameraLoadingText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  scanProgress: {
    minHeight: 76,
    marginBottom: 16,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#42F5A1",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 5,
  },
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
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 16,
    gap: 10,
  },
  gridBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "48%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gridBtnText: { fontWeight: "bold", marginLeft: 6, fontSize: 13 },
  analyzeBtn: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
  modalCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: { fontSize: 11, fontWeight: "bold" },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});
