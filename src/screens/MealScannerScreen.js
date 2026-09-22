import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/useAuthStore";
import { useMealStore } from "../store/useMealStore";
import { getThemeColors } from "../theme/colors";

export default function ScanMealScreen({ navigation }) {
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);

  const { scanMealImage, logMeal } = useMealStore();

  const [imageUri, setImageUri] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  // Clear / Reset State Function
  const handleReset = () => {
    setImageUri(null);
    setBase64Image(null);
    setScannedData(null);
    setIsScanning(false);
    setIsLogging(false);
  };

  const pickImage = async (useCamera = false) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access camera/gallery is needed.",
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.6,
          })
        : await ImagePicker.launchImageLibraryAsync({
            base64: true,
            quality: 0.6,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setBase64Image(asset.base64);
        setScannedData(null);
      }
    } catch (error) {
      Alert.alert("Error", "Could not select image.");
    }
  };

  const handleScanImage = async () => {
    if (!base64Image) {
      Alert.alert("No Image", "Please capture or select an image first.");
      return;
    }

    setIsScanning(true);
    const result = await scanMealImage(base64Image);
    setIsScanning(false);

    if (result.success) {
      setScannedData(result.data);
    } else {
      if (result.isProRequired) {
        Alert.alert(
          "Pro Feature",
          "AI Scanning is available for Pro users only.",
        );
      } else {
        Alert.alert(
          "Scan Failed",
          result.message || "Failed to analyze image.",
        );
      }
    }
  };

  const handleSaveMeal = async () => {
    if (!scannedData) return;
    setIsLogging(true);

    const res = await logMeal({
      name: scannedData.name || "Scanned Food",
      calories: scannedData.calories || 0,
      protein: scannedData.protein || 0,
      carbs: scannedData.carbs || 0,
      fats: scannedData.fats || 0,
    });

    setIsLogging(false);

    if (res.success) {
      Alert.alert("Success", "Meal logged successfully!", [
        {
          text: "OK",
          onPress: () => {
            handleReset();
            navigation.navigate("Dashboard");
          },
        },
      ]);
    } else {
      Alert.alert("Error", res.message || "Failed to log meal.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 🔙 Navigation Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            handleReset();
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Scan Meal
        </Text>
        <TouchableOpacity onPress={handleReset}>
          <Ionicons name="refresh-outline" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Preview Area */}
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name="camera-outline"
                size={50}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.placeholderText,
                  { color: colors.textSecondary },
                ]}
              >
                Select or capture a food photo
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons for Image Picker */}
        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: "#3B82F6" }]}
            onPress={() => pickImage(true)}
          >
            <Ionicons name="camera" size={18} color="#FFF" />
            <Text style={styles.pickerBtnText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: "#6366F1" }]}
            onPress={() => pickImage(false)}
          >
            <Ionicons name="images" size={18} color="#FFF" />
            <Text style={styles.pickerBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* AI Scan Trigger Button */}
        {imageUri && !scannedData && (
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: "#10B981" }]}
            onPress={handleScanImage}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#FFF" />
                <Text style={styles.scanBtnText}>Analyze Food</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* 🥗 Scanned Result Display & Reset Option */}
        {scannedData && (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.foodTitle, { color: colors.text }]}>
              {scannedData.name}
            </Text>

            <View style={styles.macroGrid}>
              <View style={styles.macroBox}>
                <Text style={{ color: "#10B981", fontWeight: "bold" }}>
                  {scannedData.calories}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Calories
                </Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={{ color: "#3B82F6", fontWeight: "bold" }}>
                  {scannedData.protein}g
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Protein
                </Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={{ color: "#F59E0B", fontWeight: "bold" }}>
                  {scannedData.carbs}g
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Carbs
                </Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={{ color: "#EF4444", fontWeight: "bold" }}>
                  {scannedData.fats}g
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Fats
                </Text>
              </View>
            </View>

            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: "#10B981", flex: 1, marginRight: 8 },
                ]}
                onPress={handleSaveMeal}
                disabled={isLogging}
              >
                {isLogging ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Log to Daily Tracker</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: "#64748B", paddingHorizontal: 12 },
                ]}
                onPress={handleReset}
              >
                <Ionicons name="refresh" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  scrollContent: { padding: 20 },
  imageContainer: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  previewImage: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center" },
  placeholderText: { marginTop: 8, fontSize: 13 },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pickerBtn: {
    width: "48%",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerBtnText: { color: "#FFF", fontWeight: "bold", marginLeft: 6 },
  scanBtn: {
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  scanBtnText: { color: "#FFF", fontWeight: "bold", marginLeft: 8 },
  resultCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginTop: 10 },
  foodTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  macroBox: { alignItems: "center" },
  btnGroup: { flexDirection: "row", marginTop: 10 },
  saveBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold" },
});
