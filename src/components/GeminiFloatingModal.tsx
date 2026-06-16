import Constants from "expo-constants";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

const PAGE_SIZE = 30;

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

// ✅ HELPER: Parse basic markdown (bold, italic) into styled React Native Text elements
const renderFormattedText = (text: string, baseStyle: any) => {
  if (!text) return null;

  const regex = /(\*{1,3}[^*\n]+?\*{1,3}|_{1,3}[^_\n]+?_{1,3}|[^*\n\s][^*\n]*?\*{1,2}(?=\s|$))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    const getMarkerCounts = (str: string, marker: string) => {
      let startCount = 0;
      let endCount = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === marker) startCount++;
        else break;
      }
      for (let i = str.length - 1; i >= 0; i--) {
        if (str[i] === marker) endCount++;
        else break;
      }
      return { startCount, endCount };
    };

    if (part.includes('*')) {
      const { startCount, endCount } = getMarkerCounts(part, '*');
      
      if (startCount > 0 && endCount > 0) {
        if (startCount === endCount) {
          if (startCount === 3) return <Text key={index} style={[baseStyle, { fontWeight: 'bold', fontStyle: 'italic' }]}>{part.slice(3, -3)}</Text>;
          if (startCount === 2) return <Text key={index} style={[baseStyle, { fontWeight: 'bold' }]}>{part.slice(2, -2)}</Text>;
          if (startCount === 1) return <Text key={index} style={[baseStyle, { fontStyle: 'italic' }]}>{part.slice(1, -1)}</Text>;
        } else {
          const cleanText = part.slice(startCount, part.length - endCount);
          return <Text key={index} style={[baseStyle, { fontWeight: 'bold' }]}>{cleanText}</Text>;
        }
      }
      
      if (startCount === 0 && endCount > 0) {
        const cleanText = part.slice(0, part.length - endCount);
        if (cleanText.trim()) return <Text key={index} style={[baseStyle, { fontWeight: 'bold' }]}>{cleanText}</Text>;
      }
    }

    if (part.includes('_')) {
      const { startCount, endCount } = getMarkerCounts(part, '_');
      
      if (startCount > 0 && endCount > 0) {
        if (startCount === endCount) {
          if (startCount === 3) return <Text key={index} style={[baseStyle, { fontWeight: 'bold', fontStyle: 'italic' }]}>{part.slice(3, -3)}</Text>;
          if (startCount === 2) return <Text key={index} style={[baseStyle, { fontWeight: 'bold' }]}>{part.slice(2, -2)}</Text>;
          if (startCount === 1) return <Text key={index} style={[baseStyle, { fontStyle: 'italic' }]}>{part.slice(1, -1)}</Text>;
        } else {
          const cleanText = part.slice(startCount, part.length - endCount);
          return <Text key={index} style={[baseStyle, { fontWeight: 'bold' }]}>{cleanText}</Text>;
        }
      }
      
      if (startCount === 0 && endCount > 0) {
        const cleanText = part.slice(0, part.length - endCount);
        if (cleanText.trim()) return <Text key={index} style={[baseStyle, { fontWeight: 'bold' }]}>{cleanText}</Text>;
      }
    }

    return <Text key={index} style={baseStyle}>{part}</Text>;
  });
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

  const singleLineHeightRef = useRef(0);
  const [inputHeight, setInputHeight] = useState(42);

  const [mode, setMode] = useState<ChatMode>("assistant");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tutorSuggestions, setTutorSuggestions] = useState<TutorSuggestion[]>([]);
  const [loadingTutorSuggestions, setLoadingTutorSuggestions] = useState(false);
  
  const [isAtBottom, setIsAtBottom] = useState(true);

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
    setIsAtBottom(true);
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
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottomNow = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setIsAtBottom(isAtBottomNow);

    const offsetY = contentOffset.y;
    if (offsetY <= 20) {
      loadOlderMessages();
    }
  };

  const handleContentSizeChange = (event: any) => {
    const contentHeight = event.nativeEvent.contentSize.height;
    
    if (singleLineHeightRef.current === 0 && contentHeight > 0) {
      singleLineHeightRef.current = contentHeight;
    }
    
    const singleLineHeight = singleLineHeightRef.current || contentHeight;
    const lines = Math.max(1, Math.round(contentHeight / singleLineHeight));
    const clampedLines = Math.min(lines, 4);
    
    const newHeight = 42 + (clampedLines - 1) * 25;
    
    if (newHeight !== inputHeight) {
      setInputHeight(newHeight);
    }
  };

  useEffect(() => {
    if (!input) {
      setInputHeight(42);
    }
  }, [input]);

  // Load chat history FROM FIREBASE ONLY
  useEffect(() => {
    const loadSavedChat = async () => {
      try {
        // Default to assistant mode since we are not storing mode locally anymore
        const restoredMode: ChatMode = "assistant";
        setMode(restoredMode);

        // Fetch from Firebase
        const response = await apiFetch(`${API_BASE_URL}/ai/chat-history/${restoredMode}`);
        const data = await response.json();
        
        if (response.ok && Array.isArray(data?.data) && data.data.length > 0) {
          setMessages(data.data);
        } else {
          // If Firebase has no history, start fresh with default greeting
          setMessages(getDefaultMessages(restoredMode));
        }
        setVisibleCount(PAGE_SIZE);
      } catch (error) {
        console.warn("Failed to load AI chat from Firebase:", error);
        // Fallback to default if network fails completely
        setMessages(getDefaultMessages("assistant"));
      } finally {
        setHydrated(true);
      }
    };
    loadSavedChat();
  }, []);

  // Save messages TO FIREBASE ONLY
  useEffect(() => {
    if (!hydrated) return;

    const saveChatToFirebase = async () => {
      try {
        await apiFetch(`${API_BASE_URL}/ai/chat-history/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, messages }),
        });
      } catch (err) {
        console.warn("Failed to sync chat to Firebase:", err);
      }
    };

    // Debounce save to avoid excessive writes
    const timeoutId = setTimeout(saveChatToFirebase, 1000);
    return () => clearTimeout(timeoutId);

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

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*', 'application/pdf', 'text/plain', 'text/csv', 'application/json',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
        return;
      }

      if (asset.mimeType?.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(asset.name)) {
        Alert.alert('Unsupported File', 'Video uploads are not supported for AI analysis.');
        return;
      }

      let realType = await getRealMimeType(asset.uri, asset.mimeType || 'application/octet-stream');
      const lowerName = asset.name.toLowerCase();
      if (lowerName.endsWith('.png')) realType = 'image/png';
      else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) realType = 'image/jpeg';
      else if (lowerName.endsWith('.webp')) realType = 'image/webp';
      else if (lowerName.endsWith('.gif')) realType = 'image/gif';
      else if (lowerName.endsWith('.bmp')) realType = 'image/bmp';
      else if (lowerName.endsWith('.pdf')) realType = 'application/pdf';
      else if (lowerName.endsWith('.ppt')) realType = 'application/vnd.ms-powerpoint';
      else if (lowerName.endsWith('.pptx')) realType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      else if (lowerName.endsWith('.xls')) realType = 'application/vnd.ms-excel';
      else if (lowerName.endsWith('.xlsx')) realType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      setSelectedFile({ name: asset.name, type: realType, uri: asset.uri });
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const getBase64FromUri = async (uri: string) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== 'string') reject(new Error('Failed to read file as base64.'));
          else resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(new Error('Failed to convert blob to base64.'));
        reader.readAsDataURL(blob);
      });
    }
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
        const base64Data = await getBase64FromUri(selectedFile.uri);
        if (!base64Data || base64Data.length < 100) throw new Error('File content is empty or too small.');
        fileBase64 = base64Data;
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      } catch (error: any) {
        Alert.alert('Upload Failed', error.message || 'Could not process the selected file.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const userMessage: Message = { role: "user", text: trimmed, fileName: selectedFile?.name };
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
      if (!response.ok) throw new Error(data?.error || "Failed to get AI response.");

      setMessages((prev) => [...prev, { role: "model", text: data.reply || "No response returned." }]);
      setVisibleCount(PAGE_SIZE);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: "model", text: `Error: ${error?.message || "Something went wrong."}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch new mode's history from Firebase API when switching
  const resetForMode = async (nextMode: ChatMode) => {
    if (nextMode === mode || loading) return;
    try {
      shouldScrollToBottomRef.current = true;
      
      setMode(nextMode);
      setInput("");
      setVisibleCount(PAGE_SIZE);
      setLoading(true); // Optional: show loading while fetching history
      
      const response = await apiFetch(`${API_BASE_URL}/ai/chat-history/${nextMode}`);
      const data = await response.json();
      
      if (response.ok && Array.isArray(data?.data) && data.data.length > 0) {
        setMessages(data.data);
      } else {
        // Start fresh if no history in Firebase
        setMessages(getDefaultMessages(nextMode));
      }
    } catch (error) {
      console.warn("Error switching mode:", error);
      setMode(nextMode);
      setInput("");
      setVisibleCount(PAGE_SIZE);
      setMessages(getDefaultMessages(nextMode));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.backdrop}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <SafeAreaView style={styles.safeAreaWrapper}>
          <View
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
            {/* HEADER */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>ParseIT Assistant</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>

              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={handleClose} 
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Mode Switch */}
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

            
            {/* Messages Wrapper */}
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.messages}
                showsVerticalScrollIndicator={true}
                onScroll={handleMessagesScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (shouldScrollToBottomRef.current) scrollToBottom(false);
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
                        <View style={styles.botLabelContainer}>
                          <MaterialCommunityIcons name="robot-outline" size={14} color="#D32F2F" />
                          <Text style={styles.botLabel}>{mode === "assistant" ? "ParseIT Assistant" : "AI Tutor"}</Text>
                        </View>
                      )}
                      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                        {message.fileName && (
                          <View style={[styles.fileAttachment, isUser ? styles.fileAttachmentUser : styles.fileAttachmentBot]}>
                            <MaterialCommunityIcons name="file-document-outline" size={16} color={isUser ? "#FFF" : "#D32F2F"} />
                            <Text style={[styles.fileAttachmentText, isUser && { color: "#FFF" }]} numberOfLines={1}>
                              {message.fileName}
                            </Text>
                          </View>
                        )}
                        {!!message.text && (
                          <Text style={isUser ? styles.userText : styles.botText}>
                            {renderFormattedText(message.text, isUser ? styles.userText : styles.botText)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
                {loading && (
                  <View style={[styles.messageRow, styles.botRow]}>
                    <View style={styles.botLabelContainer}>
                      <MaterialCommunityIcons name="robot-outline" size={14} color="#D32F2F" />
                      <Text style={styles.botLabel}>{mode === "assistant" ? "ParseIT Assistant" : "AI Tutor"}</Text>
                    </View>
                    <View style={[styles.messageBubble, styles.botBubble]}>
                      <ActivityIndicator color="#D32F2F" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Scroll to Bottom Floating Button */}
              {!isAtBottom && (
                <TouchableOpacity 
                  style={styles.scrollToBottomBtn} 
                  onPress={() => scrollToBottom(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="chevron-down" size={24} color="#D32F2F" />
                </TouchableOpacity>
              )}
            </View>

            {/* Input Area */}
            <View style={styles.inputArea}>
              {selectedFile && (
                <View style={styles.selectedFileBadge}>
                  <MaterialCommunityIcons name="file-document-outline" size={16} color="#D32F2F" />
                  <Text style={styles.selectedFileText} numberOfLines={1} ellipsizeMode="middle">
                    {selectedFile.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputRow}>
                <TouchableOpacity 
                  style={styles.uploadBtn} 
                  onPress={handlePickFile}
                  disabled={loading || isUploading}
                >
                  <MaterialCommunityIcons 
                    name={selectedFile ? "file-check-outline" : "paperclip"} 
                    size={22} 
                    color={selectedFile ? "#16A34A" : "#6B7280"} 
                  />
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { height: inputHeight, borderRadius: Math.min(inputHeight / 2, 21) }]}
                  placeholder={mode === "tutor" ? "Ask about a difficult lesson..." : "Type your question..."}
                  placeholderTextColor="#9CA3AF"
                  value={input}
                  onChangeText={setInput}
                  editable={!loading && !isUploading}
                  returnKeyType="send"
                  multiline
                  textAlignVertical="top"
                  onContentSizeChange={handleContentSizeChange}
                  onKeyPress={(e) => {
                    if (e.nativeEvent.key === 'Enter') {
                      if (Platform.OS === 'web') {
                        const nativeEvent = e.nativeEvent as any;
                        if (!nativeEvent.shiftKey) {
                          e.preventDefault?.();
                          sendMessage();
                        }
                      }
                    }
                  }}
                />

                <TouchableOpacity
                  style={[styles.sendBtn, (loading || isUploading) && styles.sendBtnDisabled]}
                  onPress={sendMessage}
                  disabled={loading || isUploading}
                >
                  {loading || isUploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)" },
  safeAreaWrapper: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' },
  modalContainer: {
    backgroundColor: "#FFFFFF", borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 15,
    marginBottom: 20,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 18, 
    paddingBottom: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: "#F3F4F6", 
    backgroundColor: "#FFFFFF" 
  },
  title: { fontSize: 18, fontWeight: "800", color: "#D32F2F" },
  subtitle: { marginTop: 4, fontSize: 12, color: "#6B7280", fontWeight: "500" },
  
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modeSwitchWrap: { flexDirection: "row", marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: "#F3F4F6", borderRadius: 999, padding: 4 },
  modeButton: { flex: 1, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  modeButtonActive: { backgroundColor: "#D32F2F", shadowColor: "#D32F2F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  modeButtonText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  modeButtonTextActive: { color: "#FFF" },
  
  messages: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  loadOlderWrap: { alignItems: "center", marginBottom: 16 },
  loadOlderText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  
  messageRow: { marginBottom: 16, maxWidth: "85%" },
  userRow: { alignSelf: "flex-end", alignItems: "flex-end" },
  botRow: { alignSelf: "flex-start", alignItems: "flex-start" },
  
  botLabelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 4, gap: 4 },
  botLabel: { fontSize: 12, fontWeight: "700", color: "#D32F2F" },
  
  messageBubble: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, maxWidth: '100%' },
  botBubble: { 
    alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", 
    borderRadius: 18, borderTopLeftRadius: 4, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#D32F2F", borderRadius: 18, borderTopRightRadius: 4 },
  
  botText: { color: "#1F2937", fontSize: 14, lineHeight: 22, fontWeight: "400" },
  userText: { color: "#FFFFFF", fontSize: 14, lineHeight: 22, fontWeight: "400" },
  
  fileAttachment: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, 
    borderRadius: 10, marginBottom: 8, gap: 6,
  },
  fileAttachmentBot: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  fileAttachmentUser: { backgroundColor: 'rgba(255,255,255,0.2)' },
  fileAttachmentText: { fontSize: 13, fontWeight: '600', color: '#991B1B', flex: 1 },

  inputArea: {
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: "#F3F4F6", backgroundColor: "#FFFFFF",
  },
  selectedFileBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, marginBottom: 10, gap: 8,
  },
  selectedFileText: { flex: 1, fontSize: 13, color: '#991B1B', fontWeight: '600' },
  
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  uploadBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1.5, borderColor: "#E5E7EB",
    paddingHorizontal: 16, paddingVertical: 10,
    color: "#111827", backgroundColor: "#F9FAFB", fontSize: 14, fontWeight: "500",
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: "#D32F2F",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#D32F2F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: "#F87171", shadowOpacity: 0 },
  
  tutorSuggestionWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: "#FAFAFA" },
  tutorSuggestionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  tutorSuggestionTitle: { fontSize: 12, fontWeight: "800", color: "#7A1F1F", textTransform: "uppercase", letterSpacing: 0.5 },
  tutorSuggestionList: { paddingRight: 10 },
  tutorSuggestionBubble: { maxWidth: 200, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#FECACA", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginRight: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tutorSuggestionBubbleText: { color: "#111827", fontWeight: "700", fontSize: 13, lineHeight: 18 },
  tutorSuggestionScore: { color: "#D32F2F", fontWeight: "700", fontSize: 11, marginTop: 4 },
  tutorSuggestionEmpty: { color: "#9CA3AF", fontSize: 13, paddingVertical: 8, fontStyle: "italic" },

  scrollToBottomBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});