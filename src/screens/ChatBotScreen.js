import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import ChatMessageItemModule from "./ChatMessageItem";
import { useAuthStore } from "../store/useAuthStore";
import CustomAppLoader from "../components/CustomAppLoader";
import { getThemeColors } from "../theme/colors";

// Resolution for ChatMessageItem component
const ChatMessageItem =
  ChatMessageItemModule?.default ||
  ChatMessageItemModule?.ChatMessageItem ||
  ChatMessageItemModule;

// Dynamic Message Bubble UI supporting both Light & Dark modes
const DefaultMessageBubble = ({ item, colors }) => {
  const isUser = item.sender === "user" || item.role === "user";
  const messageText = item.text || item.message || item.content || "";

  return (
    <View
      style={[
        bubbleStyles.container,
        isUser
          ? bubbleStyles.userContainer
          : [
              bubbleStyles.botContainer,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.border || "#334155",
                borderWidth: 1,
              },
            ],
      ]}
    >
      <Text
        style={[bubbleStyles.text, { color: isUser ? "#FFFFFF" : colors.text }]}
      >
        {messageText}
      </Text>
    </View>
  );
};

const renderMessageItem = (item, colors) => {
  if (typeof ChatMessageItemModule?.renderMessage === "function") {
    const rendered = ChatMessageItemModule.renderMessage(item, colors);
    if (rendered) return rendered;
  }
  if (
    typeof ChatMessageItem === "function" ||
    (typeof ChatMessageItem === "object" && ChatMessageItem !== null)
  ) {
    return <ChatMessageItem item={item} message={item} colors={colors} />;
  }
  return <DefaultMessageBubble item={item} colors={colors} />;
};

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app"}/api`;

const ChatBotScreen = () => {
  const { user, theme } = useAuthStore();
  const colors = getThemeColors(theme);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);

  const flatListRef = useRef(null);
  const currentUserId = user?._id || user?.id;

  const getToken = async () => {
    try {
      const storeToken =
        typeof useAuthStore?.getState === "function"
          ? useAuthStore.getState()?.token
          : null;
      if (storeToken) return storeToken;
      return await AsyncStorage.getItem("token");
    } catch (error) {
      return await AsyncStorage.getItem("token");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const fetchHistory = async () => {
    try {
      setFetchingHistory(true);
      const token = await getToken();

      if (!token) return;

      const rawUrl =
        process.env.EXPO_PUBLIC_API_URL ||
        "https://nutrimorph-backend.vercel.app";
      const cleanBase = rawUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
      const targetUrl = `${cleanBase}/api/chat/history`;

      const res = await axios.get(targetUrl, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      let historyData = [];
      if (Array.isArray(res.data)) {
        historyData = res.data;
      } else if (Array.isArray(res.data?.history)) {
        historyData = res.data.history;
      } else if (Array.isArray(res.data?.messages)) {
        historyData = res.data.messages;
      }

      setMessages(historyData);
      scrollToBottom();
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setFetchingHistory(false);
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || loading) return;

    const token = await getToken();
    if (!token) {
      Alert.alert("Session Expired", "Please login again to continue.");
      return;
    }

    const payload = {
      userId: currentUserId,
      message: textToSend,
      model: "gemini-3.5-flash-lite",
    };

    // Immediate user message append
    const userMsg = {
      _id: `user-${Date.now()}`,
      sender: "user",
      role: "user",
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await axios.post(`${API_BASE}/chat`, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data?.success) {
        const botMsg = {
          _id: `bot-${Date.now()}`,
          sender: "bot",
          role: "bot",
          text: res.data.reply || res.data.response,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else if (res.data?.limitReached || res.data?.reply) {
        const limitMsg = {
          _id: `bot-limit-${Date.now()}`,
          sender: "bot",
          role: "bot",
          text: res.data.reply || res.data.message,
        };
        setMessages((prev) => [...prev, limitMsg]);
      } else {
        const fallbackMsg = {
          _id: `bot-err-${Date.now()}`,
          sender: "bot",
          role: "bot",
          text: res.data?.message || "An unexpected error occurred.",
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
      scrollToBottom();
    } catch (error) {
      const errorData = error.response?.data;
      const status = error.response?.status;

      if (status === 403 || errorData?.limitReached) {
        const limitMessageText =
          errorData?.message ||
          "Your daily limit of 5 free messages has been reached. Upgrade to the Pro plan for unlimited messaging!";

        const limitBotMsg = {
          _id: `bot-limit-${Date.now()}`,
          sender: "bot",
          role: "bot",
          text: limitMessageText,
        };
        setMessages((prev) => [...prev, limitBotMsg]);
      } else {
        const genericErrorMessage =
          errorData?.message ||
          "Unable to connect to the backend server. Please check your internet connection.";

        const errorBotMsg = {
          _id: `bot-err-${Date.now()}`,
          sender: "bot",
          role: "bot",
          text: genericErrorMessage,
        };
        setMessages((prev) => [...prev, errorBotMsg]);
      }
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[screenStyles.safeArea, { backgroundColor: colors.bg }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={screenStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View
          style={[
            screenStyles.header,
            {
              backgroundColor: colors.cardBg,
              borderBottomColor: colors.border || "#334155",
            },
          ]}
        >
          <Text style={[screenStyles.headerTitle, { color: colors.text }]}>
            NutriBot Assistant
          </Text>
        </View>

        {/* Chat History / Loader */}
        {fetchingHistory ? (
          <View style={screenStyles.loaderContainer}>
            <CustomAppLoader size={70} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) =>
              item._id || item.id || `chat-msg-${index}`
            }
            renderItem={({ item }) => renderMessageItem(item, colors)}
            contentContainerStyle={screenStyles.listPadding}
            onContentSizeChange={scrollToBottom}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}

        {/* Bot Response Loader */}
        {loading && (
          <View style={screenStyles.bottomLoader}>
            <CustomAppLoader size={38} />
          </View>
        )}

        {/* Input Bar */}
        <View
          style={[
            screenStyles.inputContainer,
            {
              backgroundColor: colors.cardBg,
              borderTopColor: colors.border || "#334155",
            },
          ]}
        >
          <TextInput
            style={[
              screenStyles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.text,
              },
            ]}
            placeholder="Ask about diet, macros, or recipes..."
            placeholderTextColor={colors.textSecondary || "#94A3B8"}
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

const bubbleStyles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 16,
    marginVertical: 6,
    maxWidth: "82%",
  },
  userContainer: {
    backgroundColor: "#10B981", // Vibrant Green Accent for User Messages
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  botContainer: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});

const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  bottomLoader: {
    paddingVertical: 6,
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 14 : 10,
    alignItems: "center",
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
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
