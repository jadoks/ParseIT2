import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

interface GeminiFloatingModalProps {
  visible: boolean;
  onClose: () => void;
}

type ChatMode = 'assistant' | 'tutor';

export default function GeminiFloatingModal({
  visible,
  onClose,
}: GeminiFloatingModalProps) {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  const [mode, setMode] = useState<ChatMode>('assistant');

  const isAssistant = mode === 'assistant';

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
            isMobile
              ? {
                  width: width * 0.92,
                  height: height * 0.72,
                  bottom: 80,
                  right: 16,
                }
              : {
                  width: 420,
                  height: 580,
                  bottom: 85,
                  right: 20,
                },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>ParseIT Assistant</Text>
              <Text style={styles.subtitle}>
                {isAssistant
                  ? 'General support and system help'
                  : 'Learning guidance and lesson assistance'}
              </Text>
            </View>
          </View>

          <View style={styles.modeSwitchWrap}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                isAssistant && styles.modeButtonActive,
              ]}
              onPress={() => setMode('assistant')}
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
              style={[
                styles.modeButton,
                !isAssistant && styles.modeButtonActive,
              ]}
              onPress={() => setMode('tutor')}
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

          <ScrollView
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
          >
            {isAssistant ? (
              <>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text style={styles.botText}>
                    Hello! I’m your ParseIT Assistant. I can help you navigate
                    the system, answer common questions, and guide you through
                    features.
                  </Text>
                </View>

                <View style={[styles.messageBubble, styles.userBubble]}>
                  <Text style={styles.userText}>
                    Where can I view my quiz results?
                  </Text>
                </View>

                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text style={styles.botText}>
                    You can check your quiz results in the Results or Performance
                    section, depending on how your system navigation is set up.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text style={styles.botText}>
                    Hi! I’m your AI Tutor. I can help explain lessons, guide you
                    step by step, and support you with academic questions.
                  </Text>
                </View>

                <View style={[styles.messageBubble, styles.userBubble]}>
                  <Text style={styles.userText}>
                    Can you help me understand loops in programming?
                  </Text>
                </View>

                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text style={styles.botText}>
                    Of course. A loop is used to repeat a block of code multiple
                    times. For example, a for loop is helpful when you already
                    know how many times the repetition should happen.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder={
                isAssistant
                  ? 'Ask about the system...'
                  : 'Ask about your lessons...'
              }
              placeholderTextColor="#888"
              style={styles.input}
            />
            <TouchableOpacity style={styles.sendBtn}>
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
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
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
    borderBottomColor: '#E9E9E9',
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D32F2F',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },

  modeSwitchWrap: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: '#F4F4F4',
    borderRadius: 999,
    padding: 4,
  },

  modeButton: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#D32F2F',
  },

  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },

  modeButtonTextActive: {
    color: '#FFF',
  },

  messages: {
    padding: 14,
    gap: 10,
  },

  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },

  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F2',
  },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#D32F2F',
  },

  botText: {
    color: '#222',
    fontSize: 14,
    lineHeight: 20,
  },

  userText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9E9E9',
    backgroundColor: '#fff',
  },

  input: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    borderRadius: 999,
    paddingHorizontal: 14,
    color: '#000',
    backgroundColor: '#fff',
  },

  sendBtn: {
    marginLeft: 10,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});