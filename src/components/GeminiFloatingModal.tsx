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
      text: "Hello. I’m your ParseIT Assistant. How may I assist you today?",
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
            ? "Hello. I can assist you with ParseIT features, navigation, and general system support."
            : "Hello. I can help explain lessons clearly and guide you step by step.",
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
                    styles.messageRow,
                    isUser ? styles.userRow : styles.botRow,
                  ]}
                >
                  {!isUser && (
                    <Text style={styles.botLabel}>
                      {mode === "assistant" ? "ParseIT Assistant" : "AI Tutor"}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text style={isUser ? styles.userText : styles.botText}>
                      {message.text}
                    </Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageRow, styles.botRow]}>
                <Text style={styles.botLabel}>
                  {mode === "assistant" ? "ParseIT Assistant" : "AI Tutor"}
                </Text>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <ActivityIndicator />
                </View>
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
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  modalContainer: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 14,
    marginBottom: 48,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E9E9E9",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D32F2F",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#667085",
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
    paddingBottom: 20,
  },
  messageRow: {
    marginBottom: 12,
    maxWidth: "88%",
  },
  userRow: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  botRow: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  botLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#667085",
    marginBottom: 6,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 14,
    borderTopLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#D32F2F",
    borderRadius: 14,
    borderTopRightRadius: 6,
  },
  botText: {
    color: "#1F2937",
    fontSize: 14,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 22,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E9E9E9",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: "#D32F2F",
    borderRadius: 999,
    paddingHorizontal: 14,
    color: "#000",
    backgroundColor: "#FFFFFF",
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
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});