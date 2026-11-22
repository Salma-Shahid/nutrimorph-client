import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import axios from "axios";
import { getThemeColors } from "../theme/colors";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";

const toScriptValue = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

const createCheckoutHtml = ({
  clientToken,
  environment,
  email,
  priceId,
  intentId,
  billingCycle,
  theme,
}) => {
  const isDark = theme !== "light";
  const background = isDark ? "#0f172a" : "#f8fafc";
  const foreground = isDark ? "#f8fafc" : "#0f172a";
  const secondary = isDark ? "#cbd5e1" : "#475569";

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { background: ${background}; color: ${foreground}; font: 16px -apple-system, sans-serif; display: grid; min-height: 90vh; place-items: center; margin: 0; }
      button { background: #10b981; border: 0; border-radius: 12px; color: #052e25; font-size: 16px; font-weight: 700; padding: 16px 24px; }
      #message { color: ${secondary}; text-align: center; padding: 24px; }
    </style>
    <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
  </head>
  <body>
    <div id="message">Preparing secure Paddle checkout...</div>
    <button id="checkout" hidden>Continue to secure checkout</button>
    <script>
      (function () {
        var values = {
          token: ${toScriptValue(clientToken)},
          environment: ${toScriptValue(environment)},
          email: ${toScriptValue(email)},
          priceId: ${toScriptValue(priceId)},
          intentId: ${toScriptValue(intentId)},
          billingCycle: ${toScriptValue(billingCycle)},
          theme: ${toScriptValue(isDark ? "dark" : "light")}
        };
        var button = document.getElementById("checkout");
        var message = document.getElementById("message");
        function send(type, detail) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, detail: detail }));
        }
        window.addEventListener("error", function (event) {
          send("error", event.message || "Paddle checkout could not be loaded.");
        });
        if (!window.Paddle || !values.token) {
          send("error", "Paddle checkout is not configured.");
          return;
        }
        if (values.environment === "sandbox") window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({
          token: values.token,
          eventCallback: function (event) {
            if (event.name === "checkout.completed") send("completed");
            if (event.name === "checkout.closed") send("closed");
            if (event.name === "checkout.error") send("error", "Paddle could not complete checkout.");
          }
        });
        message.textContent = "Your subscription is ready.";
        button.hidden = false;
        button.addEventListener("click", function () {
          window.Paddle.Checkout.open({
            items: [{ priceId: values.priceId, quantity: 1 }],
            customer: { email: values.email },
            customData: {
              checkoutIntentId: values.intentId,
              planTier: "Pro",
              billingCycle: values.billingCycle,
              aiModel: "gemini-3.5-flash-lite"
            },
            settings: { theme: values.theme }
          });
        });
      })();
    </script>
  </body>
</html>`;
};

export default function PaddleCheckoutModal({
  visible,
  token,
  billingCycle,
  theme,
  onClose,
  onComplete,
}) {
  const colors = getThemeColors(theme || "dark");
  const [checkoutHtml, setCheckoutHtml] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCheckoutHtml("");
      setError("");
      return;
    }

    let active = true;
    const prepareCheckout = async () => {
      const clientToken = process.env.EXPO_PUBLIC_PADDLE_CLIENT_TOKEN;
      const priceId =
        billingCycle === "yearly"
          ? process.env.EXPO_PUBLIC_PADDLE_YEARLY_PRICE_ID
          : process.env.EXPO_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
      const environment = process.env.EXPO_PUBLIC_PADDLE_ENV || "sandbox";
      if (!clientToken || !priceId) {
        setError("Paddle client token and selected plan price ID are required.");
        return;
      }
      if (!["sandbox", "production"].includes(environment)) {
        setError("EXPO_PUBLIC_PADDLE_ENV must be sandbox or production.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await axios.post(
          `${BASE_URL}/api/payment/create-checkout-intent`,
          { billingCycle },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!active) return;
        if (response.data?.priceId !== priceId) {
          throw new Error(
            "The configured Paddle price does not match the backend plan.",
          );
        }
        setCheckoutHtml(
          createCheckoutHtml({
            clientToken,
            environment,
            email: response.data.email,
            priceId: response.data.priceId,
            intentId: response.data.intentId,
            billingCycle: response.data.billingCycle,
            theme,
          }),
        );
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.message ||
              requestError.message ||
              "Could not prepare Paddle checkout.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    prepareCheckout();
    return () => {
      active = false;
    };
  }, [billingCycle, theme, token, visible]);

  const handleMessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch (parseError) {
      console.error("Could not parse Paddle checkout message:", parseError);
      return;
    }
    if (message.type === "completed") {
      onComplete?.();
    } else if (message.type === "closed") {
      onClose?.();
    } else if (message.type === "error") {
      setError(message.detail || "Paddle checkout failed.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Secure Paddle Checkout
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={[styles.close, { color: colors.primary }]}>Close</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Preparing your checkout...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: colors.text }]}>
              {error}
            </Text>
          </View>
        ) : checkoutHtml ? (
          <WebView
            source={{ html: checkoutHtml, baseUrl: "https://nutrimorph.app" }}
            onMessage={handleMessage}
            onError={(event) =>
              setError(
                event.nativeEvent.description ||
                  "Paddle checkout could not be loaded.",
              )
            }
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 58,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontWeight: "700" },
  close: { fontSize: 15, fontWeight: "600", padding: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { marginTop: 16, textAlign: "center", fontSize: 15 },
});
