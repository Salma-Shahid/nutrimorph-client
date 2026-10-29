import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  View,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMealStore } from "../store/useMealStore";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Late-night"];

export default function LogFoodScreen({ navigation, route }) {
  const initialData = route.params?.initialData || {};
  const { logMeal, analyzeTextMeal, isLoading } = useMealStore();
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);

  const [name, setName] = useState(initialData.name || "");
  const [calories, setCalories] = useState(
    initialData.calories ? String(initialData.calories) : "",
  );
  const [protein, setProtein] = useState(
    initialData.protein ? String(initialData.protein) : "",
  );
  const [carbs, setCarbs] = useState(
    initialData.carbs ? String(initialData.carbs) : "",
  );
  const [fats, setFats] = useState(
    initialData.fats ? String(initialData.fats) : "",
  );

  const [mealType, setMealType] = useState("Lunch");
  const [imageUri, setImageUri] = useState(initialData.image || null);
  const [aiLoading, setAiLoading] = useState(false);

  // 🟢 Image Picker Handler
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // AI Auto-Fill Handler
  const handleAiAutoFill = async () => {
    if (!name.trim()) {
      Alert.alert("Input Required", "Please enter the food item name.");
      return;
    }

    setAiLoading(true);
    const res = await analyzeTextMeal(name);
    setAiLoading(false);

    if (res?.success && res?.data) {
      setCalories(String(res.data.calories ?? 0));
      setProtein(String(res.data.protein ?? 0));
      setCarbs(String(res.data.carbs ?? 0));
      setFats(String(res.data.fats ?? 0));
    } else {
      Alert.alert(
        "AI Error",
        res?.message || "Failed to fetch nutrition details.",
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !calories) {
      Alert.alert("Error", "Please enter Food name and calories.");
      return;
    }

    // FormData use hoga agar image bhi bhejni ho backend par
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("calories", Number(calories));
    formData.append("protein", Number(protein) || 0);
    formData.append("carbs", Number(carbs) || 0);
    formData.append("fats", Number(fats) || 0);
    formData.append("mealType", mealType);

    if (imageUri) {
      const filename = imageUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("image", {
        uri: imageUri,
        name: filename || "meal.jpg",
        type,
      });
    }

    const res = await logMeal(formData, true); // True indicating multipart/form-data if store supports it

    if (res?.success) {
      Alert.alert("Success 🎉", "Meal is successfully logged!");
      navigation.goBack();
    } else {
      Alert.alert("Error", res?.message || "Failed to log meal.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Glass Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Log Food Item 📝
          </Text>
        </View>

        {/* 🟢 Meal Image Picker Section */}
        <TouchableOpacity
          style={[
            styles.imagePickerCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
          onPress={pickImage}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="camera-outline"
                size={28}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.imagePickerText,
                  { color: colors.textSecondary },
                ]}
              >
                Tap to attach meal photo 📸
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Food Name Input */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Food Name
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
          placeholder="e.g. Chicken Biryani / Salad"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        {/* AI Auto-Fill Action Button */}
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.primary }]}
          onPress={handleAiAutoFill}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.aiBtnRow}>
              <Ionicons
                name="sparkles"
                size={16}
                color="#FFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.aiBtnText}>Auto-Fill Macros with AI</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Meal Type Selector Section */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Meal Type
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 16 }}
        >
          {MEAL_TYPES.map((type) => {
            const isSelected = mealType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.inputBg,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMealType(type)}
              >
                <Text
                  style={{
                    color: isSelected ? "#FFF" : colors.textSecondary,
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Calories (kcal)
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
          placeholder="e.g. 450"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={calories}
          onChangeText={setCalories}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
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
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
          </View>

          <View style={styles.halfInput}>
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
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={carbs}
              onChangeText={setCarbs}
            />
          </View>
        </View>

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
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={fats}
          onChangeText={setFats}
        />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save Meal</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  title: { fontSize: 22, fontWeight: "bold" },
  imagePickerCard: {
    height: 130,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  mealTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  aiButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  aiBtnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
