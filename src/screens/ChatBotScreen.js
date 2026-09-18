import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { renderMessage } from "./ChatMessageItem";
import { useAuthStore } from "../store/useAuthStore";

const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app"}/api`;

const ChatBotScreen = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);

  const flatListRef = useRef(null);
  const currentUserId = user?._id || user?.id;

  const getToken = async () => {
    const token = useAuthStore.getState().token;
    if (token) return token;
    return await AsyncStorage.getItem("token");
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const fetchHistory = async () => {
    try {
      const token = await getToken();
      if (!currentUserId || !token) {
        setFetchingHistory(false);
        return;
      }

      const res = await axios.get(`${BASE_URL}/chat/${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && res.data?.history) {
        setMessages(res.data.history);
        scrollToBottom();
      }
    } catch (error) {
      console.error(
        "Fetch History Error:",
        error.response?.data || error.message,
      );
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || loading) return;

    const token = await getToken();
    if (!token) {
      Alert.alert("Error", "Session expired. Dobara login karein.");
      return;
    }

    const payload = {
      userId: currentUserId,
      message: textToSend,
      model: "gemini-3.5-flash-lite",
    };

    const userMsg = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await axios.post(`${BASE_URL}/chat`, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data?.success) {
        const botMsg = { sender: "bot", text: res.data.reply };
        setMessages((prev) => [...prev, botMsg]);
        scrollToBottom();
      } else {
        Alert.alert("Error", res.data?.message || "Server error.");
      }
    } catch (error) {
      console.error("Send Error:", error.response?.data || error.message);
      Alert.alert("Error", "Backend server connection mein masla aaya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={screenStyles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={screenStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={screenStyles.header}>
          <Text style={screenStyles.headerTitle}>NutriBot Assistant</Text>
        </View>

        {fetchingHistory ? (
          <ActivityIndicator
            size="large"
            color="#10B981"
            style={{ flex: 1, justifyContent: "center" }}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => renderMessage(item)}
            contentContainerStyle={screenStyles.listPadding}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {loading && (
          <ActivityIndicator
            size="small"
            color="#10B981"
            style={{ marginBottom: 8 }}
          />
        )}

        {/* Input Bar */}
        <View style={screenStyles.inputContainer}>
          <TextInput
            style={screenStyles.input}
            placeholder="Ask about diet, macros, or recipes..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              screenStyles.sendButton,
              (!inputText.trim() || loading) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <Text style={screenStyles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 14 : 10,
    backgroundColor: "#1E293B",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    backgroundColor: "#334155",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});

export default ChatBotScreen;
