import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMealStore } from "../store/useMealStore";

export default function LogFoodScreen({ navigation, route }) {
  const initialData = route.params?.initialData || {};
  const { logMeal, analyzeTextMeal, isLoading } = useMealStore();

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
      Alert.alert("Input Required", "Pehle food item ka naam enter karein.");
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
        res?.message || "Nutrition details fetch nahi ho sakein.",
      );
    }
  };

  const handleSave = async () => {
    if (!name || !calories) {
      Alert.alert("Error", "Food name aur calories enter karein.");
      return;
    }

    const res = await logMeal({
      name,
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
    });

    if (res.success) {
      Alert.alert("Success", "Meal log ho chuki hai!");
      navigation.goBack();
    } else {
      Alert.alert("Error", res.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Log Food Item 📝</Text>

      <TextInput
        style={styles.input}
        placeholder="Food Name (e.g. Biryani)"
        placeholderTextColor="#888"
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
          <Text style={styles.aiBtnText}>Auto-Fill Macros with AI ✨</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Calories (kcal)"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={calories}
        onChangeText={setCalories}
      />
      <TextInput
        style={styles.input}
        placeholder="Protein (g)"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={protein}
        onChangeText={setProtein}
      />
      <TextInput
        style={styles.input}
        placeholder="Carbs (g)"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={carbs}
        onChangeText={setCarbs}
      />
      <TextInput
        style={styles.input}
        placeholder="Fats (g)"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={fats}
        onChangeText={setFats}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Save Meal</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  aiButton: {
    backgroundColor: "#2563EB",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  aiBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
