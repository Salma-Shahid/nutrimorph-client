import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Markdown from "react-native-markdown-display";
import { Ionicons } from "@expo/vector-icons";

import ChatMessageItemModule from "./ChatMessageItem";
import { useAuthStore } from "../store/useAuthStore";
import CustomAppLoader from "../components/CustomAppLoader";
import { getThemeColors } from "../theme/colors";

// Resolution for ChatMessageItem component
const ChatMessageItem =
  ChatMessageItemModule?.default ||
  ChatMessageItemModule?.ChatMessageItem ||
  ChatMessageItemModule;

// Dynamic Message Bubble UI supporting Markdown for Bot & Plain Text for User
const DefaultMessageBubble = ({ item, colors }) => {
  const isUser = item.sender === "user" || item.role === "user";
  const messageText = item.text || item.message || item.content || "";

  if (isUser) {
    return (
      <View
        style={[
          bubbleStyles.container,
          bubbleStyles.userContainer,
          { backgroundColor: colors.primary },
        ]}
      >
        <Text style={[bubbleStyles.text, { color: "#FFFFFF" }]}>
          {messageText}
        </Text>
      </View>
    );
  }

  // Dynamic Markdown Styles according to Theme Colors
  const markdownStyles = {
    body: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },
    heading3: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 8,
      marginBottom: 4,
    },
    heading4: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "bold",
      marginTop: 6,
      marginBottom: 2,
    },
    strong: {
      color: colors.text,
      fontWeight: "bold",
    },
    em: {
      color: colors.text,
      fontStyle: "italic",
    },
    list_item: {
      color: colors.text,
      marginVertical: 2,
    },
    bullet_list: {
      marginVertical: 4,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 6,
    },
  };

  return (
    <View
      style={[
        bubbleStyles.container,
        bubbleStyles.botContainer,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <Markdown style={markdownStyles}>{messageText}</Markdown>
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

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app"}/api`;

const ChatBotScreen = ({ navigation }) => {
  const { user, theme } = useAuthStore();
  const colors = getThemeColors(theme);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const flatListRef = useRef(null);
  const currentUserId = user?._id || user?.id;

  // Animation for round icons
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

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

  const fetchHistory = async (showLoader = true) => {
    try {
      if (showLoader) setFetchingHistory(true);
      const token = await getToken();

      if (!token) return false;

      const rawUrl =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
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
      return true;
    } catch (error) {
      console.error("History fetch error:", error);
      return false;
    } finally {
      if (showLoader) setFetchingHistory(false);
      setLoading(false);
    }
  };

  const handleRefreshHistory = async () => {
    setRefreshingHistory(true);
    try {
      const succeeded = await fetchHistory(false);
      if (!succeeded) {
        Alert.alert(
          "Refresh failed",
          "Could not reload your conversation history.",
        );
      }
    } finally {
      setRefreshingHistory(false);
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
    };

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
        {/* Header with Round Animated Icon */}
        <View
          style={[
            screenStyles.header,
            {
              backgroundColor: colors.cardBg,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {navigation && (
            <TouchableOpacity
              style={[
                screenStyles.backBtn,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          )}

          <View style={screenStyles.headerTitleContainer}>
            <Text style={[screenStyles.headerTitle, { color: colors.text }]}>
              NutriBot Assistant
            </Text>
            <Animated.Image
              source={require("../../assets/icon.png")}
              style={[
                screenStyles.headerIcon,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Chat History / Loader / Empty State with Large Round Animated Icon */}
        {fetchingHistory ? (
          <View style={screenStyles.loaderContainer}>
            <CustomAppLoader size={70} />
          </View>
        ) : messages.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={screenStyles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshingHistory}
                onRefresh={handleRefreshHistory}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <Animated.View
              style={[
                screenStyles.largeIconWrapper,
                {
                  borderColor: colors.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Image
                source={require("../../assets/icon.png")}
                style={screenStyles.largeIcon}
              />
            </Animated.View>
            <Text style={[screenStyles.emptyTitle, { color: colors.primary }]}>
              NutriBot Assistant is Ready!
            </Text>
            <Text
              style={[
                screenStyles.emptySubtitle,
                { color: colors.textSecondary },
              ]}
            >
              You can ask any questions related to your diet, macros, or
              recipes.
            </Text>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            refreshControl={
              <RefreshControl
                refreshing={refreshingHistory}
                onRefresh={handleRefreshHistory}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
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
              borderTopColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={[
              screenStyles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            placeholder="Ask about diet, macros, or recipes..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              screenStyles.sendButton,
              { backgroundColor: colors.primary },
              (!inputText.trim() || loading) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userContainer: {
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
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    resizeMode: "cover",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  largeIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    marginBottom: 4,
  },
  largeIcon: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    resizeMode: "cover",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 14 : 12,
    alignItems: "center",
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default ChatBotScreen;
