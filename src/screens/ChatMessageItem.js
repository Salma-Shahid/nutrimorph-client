import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Enhanced FormattedText Component
 * Handles:
 * 1. Markdown Headers (###, ##, #) -> Strips hashes & applies header styling
 * 2. Bullet points (* or -) -> Converts to "• "
 * 3. Bold text (**text**) -> Applies bold styling
 */
const FormattedText = ({ text, style, boldStyle, headerStyle }) => {
  if (!text) return null;

  // 1. Convert bullet points (* or -) at line starts to "• "
  const sanitizedText = text.replace(/^[\*\-]\s+/gm, "• ");

  // 2. Process text line by line to handle Markdown headers
  const lines = sanitizedText.split("\n");

  return (
    <Text style={style}>
      {lines.map((line, lineIdx) => {
        // Check for headers like "# Header", "## Header", or "### Header"
        const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
        const isHeader = !!headerMatch;
        const lineContent = isHeader ? headerMatch[2] : line;

        // Split line by bold tags (**text**)
        const parts = lineContent.split(/(\*\*[\s\S]*?\*\*)/g);

        return (
          <Text key={lineIdx}>
            {parts.map((part, partIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                const content = part.slice(2, -2);
                return (
                  <Text
                    key={partIdx}
                    style={[
                      boldStyle,
                      isHeader && (headerStyle || styles.headerText),
                    ]}
                  >
                    {content}
                  </Text>
                );
              }
              return (
                <Text
                  key={partIdx}
                  style={isHeader ? headerStyle || styles.headerText : null}
                >
                  {part}
                </Text>
              );
            })}
            {/* Add newline between lines */}
            {lineIdx < lines.length - 1 ? "\n" : ""}
          </Text>
        );
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
          headerStyle={isUser ? styles.userHeader : styles.headerText}
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
  userHeader: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    lineHeight: 24,
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
  headerText: {
    color: "#34D399", // Emerald Accent for Bot Headers
    fontWeight: "bold",
    fontSize: 16,
    lineHeight: 24,
  },
});

export { FormattedText, renderMessage, styles };
