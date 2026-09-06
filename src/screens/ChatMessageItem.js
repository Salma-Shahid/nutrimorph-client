import React from "react";
import { View, Text, StyleSheet } from "react-native";

const FormattedText = ({ text, style, boldStyle }) => {
  if (!text) return null;

  const sanitizedText = text.replace(/^\*\s+/gm, "• ");
  const parts = sanitizedText.split(/(\*\*[\s\S]*?\*\*)/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          const content = part.slice(2, -2);
          return (
            <Text key={index} style={boldStyle}>
              {content}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

const renderMessage = (item) => {
  const isUser = item?.sender === "user";
  const messageText = item?.text || "";

  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userContainer : styles.botContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}
      >
        <FormattedText
          text={messageText}
          style={isUser ? styles.userText : styles.botText}
          boldStyle={isUser ? styles.userBoldText : styles.boldHighlight}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    width: "100%",
    marginVertical: 6,
    flexDirection: "row",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  botContainer: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#10B981", // Emerald Green
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#1E293B", // Slate Card
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
  userBoldText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  botText: {
    color: "#F1F5F9",
    fontSize: 15,
    lineHeight: 22,
  },
  boldHighlight: {
    color: "#34D399",
    fontWeight: "bold",
  },
});

export { FormattedText, renderMessage, styles };
