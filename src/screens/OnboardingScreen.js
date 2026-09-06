import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/useAuthStore";

export default function OnboardingScreen() {
  const [age, setAge] = useState("45");
  const [gender, setGender] = useState("male");
  const [weight, setWeight] = useState("65");
  const [height, setHeight] = useState("165");
  const [goal, setGoal] = useState("weight_loss");

  const { updateProfile, isLoading } = useAuthStore();

  const handleCalculateAndSave = async () => {
    if (!age || !weight || !height) {
      Alert.alert("Validation Error", "Please fill all required fields.");
      return;
    }

    const numAge = parseInt(age);
    const numWeight = parseFloat(weight);
    const numHeight = parseFloat(height);

    if (isNaN(numAge) || isNaN(numWeight) || isNaN(numHeight)) {
      Alert.alert("Invalid Input", "Please enter valid numeric values.");
      return;
    }

    // 1. Basic BMR / TDEE Macro Calculation
    let bmr = 10 * numWeight + 6.25 * numHeight - 5 * numAge;
    bmr = gender === "male" ? bmr + 5 : bmr - 161;

    let targetCalories = Math.round(bmr * 1.375); // Light activity multiplier

    if (goal === "weight_loss") targetCalories -= 500;
    if (goal === "muscle_gain") targetCalories += 300;

    const profileData = {
      age: numAge,
      gender,
      weight: numWeight,
      height: numHeight,
      fitnessGoal: goal,
      dailyCalorieTarget: targetCalories,
      proteinTarget: Math.round((targetCalories * 0.3) / 4),
      carbsTarget: Math.round((targetCalories * 0.4) / 4),
      fatsTarget: Math.round((targetCalories * 0.3) / 9),
      isOnboarded: true,
    };

    // 2. Call Store API
    const res = await updateProfile(profileData);

    if (!res?.success) {
      Alert.alert(
        "Save Failed",
        res?.message || "Could not save health profile.",
      );
    }
    // 💡 NOTE: Successful save hote hi App.js automatically screen change kar ke HomeScreen render kar dega.
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Health Profile Setup 🎯</Text>
        <Text style={styles.subtitle}>
          Apna daily calorie aur macro target calculate karein
        </Text>

        {/* Age Input */}
        <Text style={styles.label}>Age (Years)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
          placeholder="e.g. 25"
          placeholderTextColor="#666"
        />

        {/* Gender Select */}
        <Text style={styles.label}>Gender</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.optionBtn,
              gender === "male" && styles.selectedOption,
            ]}
            onPress={() => setGender("male")}
          >
            <Text style={styles.optionText}>Male 🧔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionBtn,
              gender === "female" && styles.selectedOption,
            ]}
            onPress={() => setGender("female")}
          >
            <Text style={styles.optionText}>Female 👩</Text>
          </TouchableOpacity>
        </View>

        {/* Weight & Height */}
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
          </View>
        </View>

        {/* Fitness Goal */}
        <Text style={styles.label}>Fitness Goal</Text>
        <TouchableOpacity
          style={[
            styles.goalBtn,
            goal === "weight_loss" && styles.selectedGoal,
          ]}
          onPress={() => setGoal("weight_loss")}
        >
          <Text style={styles.goalText}>Weight Loss 🔥</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.goalBtn, goal === "maintain" && styles.selectedGoal]}
          onPress={() => setGoal("maintain")}
        >
          <Text style={styles.goalText}>Maintain Weight ⚖️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.goalBtn,
            goal === "muscle_gain" && styles.selectedGoal,
          ]}
          onPress={() => setGoal("muscle_gain")}
        >
          <Text style={styles.goalText}>Muscle Gain 💪</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleCalculateAndSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Calculate & Save Target</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  content: { padding: 20 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#AAA",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#FFF",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  row: { flexDirection: "row", gap: 10 },
  flex1: { flex: 1 },
  optionBtn: {
    flex: 1,
    padding: 14,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  selectedOption: { backgroundColor: "#1B382B", borderColor: "#4CAF50" },
  optionText: { color: "#FFF", fontWeight: "bold" },
  goalBtn: {
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  selectedGoal: { backgroundColor: "#1B382B", borderColor: "#4CAF50" },
  goalText: { color: "#FFF", fontWeight: "bold" },
  submitBtn: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
