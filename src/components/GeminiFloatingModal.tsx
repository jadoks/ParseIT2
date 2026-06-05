import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface GeminiFloatingModalProps {
  visible: boolean;
  onClose: () => void;
  currentStudentId?: string;
}

type ChatMode = "assistant" | "tutor";

type Message = {
  role: "user" | "model";
  text: string;
  fileName?: string;
};

type TutorSuggestion = {
  id: string;
  topic: string;
  text: string;
  courseId?: string | null;
  assignmentId?: string | null;
  courseName?: string | null;
  assignmentTitle?: string | null;
  lastScore?: number | null;
};

const CHAT_MODE_KEY = "parseit-ai-chat-mode";
const PAGE_SIZE = 30;

const getChatStorageKey = (mode: ChatMode) =>
  `parseit-ai-chat-history-${mode}`;

function getDefaultMessages(mode: ChatMode): Message[] {
  return [
    {
      role: "model",
      text:
        mode === "assistant"
          ? "Hello. I'm your ParseIT Assistant. How may I assist you today?"
          : "Hello. I'm your ParseIT AI Tutor. Tell me the lesson, topic, assignment, or concept that feels difficult, and we'll study it step by step.",
    },
  ];
}

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

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

// ✅ HELPER: Detect real MIME type from file extension when picker returns generic type
const getRealMimeType = async (uri: string, fallbackType: string) => {
  if (Platform.OS === 'web') return fallbackType;
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    // Only override if the picker gave us a generic binary type
    if (fileInfo.exists && fallbackType === 'application/octet-stream') {
      const name = uri.split('/').pop()?.toLowerCase() || '';
      if (name.endsWith('.pdf')) return 'application/pdf';
      if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (name.endsWith('.doc')) return 'application/msword';
      if (name.endsWith('.txt')) return 'text/plain';
      if (name.endsWith('.md')) return 'text/markdown';
      if (name.endsWith('.csv')) return 'text/csv';
      if (name.endsWith('.json')) return 'application/json';
      if (name.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (name.endsWith('.png')) return 'image/png';
      if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
      if (name.endsWith('.webp')) return 'image/webp';
      if (name.endsWith('.gif')) return 'image/gif';
      if (name.endsWith('.bmp')) return 'image/bmp';
    }
  } catch (e) {
    console.warn('MIME detection failed:', e);
  }
  return fallbackType;
};

export default function GeminiFloatingModal({
  visible,
  onClose,
  currentStudentId,
}: GeminiFloatingModalProps) {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const scrollViewRef = useRef<ScrollView | null>(null);
  const shouldScrollToBottomRef = useRef(true);

  const [mode, setMode] = useState<ChatMode>("assistant");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tutorSuggestions, setTutorSuggestions] = useState<TutorSuggestion[]>([]);
  const [loadingTutorSuggestions, setLoadingTutorSuggestions] = useState(false);
  
  // ✅ STATE FOR FILE UPLOAD
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; uri: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>(
    getDefaultMessages("assistant")
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isAssistant = mode === "assistant";

  const visibleMessages = useMemo(() => {
    return messages.slice(-visibleCount);
  }, [messages, visibleCount]);

  const subtitle = useMemo(
    () =>
      isAssistant
        ? "General support and system help"
        : "Lesson tutoring, guided practice, and learning support",
    [isAssistant]
  );

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  };

  const loadOlderMessages = () => {
    if (visibleCount >= messages.length) return;
    shouldScrollToBottomRef.current = false;
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, messages.length));
  };

  const handleMessagesScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY <= 20) {
      loadOlderMessages();
    }
  };

  useEffect(() => {
    const loadSavedChat = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(CHAT_MODE_KEY);
        const restoredMode: ChatMode =
          savedMode === "assistant" || savedMode === "tutor"
            ? savedMode
            : "assistant";
        setMode(restoredMode);
        const savedMessages = await AsyncStorage.getItem(
          getChatStorageKey(restoredMode)
        );
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages);
          } else {
            setMessages(getDefaultMessages(restoredMode));
          }
        } else {
          setMessages(getDefaultMessages(restoredMode));
        }
        setVisibleCount(PAGE_SIZE);
      } catch (error) {
        console.warn("Failed to load saved AI chat:", error);
      } finally {
        setHydrated(true);
      }
    };
    loadSavedChat();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CHAT_MODE_KEY, mode).catch((error) => {
      console.warn("Failed to save AI chat mode:", error);
    });
  }, [mode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(getChatStorageKey(mode), JSON.stringify(messages)).catch(
      (error) => {
        console.warn("Failed to save AI chat:", error);
      }
    );
  }, [messages, mode, hydrated]);

  useEffect(() => {
    if (visible) {
      shouldScrollToBottomRef.current = true;
      setVisibleCount(PAGE_SIZE);
      scrollToBottom(false);
    }
  }, [visible]);

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const loadTutorSuggestions = async () => {
    if (!currentStudentId) {
      setTutorSuggestions([]);
      return;
    }
    try {
      setLoadingTutorSuggestions(true);
      const response = await apiFetch(`${API_BASE_URL}/student-activities/tutor-suggestions/${encodeURIComponent(currentStudentId)}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data?.data)) {
        setTutorSuggestions(data.data);
      }
    } catch (error) {
      console.warn("Failed to load tutor suggestions:", error);
    } finally {
      setLoadingTutorSuggestions(false);
    }
  };

  useEffect(() => {
    if (!visible || mode !== "tutor") return;
    void loadTutorSuggestions();
  }, [visible, mode, currentStudentId]);

  const sendTutorSuggestion = async (suggestion: TutorSuggestion) => {
    if (loading) return;
    shouldScrollToBottomRef.current = true;
    const prompt = suggestion.text || `Help me understand ${suggestion.topic} step by step.`;
    const userMessage: Message = { role: "user", text: prompt };
    const historyForRequest = [...messages, userMessage];
    setMessages(historyForRequest);
    setVisibleCount(PAGE_SIZE);
    setInput("");
    setLoading(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/ai/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          mode: "tutor",
          studentId: currentStudentId || null,
          courseId: suggestion.courseId || null,
          assignmentId: suggestion.assignmentId || null,
          topic: suggestion.topic || null,
          history: historyForRequest.slice(-10),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to get AI tutor response.");
      }
      setMessages((prev) => [...prev, { role: "model", text: data.reply || "No response returned." }]);
      setVisibleCount(PAGE_SIZE);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: "model", text: `Error: ${error?.message || "Something went wrong."}` }]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Handle File Picking with Validation
const handlePickFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
  'image/*',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
],
      
      copyToCacheDirectory: true, // Important for Android
    });
    
    if (result.canceled || !result.assets?.length) return;
    
    const asset = result.assets[0];
    
    // Validate size (e.g., max 10MB for AI processing)
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      Alert.alert(
        'File Too Large',
        'Please select a file smaller than 10MB.'
      );
      return;
    }

    // Check if it's a video
    if (asset.mimeType?.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(asset.name)) {
      Alert.alert('Unsupported File', 'Video uploads are not supported for AI analysis.');
      return;
    }

    // ✅ FORCE CORRECT MIME TYPE FOR IMAGES
    let realType = await getRealMimeType(
        asset.uri,
        asset.mimeType || 'application/octet-stream'
      );
    const lowerName = asset.name.toLowerCase();
    if (lowerName.endsWith('.png')) realType = 'image/png';
    else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) realType = 'image/jpeg';
    else if (lowerName.endsWith('.webp')) realType = 'image/webp';
    else if (lowerName.endsWith('.gif')) realType = 'image/gif';
    else if (lowerName.endsWith('.bmp')) realType = 'image/bmp';
    else if (lowerName.endsWith('.pdf')) realType = 'application/pdf';
    else if (lowerName.endsWith('.ppt'))
      realType = 'application/vnd.ms-powerpoint';

    else if (lowerName.endsWith('.pptx'))
      realType =
        'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    else if (lowerName.endsWith('.xls'))
      realType = 'application/vnd.ms-excel';

    else if (lowerName.endsWith('.xlsx'))
      realType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    setSelectedFile({
      name: asset.name,
      type: realType,
      uri: asset.uri,
    });
  } catch (err) {
    console.error('Error picking document:', err);
    Alert.alert('Error', 'Failed to pick file.');
  }
};

  // ✅ Convert URI to Base64
  const getBase64FromUri = async (uri: string) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('Failed to read file as base64.'));
            return;
          }
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(new Error('Failed to convert blob to base64.'));
        reader.readAsDataURL(blob);
      });
    }
    
    // For native platforms, use expo-file-system
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  };

  const sendMessage = async () => {
  const trimmed = input.trim();
  if ((!trimmed && !selectedFile) || loading) return;

  shouldScrollToBottomRef.current = true;

  let fileBase64 = '';
  let fileName = '';
  let fileType = '';

  if (selectedFile) {
    setIsUploading(true);
    try {
      // ✅ ADD VALIDATION STEP
      const base64Data = await getBase64FromUri(selectedFile.uri);
      
      if (!base64Data || base64Data.length < 100) {
        throw new Error('File content is empty or too small to be valid.');
      }

      fileBase64 = base64Data;
      fileName = selectedFile.name;
      fileType = selectedFile.type;
      
      console.log(`✅ File ready: ${fileName} (${fileType}), Size: ${base64Data.length} chars`);
    } catch (error: any) {
      console.error('File conversion error:', error);
      Alert.alert('Upload Failed', error.message || 'Could not process the selected file. Try a different image.');
      setIsUploading(false);
      return;
    }
    setIsUploading(false);
  }

  
  
  const userMessage: Message = {
  role: "user",
  text: trimmed,
  fileName: selectedFile?.name,
};
  const historyForRequest = [...messages, userMessage];

  setMessages(historyForRequest);
  setVisibleCount(PAGE_SIZE);
  setInput("");
  setSelectedFile(null);
  setLoading(true);

  try {
    const response = await apiFetch(`${API_BASE_URL}/ai/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed || `Analyze the uploaded file "${fileName}" and provide a detailed summary.`,
        mode,
        studentId: currentStudentId || null,
        history: historyForRequest.slice(-10),
        fileBase64: fileBase64 || undefined,
        fileName: fileName || undefined,
        fileType: fileType || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to get AI response.");
    }

    setMessages((prev) => [
      ...prev,
      { role: "model", text: data.reply || "No response returned." },
    ]);
    setVisibleCount(PAGE_SIZE);
  } catch (error: any) {
    setMessages((prev) => [
      ...prev,
      { role: "model", text: `Error: ${error?.message || "Something went wrong."}` },
    ]);
  } finally {
    setLoading(false);
  }
};

  const resetForMode = async (nextMode: ChatMode) => {
    if (nextMode === mode || loading) return;
    try {
      shouldScrollToBottomRef.current = true;
      await AsyncStorage.setItem(getChatStorageKey(mode), JSON.stringify(messages));
      setMode(nextMode);
      setInput("");
      setVisibleCount(PAGE_SIZE);
      const savedMessages = await AsyncStorage.getItem(getChatStorageKey(nextMode));
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
          return;
        }
      }
      setMessages(getDefaultMessages(nextMode));
    } catch (error) {
      console.warn("Failed to switch AI chat mode:", error);
      setMode(nextMode);
      setInput("");
      setVisibleCount(PAGE_SIZE);
      setMessages(getDefaultMessages(nextMode));
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <SafeAreaView
          style={[
            styles.modalContainer,
            {
              width: isMobile ? width * 0.95 : 460,
              height: isMobile ? height * 0.78 : 690,
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
              disabled={loading}
            >
              <Text style={[styles.modeButtonText, isAssistant && styles.modeButtonTextActive]}>Assistant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, !isAssistant && styles.modeButtonActive]}
              onPress={() => resetForMode("tutor")}
              disabled={loading}
            >
              <Text style={[styles.modeButtonText, !isAssistant && styles.modeButtonTextActive]}>AI Tutor</Text>
            </TouchableOpacity>
          </View>

          {!isAssistant && (
            <View style={styles.tutorSuggestionWrap}>
              <View style={styles.tutorSuggestionHeader}>
                <Text style={styles.tutorSuggestionTitle}>Need help with these lessons?</Text>
                {loadingTutorSuggestions && <ActivityIndicator size="small" color="#D32F2F" />}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tutorSuggestionList}>
                {tutorSuggestions.length > 0 ? (
                  tutorSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.tutorSuggestionBubble}
                      onPress={() => sendTutorSuggestion(suggestion)}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.tutorSuggestionBubbleText} numberOfLines={2}>{suggestion.topic}</Text>
                      {suggestion.lastScore !== null && suggestion.lastScore !== undefined && (
                        <Text style={styles.tutorSuggestionScore}>Last score: {suggestion.lastScore}%</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.tutorSuggestionEmpty}>No weak lesson suggestions yet.</Text>
                )}
              </ScrollView>
            </View>
          )}

          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={true}
            onScroll={handleMessagesScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              if (shouldScrollToBottomRef.current) {
                scrollToBottom(false);
              }
            }}
          >
            {visibleCount < messages.length && (
              <View style={styles.loadOlderWrap}>
                <Text style={styles.loadOlderText}>Scroll up to load older messages</Text>
              </View>
            )}
            {visibleMessages.map((message, index) => {
              const isUser = message.role === "user";
              const actualIndex = messages.length - visibleMessages.length + index;
              return (
                <View key={`${message.role}-${actualIndex}`} style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
                  {!isUser && (
                    <Text style={styles.botLabel}>{mode === "assistant" ? "ParseIT Assistant" : "AI Tutor"}</Text>
                  )}
                  <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                    <View>
  {message.fileName && (
    <View
      style={{
        backgroundColor: isUser ? "rgba(255,255,255,0.2)" : "#F3F4F6",
        padding: 8,
        borderRadius: 8,
        marginBottom: message.text ? 8 : 0,
      }}
    >
      <Text
        style={{
          color: isUser ? "#FFF" : "#111827",
          fontWeight: "600",
        }}
      >
        📎 {message.fileName}
      </Text>
    </View>
  )}

  {!!message.text && (
    <Text style={isUser ? styles.userText : styles.botText}>
      {message.text}
    </Text>
  )}
</View>
                  </View>
                </View>
              );
            })}
            {loading && (
              <View style={[styles.messageRow, styles.botRow]}>
                <Text style={styles.botLabel}>{mode === "assistant" ? "ParseIT Assistant" : "AI Tutor"}</Text>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <ActivityIndicator />
                </View>
              </View>
            )}
          </ScrollView>

          {/* ✅ INPUT WRAPPER WITH FILE UPLOAD */}
          <View style={styles.inputWrapper}>
            {/* File Upload Button */}
            <TouchableOpacity 
              style={styles.uploadBtn} 
              onPress={handlePickFile}
              disabled={loading || isUploading}
            >
              <MaterialCommunityIcons 
                name={selectedFile ? "file-check-outline" : "paperclip"} 
                size={24} 
                color={selectedFile ? "#16A34A" : "#666"} 
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, selectedFile && styles.inputWithFile]}
              placeholder={mode === "tutor" ? "Ask about a difficult lesson..." : "Type your question..."}
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              editable={!loading}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />

            {/* Selected File Badge */}
            {selectedFile && (
              <View style={styles.selectedFileBadge}>
                <Text style={styles.selectedFileText} numberOfLines={1}>{selectedFile.name}</Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <MaterialCommunityIcons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.sendBtn, (loading || isUploading) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={loading || isUploading}
            >
              <Text style={styles.sendText}>{loading || isUploading ? "Sending..." : "Send"}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  modalContainer: {
    position: "absolute", backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 14, marginBottom: 48,
  },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#E9E9E9", backgroundColor: "#FFFFFF" },
  title: { fontSize: 18, fontWeight: "700", color: "#D32F2F" },
  subtitle: { marginTop: 4, fontSize: 12, color: "#667085" },
  modeSwitchWrap: { flexDirection: "row", marginHorizontal: 14, marginTop: 14, marginBottom: 4, backgroundColor: "#F4F4F4", borderRadius: 999, padding: 4 },
  modeButton: { flex: 1, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  modeButtonActive: { backgroundColor: "#D32F2F" },
  modeButtonText: { fontSize: 14, fontWeight: "600", color: "#666" },
  modeButtonTextActive: { color: "#FFF" },
  messages: { padding: 14, paddingBottom: 20 },
  loadOlderWrap: { alignItems: "center", marginBottom: 12 },
  loadOlderText: { fontSize: 12, color: "#667085" },
  messageRow: { marginBottom: 12, maxWidth: "88%" },
  userRow: { alignSelf: "flex-end", alignItems: "flex-end" },
  botRow: { alignSelf: "flex-start", alignItems: "flex-start" },
  botLabel: { fontSize: 12, fontWeight: "600", color: "#667085", marginBottom: 6, marginLeft: 4 },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  botBubble: { alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, borderTopLeftRadius: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#D32F2F", borderRadius: 14, borderTopRightRadius: 6 },
  botText: { color: "#1F2937", fontSize: 14, lineHeight: 22 },
  userText: { color: "#FFFFFF", fontSize: 14, lineHeight: 22 },
  
  // ✅ STYLES FOR INPUT AREA
  inputWrapper: { flexDirection: "row", alignItems: "center", padding: 12, borderTopWidth: 1, borderTopColor: "#E9E9E9", backgroundColor: "#FFFFFF", position: 'relative' },
  uploadBtn: { marginRight: 8, padding: 8, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, height: 46, borderWidth: 1.5, borderColor: "#D32F2F", borderRadius: 999, paddingHorizontal: 14, color: "#000", backgroundColor: "#FFFFFF" },
  inputWithFile: { borderBottomLeftRadius: 0, borderTopLeftRadius: 0 },
  selectedFileBadge: {
    position: 'absolute', top: -30, left: 50, backgroundColor: '#F3F4F6',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', gap: 6, maxWidth: '60%', zIndex: 10,
  },
  selectedFileText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  sendBtn: { marginLeft: 10, height: 46, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#D32F2F", alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.7 },
  sendText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  tutorSuggestionWrap: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3D4D4", backgroundColor: "#FFFDFD" },
  tutorSuggestionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  tutorSuggestionTitle: { fontSize: 12, fontWeight: "800", color: "#7A1F1F" },
  tutorSuggestionList: { paddingRight: 10 },
  tutorSuggestionBubble: { maxWidth: 210, backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#F3B4B4", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8 },
  tutorSuggestionBubbleText: { color: "#2B1111", fontWeight: "800", fontSize: 12, lineHeight: 16 },
  tutorSuggestionScore: { color: "#D32F2F", fontWeight: "700", fontSize: 11, marginTop: 4 },
  tutorSuggestionEmpty: { color: "#8A6F6F", fontSize: 12, paddingVertical: 8 },
});