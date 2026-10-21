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
  // Wizard Steps State (Total 9 Steps)
  const [currentStep, setCurrentStep] = useState(1);

  // Form Data States
  const [language, setLanguage] = useState("English");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [dob, setDob] = useState("2000-01-01");
  const [age, setAge] = useState("25");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("170");
  const [targetWeight, setTargetWeight] = useState("65");
  const [goal, setGoal] = useState("weight_loss");
  const [activityLevel, setActivityLevel] = useState("Lightly active");
  const [preferredMealsCount, setPreferredMealsCount] = useState(4);

  const { updateProfile, isLoading } = useAuthStore();

  const handleNextStep = () => {
    // Validation checks for specific steps if necessary
    if (currentStep === 2 && !name.trim()) {
      Alert.alert("Validation Error", "Please enter your name.");
      return;
    }
    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCalculateAndSave();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCalculateAndSave = async () => {
    if (!age || !weight || !height) {
      Alert.alert(
        "Validation Error",
        "Please fill all required health fields.",
      );
      return;
    }

    const numAge = parseInt(age);
    const numWeight = parseFloat(weight);
    const numHeight = parseFloat(height);
    const numTargetWeight = parseFloat(targetWeight);

    if (isNaN(numAge) || isNaN(numWeight) || isNaN(numHeight)) {
      Alert.alert("Invalid Input", "Please enter valid numeric values.");
      return;
    }

    // 1. Basic BMR / TDEE Macro Calculation (Mifflin-St Jeor formula)
    let bmr = 10 * numWeight + 6.25 * numHeight - 5 * numAge;
    bmr = gender === "male" ? bmr + 5 : bmr - 161;

    let targetCalories = Math.round(bmr * 1.375); // Default activity multiplier

    if (goal === "weight_loss") targetCalories -= 500;
    else if (goal === "muscle_gain") targetCalories += 300;

    const profileData = {
      language,
      name,
      age: numAge,
      gender,
      weight: numWeight,
      height: numHeight,
      targetWeight: numTargetWeight,
      fitnessGoal: goal,
      activityLevel,
      preferredMealsCount,
      dailyCalorieTarget: targetCalories,
      proteinTarget: Math.round((targetCalories * 0.3) / 4),
      carbsTarget: Math.round((targetCalories * 0.4) / 4),
      fatsTarget: Math.round((targetCalories * 0.3) / 9),
      isOnboarded: true,
      isOnboardingCompleted: true,
    };

    // 2. Call Store API
    const res = await updateProfile(profileData);

    if (!res?.success) {
      Alert.alert(
        "Save Failed",
        res?.message || "Could not save health profile.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar Header */}
      <View style={styles.progressContainer}>
        {Array.from({ length: 9 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBarSegment,
              index + 1 <= currentStep
                ? styles.activeSegment
                : styles.inactiveSegment,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 1: Language Selection */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.title}>Select Language 🌍</Text>
            <Text style={styles.subtitle}>Choose your preferred language</Text>
            {["English", "Urdu", "Turkish", "Arabic"].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.optionBtn,
                  language === lang && styles.selectedOption,
                ]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={styles.optionText}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: User Name */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.title}>What's Your Name? 👤</Text>
            <Text style={styles.subtitle}>
              Let us personalize your experience
            </Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Salma Shahid"
              placeholderTextColor="#666"
            />
          </View>
        )}

        {/* Step 3: Gender Selection */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.title}>How Do You Identify? 🧬</Text>
            <Text style={styles.subtitle}>
              Used to calculate your precise BMR
            </Text>
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
          </View>
        )}

        {/* Step 4: Age / Birthday */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.title}>How Old Are You? 🎂</Text>
            <Text style={styles.subtitle}>Enter your age in years</Text>
            <Text style={styles.label}>Age (Years)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 25"
              placeholderTextColor="#666"
            />
          </View>
        )}

        {/* Step 5: Height */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.title}>How Tall Are You? 📏</Text>
            <Text style={styles.subtitle}>Enter your height</Text>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 170"
              placeholderTextColor="#666"
            />
          </View>
        )}

        {/* Step 6: Weight & Target Weight */}
        {currentStep === 6 && (
          <View>
            <Text style={styles.title}>Weight Goals ⚖️</Text>
            <Text style={styles.subtitle}>
              Track your current and target weight
            </Text>
            <Text style={styles.label}>Current Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              placeholderTextColor="#666"
            />
            <Text style={styles.label}>Target Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholderTextColor="#666"
            />
          </View>
        )}

        {/* Step 7: Fitness Goal */}
        {currentStep === 7 && (
          <View>
            <Text style={styles.title}>What's Your Fitness Goal? 🎯</Text>
            <Text style={styles.subtitle}>Select your primary target</Text>
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
              style={[
                styles.goalBtn,
                goal === "maintain" && styles.selectedGoal,
              ]}
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
          </View>
        )}

        {/* Step 8: Activity Level */}
        {currentStep === 8 && (
          <View>
            <Text style={styles.title}>Activity Level 🏃‍♀️</Text>
            <Text style={styles.subtitle}>
              How active is your daily routine?
            </Text>
            {["Not very active", "Lightly active", "Active", "Very active"].map(
              (act) => (
                <TouchableOpacity
                  key={act}
                  style={[
                    styles.goalBtn,
                    activityLevel === act && styles.selectedGoal,
                  ]}
                  onPress={() => setActivityLevel(act)}
                >
                  <Text style={styles.goalText}>{act}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        )}

        {/* Step 9: Meal Preferences */}
        {currentStep === 9 && (
          <View>
            <Text style={styles.title}>Daily Meal Routine 🍽️</Text>
            <Text style={styles.subtitle}>
              How many meals do you prefer daily?
            </Text>
            {[3, 4, 5].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.goalBtn,
                  preferredMealsCount === count && styles.selectedGoal,
                ]}
                onPress={() => setPreferredMealsCount(count)}
              >
                <Text style={styles.goalText}>{count} Meals / Day</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Navigation Buttons Row */}
        <View style={styles.navRow}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={handlePrevStep}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, currentStep === 1 && { flex: 1 }]}
            onPress={handleNextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {currentStep === 9 ? "Calculate & Save Target" : "Continue"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 15,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  activeSegment: { backgroundColor: "#4CAF50" },
  inactiveSegment: { backgroundColor: "#333" },
  content: { padding: 20 },
  title: {
    fontSize: 24,
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
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  selectedOption: { backgroundColor: "#1B382B", borderColor: "#4CAF50" },
  optionText: { color: "#FFF", fontWeight: "bold" },
  goalBtn: {
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  selectedGoal: { backgroundColor: "#1B382B", borderColor: "#4CAF50" },
  goalText: { color: "#FFF", fontWeight: "bold" },
  navRow: { flexDirection: "row", gap: 10, marginTop: 25 },
  backBtn: {
    flex: 1,
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  backBtnText: { color: "#AAA", fontSize: 16, fontWeight: "bold" },
  submitBtn: {
    flex: 2,
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
