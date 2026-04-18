import Constants from "expo-constants";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

interface GeminiFloatingModalProps {
  visible: boolean;
  onClose: () => void;
}

type ChatMode = "assistant" | "tutor";

type Message = {
  role: "user" | "model";
  text: string;
};

function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return "http://localhost:5000";
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  if (host) {
    return `http://${host}:5000`;
  }

  return "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

export default function GeminiFloatingModal({
  visible,
  onClose,
}: GeminiFloatingModalProps) {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const [mode, setMode] = useState<ChatMode>("assistant");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! Ask me anything about ParseIT or your lesson.",
    },
  ]);

  const isAssistant = mode === "assistant";

  const subtitle = useMemo(
    () =>
      isAssistant
        ? "General support and system help"
        : "Learning guidance and lesson assistance",
    [isAssistant]
  );

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", text: trimmed };
    const historyForRequest = [...messages, userMessage];

    setMessages(historyForRequest);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/gemini`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          mode,
          history: messages.slice(-10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to get AI response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: data.reply || "No response returned.",
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `Error: ${error?.message || "Something went wrong."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetForMode = (nextMode: ChatMode) => {
    setMode(nextMode);
    setMessages([
      {
        role: "model",
        text:
          nextMode === "assistant"
            ? "Hello! I can help you use ParseIT features."
            : "Hi! I can help explain lessons step by step.",
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <SafeAreaView
          style={[
            styles.modalContainer,
            {
              width: isMobile ? width * 0.95 : 460,
              height: isMobile ? height * 0.78 : 640,
              right: isMobile ? width * 0.025 : 24,
              bottom: isMobile ? 18 : 24,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>ParseIT Assistant</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.modeSwitchWrap}>
            <TouchableOpacity
              style={[styles.modeButton, isAssistant && styles.modeButtonActive]}
              onPress={() => resetForMode("assistant")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  isAssistant && styles.modeButtonTextActive,
                ]}
              >
                Assistant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, !isAssistant && styles.modeButtonActive]}
              onPress={() => resetForMode("tutor")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  !isAssistant && styles.modeButtonTextActive,
                ]}
              >
                AI Tutor
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.messages}>
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <View
                  key={`${message.role}-${index}`}
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text style={isUser ? styles.userText : styles.botText}>
                    {message.text}
                  </Text>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageBubble, styles.botBubble]}>
                <ActivityIndicator />
              </View>
            )}
          </ScrollView>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type your question..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              editable={!loading}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={sendMessage}
              disabled={loading}
            >
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9E9E9",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D32F2F",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
  modeSwitchWrap: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#F4F4F4",
    borderRadius: 999,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: "#D32F2F",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  modeButtonTextActive: {
    color: "#FFF",
  },
  messages: {
    padding: 14,
    gap: 10,
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F2F2F2",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#D32F2F",
  },
  botText: {
    color: "#222",
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#FFF",
    fontSize: 14,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E9E9E9",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: "#D32F2F",
    borderRadius: 999,
    paddingHorizontal: 14,
    color: "#000",
    backgroundColor: "#fff",
  },
  sendBtn: {
    marginLeft: 10,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});