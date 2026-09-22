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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMealStore } from "../store/useMealStore";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

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

  const [aiLoading, setAiLoading] = useState(false);

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

    const res = await logMeal({
      name: name.trim(),
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
    });

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
        {/* Header with Back Button */}
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

        {/* Input Fields */}
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
          style={styles.aiButton}
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
          style={styles.saveButton}
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
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 12,
  },
  title: { fontSize: 22, fontWeight: "bold" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  aiButton: {
    backgroundColor: "#2563EB",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  aiBtnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
