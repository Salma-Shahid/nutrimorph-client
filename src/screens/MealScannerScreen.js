import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useMealStore } from "../store/useMealStore";
import { useAuthStore } from "../store/useAuthStore";

const MealScannerScreen = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);
  const { scanMealImage, isLoading } = useMealStore();

  // Consume global user state and theme
  const { user, theme } = useAuthStore();
  const isDark = theme === "dark";

  // Dynamic color palette
  const colors = {
    bg: isDark ? "#121212" : "#F8FAFC",
    cardBg: isDark ? "#1E1E1E" : "#E2E8F0",
    text: isDark ? "#FFFFFF" : "#0F172A",
    subText: isDark ? "#888888" : "#64748B",
    primary: "#4CAF50",
    secondaryBtn: isDark ? "#333333" : "#CBD5E1",
    secondaryBtnText: isDark ? "#FFFFFF" : "#0F172A",
  };

  const handleScanTrigger = (useCamera = false) => {
    // 🔒 Pro Feature Guard Check
    if (user?.subscriptionTier !== "pro") {
      Alert.alert(
        "⭐ Pro Feature Required",
        "Instant Camera Meal Scanner is available exclusively for Pro plan subscribers.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade to Pro 🚀",
            onPress: () => navigation?.navigate("SubscriptionScreen"),
          },
        ],
      );
      return;
    }

    pickImage(useCamera);
  };

  const pickImage = async (useCamera = false) => {
    let result;
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    };

    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert("Permission Needed", "Camera access is required.");
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if(!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      processImage(result.assets[0].base64);
    }
  };

  const processImage = async (base64) => {
    const res = await scanMealImage(base64);
    if (res?.success) {
      navigation?.navigate("LogFoodScreen", { initialData: res.data });
    } else {
      Alert.alert("Scan Failed", res?.message || "Could not analyze image.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        AI Meal Scanner 📸
      </Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.cardBg }]}>
          <Text style={{ color: colors.subText }}>
            Take a photo or pick from gallery
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 10 }}>
            Analyzing food with AI...
          </Text>
        </View>
      ) : (
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => handleScanTrigger(true)}
          >
            <Text style={styles.btnText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.secondaryBtn }]}
            onPress={() => handleScanTrigger(false)}
          >
            <Text style={[styles.btnText, { color: colors.secondaryBtnText }]}>
              🖼️ Gallery
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  preview: {
    width: "100%",
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
  },
  placeholder: {
    width: "100%",
    height: 300,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  loadingBox: {
    alignItems: "center",
    marginVertical: 20,
  },
});

export default MealScannerScreen;
