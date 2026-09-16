import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';
import { QuizQuestion } from './games/quiz-masters';

type GameScreen = 'menu' | 'quizmasters';

interface Props {
  // 🌟 UPDATED: Added gameType to the onNavigate callback
  // 🆕 CLASS RECORD: also pass along which class/lesson(s) this quiz was
  // generated from, so the parent can save the score against the right
  // class record once the student finishes (or resumes and finishes).
  onNavigate?: (
    screen: GameScreen,
    generatedQuiz?: QuizQuestion[] | null,
    gameType?: string,
    context?: { classId: string; materialIds: string[] }
  ) => void;
  enrolledCourses?: Array<{
    id: string;
    name: string;
    materials: Array<{ id: string; title: string; type: string }>;
  }>;
  studentId?: string;
  onSaveQuizScore?: (data: {
    classId: string;
    materialIds: string[];
    score: number;
    totalQuestions: number;
    answers: any[];
  }) => Promise<void>;
  // 🆕 PLAY AGAIN: parent sets this to true (e.g. after the student taps
  // "Play Again" on the results screen) to have Game automatically pop open
  // its "new quiz" modal — game type, number of questions, class & lesson —
  // instead of the student having to find their way back to this screen's
  // settings manually. Game calls onNewQuizModalOpened right after so the
  // parent can reset its flag and this doesn't reopen on every re-render.
  openNewQuizModal?: boolean;
  onNewQuizModalOpened?: () => void;
}

function getGameAiBaseUrl() {
  // Prefer the deployed backend URL on every platform — including native /
  // Expo Go — since EXPO_PUBLIC_ vars are inlined for native builds too, not
  // just web. Only fall back to guessing a local dev server's LAN IP when
  // no URL has been configured (e.g. testing against a backend running on
  // your own machine during local dev).
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    console.warn('EXPO_PUBLIC_API_URL is not set; API calls will fail.');
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  const host = possibleHost.split(':')[0];

  if (host) {
    return `http://${host}:5000`;
  }

  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getGameAiBaseUrl();
const apiFetch = (url: string, options: any = {}) => fetch(url, { credentials: 'include', ...options });

// 🌟 FIXED: Game options now match exactly what the backend supports
const gameOptions = [
  { value: 'quiz_master', label: 'Multiple Choice', icon: 'list-outline' },
  { value: 'memory_match', label: 'Matching Type', icon: 'swap-horizontal-outline' },
  { value: 'flashcard', label: 'Flashcards', icon: 'albums-outline' },
  { value: 'fill_in_blanks', label: 'Fill in the Blanks', icon: 'create-outline' },
];

// 🌟 NEW: Daily AI generation limit config
const MAX_QUESTIONS_PER_GENERATION = 20;
const MAX_GENERATIONS_PER_DAY = 10;

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// 🌟 NEW: Per-student storage key so each student gets their own 10/day pool,
// even if multiple students use the same device.
function getGenerationLimitStorageKey(studentId?: string) {
  return `gameAi_dailyGenerationLimit_${studentId || 'anonymous'}`;
}

// 🆕 RESUME SUPPORT: same key scheme as quiz-masters.tsx so a session saved
// there (right after a successful generation, and cleared once the quiz is
// actually finished) can be found here and offered back to the user if they
// close and reopen the app/website before finishing. Duplicated rather than
// imported since the two files don't currently share a utils module.
function getActiveSessionStorageKey(studentId?: string) {
  return `gameAi_activeSession_${studentId || 'anonymous'}`;
}

interface ResumableSession {
  questions: QuizQuestion[];
  gameType: string;
  savedAt?: number;
  // 🆕 CLASS RECORD: kept alongside the questions so a *resumed* session can
  // still save its score to the right class/lesson when finished.
  classId?: string;
  materialIds?: string[];
}

const Game = ({
  onNavigate,
  enrolledCourses = [],
  studentId,
  onSaveQuizScore,
  openNewQuizModal = false,
  onNewQuizModalOpened,
}: Props) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768; // tablet / web / desktop breakpoint
  // 🆕 RESPONSIVE: only needed so the full-screen "Play Again" modal on small
  // screens doesn't sit flush under the notch/status bar or behind the home
  // indicator — the centered card on large screens has room to spare and
  // doesn't need this.
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<GameScreen>('menu');
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numberOfQuestions, setNumberOfQuestions] = useState('10');
  const [gameType, setGameType] = useState<string>('');

  // 🌟 NEW: Track how many AI generations have been used today
  const [generationsUsedToday, setGenerationsUsedToday] = useState<number>(0);
  const [isLimitLoaded, setIsLimitLoaded] = useState(false);

  // 🆕 RESUME SUPPORT: an in-progress quiz from a previous visit (found in
  // storage on mount), which the user can jump back into instead of
  // regenerating and burning another one of today's AI generations.
  const [resumableSession, setResumableSession] = useState<ResumableSession | null>(null);
  const [isResumeChecked, setIsResumeChecked] = useState(false);

  // 🆕 PLAY AGAIN: modal version of the Quiz Settings / Choose class & lesson
  // form, popped open automatically when the parent flips openNewQuizModal
  // to true (i.e. the student tapped "Play Again" on the results screen).
  const [isNewQuizModalVisible, setIsNewQuizModalVisible] = useState(false);

  const parsedCount = parseInt(numberOfQuestions, 10) || 0;
  const isInvalidCount = parsedCount > MAX_QUESTIONS_PER_GENERATION || parsedCount < 1;
  const remainingGenerations = Math.max(0, MAX_GENERATIONS_PER_DAY - generationsUsedToday);
  const hasReachedDailyLimit = generationsUsedToday >= MAX_GENERATIONS_PER_DAY;

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<{ id: string; title: string }[]>([]);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // 🌟 NEW: Load this student's generation count on mount, and whenever the
  // logged-in student changes (resets automatically on a new day too).
  useEffect(() => {
    let isCancelled = false;
    const loadGenerationCount = async () => {
      setIsLimitLoaded(false);
      const storageKey = getGenerationLimitStorageKey(studentId);
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const todayKey = getTodayKey();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === todayKey) {
            if (!isCancelled) setGenerationsUsedToday(parsed.count || 0);
          } else {
            if (!isCancelled) setGenerationsUsedToday(0);
            await AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayKey, count: 0 }));
          }
        } else {
          if (!isCancelled) setGenerationsUsedToday(0);
          await AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayKey, count: 0 }));
        }
      } catch (err) {
        console.warn('Failed to load AI generation limit:', err);
      } finally {
        if (!isCancelled) setIsLimitLoaded(true);
      }
    };
    loadGenerationCount();
    return () => {
      isCancelled = true;
    };
  }, [studentId]);

  // 🆕 RESUME SUPPORT: check for a saved in-progress quiz whenever the
  // logged-in student changes (mirrors the generation-limit loader above).
  useEffect(() => {
    let isCancelled = false;
    const loadResumableSession = async () => {
      setIsResumeChecked(false);
      try {
        const raw = await AsyncStorage.getItem(getActiveSessionStorageKey(studentId));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0 && parsed.gameType) {
            if (!isCancelled) setResumableSession(parsed);
          } else if (!isCancelled) {
            setResumableSession(null);
          }
        } else if (!isCancelled) {
          setResumableSession(null);
        }
      } catch (err) {
        console.warn('Failed to load resumable quiz session:', err);
        if (!isCancelled) setResumableSession(null);
      } finally {
        if (!isCancelled) setIsResumeChecked(true);
      }
    };
    loadResumableSession();
    return () => {
      isCancelled = true;
    };
  }, [studentId]);

  // 🆕 PLAY AGAIN: whenever the parent asks us to (openNewQuizModal flips to
  // true), open the new-quiz modal and immediately tell the parent we've
  // handled it so it can reset its flag — otherwise the modal would just
  // reopen every time this component re-renders.
  useEffect(() => {
    if (openNewQuizModal) {
      setIsNewQuizModalVisible(true);
      if (onNewQuizModalOpened) onNewQuizModalOpened();
    }
  }, [openNewQuizModal]);

  // 🆕 RESUME SUPPORT: jump straight back into the saved quiz — no new
  // generation, no AI call, no dent in today's generation limit.
  const resumeSession = () => {
    if (!resumableSession) return;
    setGeneratedQuestions(resumableSession.questions);
    setGameType(resumableSession.gameType);
    setMode('quizmasters');
    if (onNavigate)
      onNavigate('quizmasters', resumableSession.questions, resumableSession.gameType, {
        classId: resumableSession.classId || '',
        materialIds: resumableSession.materialIds || [],
      });
  };

  // 🆕 RESUME SUPPORT: "Start New" — the student doesn't want to resume the
  // last generated quiz. This discards the saved session (so the banner
  // won't come back next visit) AND resets the Quiz Settings / class &
  // lesson selectors below, so they land on a clean form to pick again.
  const startNewSession = async () => {
    try {
      await AsyncStorage.removeItem(getActiveSessionStorageKey(studentId));
    } catch (err) {
      console.warn('Failed to discard resumable quiz session:', err);
    }
    setResumableSession(null);
    // Reset the whole selection screen so the student is choosing fresh,
    // not left with the previous quiz's leftover selections.
    setGeneratedQuestions(null);
    setGameType('');
    setNumberOfQuestions('10');
    setSelectedClassId('');
    setSelectedMaterialIds([]);
    setIsClassDropdownOpen(false);
  };

  // 🌟 NEW: Increment and persist this student's generation count
  // 🐛 FIX: previously incremented off the in-memory `generationsUsedToday`
  // state, which resets to 0 whenever Game.tsx remounts (e.g. every "Play
  // Again" — the screen switches away to quiz-masters and back, unmounting
  // and remounting Game) and only becomes correct again once the async
  // loadGenerationCount() effect resolves. If a generate call fired before
  // that reload finished, this computed `0 + 1 = 1` and OVERWROTE the real
  // persisted count instead of advancing it — so two generations in a row
  // could net out to only +1 recorded. Re-reading the persisted value here,
  // right before incrementing, means it's always correct regardless of
  // whether the in-memory state has caught up yet.
  const recordGenerationUsed = async () => {
    const storageKey = getGenerationLimitStorageKey(studentId);
    const todayKey = getTodayKey();
    let currentCount = generationsUsedToday;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.date === todayKey) {
          currentCount = parsed.count || 0;
        } else {
          currentCount = 0; // stale persisted count from a previous day
        }
      }
    } catch (err) {
      console.warn('Failed to re-read AI generation limit before recording use:', err);
    }
    const nextCount = currentCount + 1;
    setGenerationsUsedToday(nextCount);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayKey, count: nextCount }));
    } catch (err) {
      console.warn('Failed to persist AI generation limit:', err);
    }
  };

  const previousClassIdRef = React.useRef<string>('');

  useEffect(() => {
    const classChanged = previousClassIdRef.current !== selectedClassId;
    previousClassIdRef.current = selectedClassId;

    if (!selectedClassId) {
      setAvailableMaterials([]);
      if (classChanged) setSelectedMaterialIds([]);
      return;
    }
    const course = enrolledCourses.find(c => c.id === selectedClassId);
    setAvailableMaterials(course?.materials || []);
    // 🐛 FIX: only clear the user's checked materials when they actually
    // switch classes. Previously this ran on every `enrolledCourses` change
    // (e.g. a parent re-fetch/poll creating a new array reference), which
    // silently unchecked materials the user had already selected while they
    // were still picking, before hitting "Generate".
    if (classChanged) setSelectedMaterialIds([]);
  }, [selectedClassId, enrolledCourses]);

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setIsClassDropdownOpen(false);
  };

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterialIds(prev =>
      prev.includes(materialId) ? prev.filter(id => id !== materialId) : [...prev, materialId]
    );
  };

  const generateFromMaterials = async () => {
    if (!gameType) return Alert.alert('Selection required', 'Please select a game type first.');
    if (!selectedClassId || selectedMaterialIds.length === 0) return Alert.alert('Selection required', 'Please select a class and at least one material.');
    if (!studentId) return Alert.alert('Not logged in', 'Student ID missing.');
    if (isInvalidCount) return Alert.alert('Invalid count', `Please enter between 1 and ${MAX_QUESTIONS_PER_GENERATION} items.`);
    // 🌟 NEW: Enforce daily AI generation limit
    if (hasReachedDailyLimit) {
      return Alert.alert(
        'Daily limit reached',
        `You've used all ${MAX_GENERATIONS_PER_DAY} AI generations for today. Please try again tomorrow.`
      );
    }

    setIsGenerating(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/game-ai/generate-quiz-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          materialIds: selectedMaterialIds,
          studentId,
          gameType: gameType, 
          numberOfQuestions: parsedCount, 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      if (!data.questions?.length) throw new Error('No questions generated');

      setGeneratedQuestions(data.questions);
      setMode('quizmasters');
      // 🌟 NEW: Count this as one of today's AI generations
      await recordGenerationUsed();
      // 🆕 RESUME SUPPORT: remember this session so it can be picked back up
      // if the user closes the app/website before finishing. quiz-masters.tsx
      // clears this once the quiz is actually completed (or abandoned via
      // its back button, which already submits the current progress).
      try {
        await AsyncStorage.setItem(
          getActiveSessionStorageKey(studentId),
          JSON.stringify({
            questions: data.questions,
            gameType,
            savedAt: Date.now(),
            classId: selectedClassId,
            materialIds: selectedMaterialIds,
          })
        );
        setResumableSession({
          questions: data.questions,
          gameType,
          savedAt: Date.now(),
          classId: selectedClassId,
          materialIds: selectedMaterialIds,
        });
      } catch (err) {
        console.warn('Failed to save resumable quiz session:', err);
      }
      // 🆕 PLAY AGAIN: close the new-quiz modal (if that's how we got here)
      // now that generation succeeded and we're navigating to the quiz.
      setIsNewQuizModalVisible(false);
      // 🌟 PASS gameType (and class/lesson context, for class-record saving)
      // to the navigator
      if (onNavigate)
        onNavigate('quizmasters', data.questions, gameType, {
          classId: selectedClassId,
          materialIds: selectedMaterialIds,
        });
    } catch (error: any) {
      Alert.alert('Generation failed', error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedClassName = enrolledCourses.find(c => c.id === selectedClassId)?.name;

  // 🆕 Shared "Quiz Settings" + "Choose class & lesson" form. Used both
  // inline on the main Games screen (hidden while there's an unfinished
  // quiz, until "Start New" is tapped) AND inside the "Play Again" modal
  // (opened when the student finishes a quiz and wants to configure a new
  // one without leaving the results flow).
  const renderSetupForm = () => (
    <>
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Ionicons name="settings-outline" size={22} color="#D32F2F" />
          <Text style={styles.settingsTitle}>Quiz Settings</Text>
        </View>
        <Text style={styles.settingsSubtitle}>
          This configuration applies to the <Text style={{fontWeight: '700'}}>Class Lessons</Text> you select below.
        </Text>

        <View>
          <Text style={styles.inputLabel}>Number of Questions / Items (Max {MAX_QUESTIONS_PER_GENERATION})</Text>
          <TextInput
            style={[
              styles.questionsInput,
              isLargeScreen && styles.inputLarge,
              isInvalidCount && styles.questionsInputError,
            ]}
            placeholder="e.g., 10"
            placeholderTextColor="#999"
            value={numberOfQuestions}
            onChangeText={(text) => setNumberOfQuestions(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
          />
          {isInvalidCount && (
            <Text style={styles.errorText}>
              {parsedCount > MAX_QUESTIONS_PER_GENERATION ? `Maximum limit is ${MAX_QUESTIONS_PER_GENERATION} items.` : 'Please enter at least 1 item.'}
            </Text>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.inputLabel}>Game Type</Text>
          <View style={styles.gameTypeGrid}>
            {gameOptions.map((opt) => {
              const isSelected = gameType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.gameTypeChip, isSelected && styles.gameTypeChipSelected]}
                  onPress={() => setGameType(opt.value)}
                >
                  <Ionicons name={opt.icon} size={16} color={isSelected ? "#FFF" : "#D32F2F"} style={{ marginRight: 6 }} />
                  <Text style={[styles.gameTypeText, isSelected && styles.gameTypeTextSelected]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {!gameType && <Text style={[styles.errorText, { marginTop: 8 }]}>Please select a game type to continue.</Text>}
        </View>
      </View>

      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Choose class & lesson</Text>
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.inputLabel}>Select Class</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, isLargeScreen && styles.inputLarge]}
            onPress={() => setIsClassDropdownOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownTriggerText, !selectedClassName && styles.placeholderText]}>
              {selectedClassName || '-- Select a class --'}
            </Text>
            <Ionicons name={isClassDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>

        <Modal visible={isClassDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsClassDropdownOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsClassDropdownOpen(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select a Class</Text>
                <TouchableOpacity onPress={() => setIsClassDropdownOpen(false)}>
                  <Ionicons name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {enrolledCourses.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyText}>No enrolled classes found.</Text></View>
                ) : (
                  enrolledCourses.map(course => {
                    const isSelected = selectedClassId === course.id;
                    return (
                      <TouchableOpacity key={course.id} style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]} onPress={() => handleClassSelect(course.id)}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>{course.name}</Text>
                          <Text style={styles.dropdownItemSub}>{course.materials.length} materials available</Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={22} color="#D32F2F" />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {selectedClassId !== '' && (
          <View style={styles.materialsSection}>
            <View style={styles.materialsHeaderRow}>
              <Text style={styles.inputLabel}>Select one or more Lessons</Text>
              {selectedMaterialIds.length > 0 && (
                <TouchableOpacity onPress={() => setSelectedMaterialIds([])} hitSlop={8}>
                  <Text style={styles.clearSelectionText}>Clear ({selectedMaterialIds.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            {availableMaterials.length === 0 ? (
              <View style={styles.noMaterialsBox}>
                <Ionicons name="folder-open-outline" size={24} color="#999" />
                <Text style={styles.noMaterials}>No materials uploaded for this class yet.</Text>
              </View>
            ) : (
              <View style={styles.materialsGrid}>
                {availableMaterials.map(mat => {
                  const isSelected = selectedMaterialIds.includes(mat.id);
                  return (
                    <Pressable
                      key={mat.id}
                      style={[styles.materialChip, isSelected && styles.materialChipSelected]}
                      onPress={() => toggleMaterial(mat.id)}
                    >
                      <Ionicons
                        name={isSelected ? "document-text" : "document-text-outline"}
                        size={16}
                        color={isSelected ? "#FFF" : "#D32F2F"}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.materialTitle, isSelected && styles.materialTitleSelected]}>
                        {mat.title}
                      </Text>
                      {isSelected && (
                        <Ionicons name="close-circle" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <Pressable
          style={[
            styles.generateButton,
            isLargeScreen && styles.inputLarge,
            (!selectedClassId || selectedMaterialIds.length === 0 || isGenerating || isInvalidCount || !gameType || hasReachedDailyLimit) && styles.generateButtonDisabled,
          ]}
          onPress={generateFromMaterials}
          disabled={!selectedClassId || selectedMaterialIds.length === 0 || isGenerating || isInvalidCount || !gameType || hasReachedDailyLimit}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : !gameType ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Select a Game Type</Text>
            </View>
          ) : hasReachedDailyLimit ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="lock-closed-outline" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Daily Limit Reached</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles-outline" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Generate {gameOptions.find((g) => g.value === gameType)?.label || 'Quiz'}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </>
  );

  // 🆕 Hide the setup form while there's an unfinished quiz sitting on the
  // resume banner (avoids the student accidentally burning a generation or
  // getting confused about which quiz they're configuring). Also hidden
  // while the "Play Again" modal is open, so the same form isn't rendered
  // twice (once inline, once in the modal) at the same time.
  const shouldShowInlineSetupForm = !(isResumeChecked && resumableSession) && !isNewQuizModalVisible;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 🔥 NEW: "Games" title/subtitle, the AI-generations banner, the
          Quiz Settings card, and the Choose class & lesson card now all
          share one outer white card. settingsCard/selectorCard keep their
          own borders so they still read as distinct sub-sections. */}
      <View style={styles.gamesCard}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Games</Text>
          <Text style={styles.pageSubtitle}>Select a class and lessons to generate a quiz.</Text>
        </View>

        {/* 🌟 UPDATED: AI-generations badge now sits in the header row, top
            right, next to the "Games" title. On small screens it collapses
            to just the "7/10" fraction instead of the full sentence. */}
        {isLimitLoaded && (
          <View
            style={[
              styles.limitBadge,
              isLargeScreen ? styles.limitBadgeLarge : styles.limitBadgeCompact,
              hasReachedDailyLimit && styles.limitBannerReached,
            ]}
          >
            <Ionicons
              name={hasReachedDailyLimit ? 'alert-circle' : 'sparkles'}
              size={isLargeScreen ? 16 : 14}
              color={hasReachedDailyLimit ? '#D32F2F' : '#2E7D32'}
            />
            <Text
              style={[
                styles.limitBannerText,
                hasReachedDailyLimit && styles.limitBannerTextReached,
                !isLargeScreen && styles.limitBannerTextCompact,
              ]}
              numberOfLines={1}
            >
              {isLargeScreen
                ? hasReachedDailyLimit
                  ? `You've used all ${MAX_GENERATIONS_PER_DAY} AI generations today. Come back tomorrow!`
                  : `${remainingGenerations} of ${MAX_GENERATIONS_PER_DAY} AI generations remaining today`
                : `${remainingGenerations}/${MAX_GENERATIONS_PER_DAY} generations`}
            </Text>
          </View>
        )}
      </View>

      {/* 🆕 RESUME SUPPORT: offer to jump back into an unfinished quiz
          instead of forcing a fresh (and limit-consuming) generation.
          Styled like Dashboard's empty-state announcement card: icon on its
          own row up top, title on the next row, then the subtitle, then the
          (now larger) action buttons on the last row. */}
      {isResumeChecked && resumableSession && (
        <View style={styles.resumeBanner}>
          <Ionicons name="play-circle" size={32} color="#1565C0" />
          <Text style={styles.resumeBannerTitle}>You have an unfinished quiz</Text>
          <Text style={styles.resumeBannerSubtitle}>
            {gameOptions.find((g) => g.value === resumableSession.gameType)?.label || 'Quiz'} · {resumableSession.questions.length} items
          </Text>
          <View style={styles.resumeBannerActions}>
            <TouchableOpacity onPress={startNewSession} style={styles.startNewBtn}>
              <Text style={styles.startNewBtnText}>Start New</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resumeSession} style={styles.resumeBtn}>
              <Text style={styles.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 🆕 Quiz Settings / Choose class & lesson stay hidden while there's
          an unfinished quiz above — tapping "Start New" clears the resume
          banner (see startNewSession) which reveals this form again. */}
      {shouldShowInlineSetupForm && renderSetupForm()}
      </View>

      {/* 🆕 PLAY AGAIN: same setup form, presented as a modal. Opened
          automatically when the parent flips openNewQuizModal to true
          (student tapped "Play Again" on the results screen). */}
      <Modal
        visible={isNewQuizModalVisible}
        transparent
        animationType={isLargeScreen ? 'fade' : 'slide'}
        onRequestClose={() => setIsNewQuizModalVisible(false)}
      >
        <View style={[styles.modalOverlay, !isLargeScreen && styles.modalOverlayFullScreen]}>
          <View
            style={[
              styles.modalContent,
              styles.newQuizModalContent,
              isLargeScreen ? styles.newQuizModalContentLarge : styles.newQuizModalContentFullScreen,
              !isLargeScreen && { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start a New Quiz</Text>
              <TouchableOpacity onPress={() => setIsNewQuizModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {renderSetupForm()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  contentContainer: { padding: 24, paddingBottom: 40 },

  // 🔥 NEW: outer white card wrapping the "Games" title/subtitle, the
  // AI-generations banner, the Quiz Settings card, and the Choose class &
  // lesson card as one shared section.
  gamesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E5E9',
    borderRadius: 28,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  titleWrap: { flex: 1 },
  pageTitle: { fontFamily: FONT_TITLE, fontSize: 32, fontWeight: WEIGHT_TITLE, color: '#111', letterSpacing: -0.5 },
  pageSubtitle: { fontFamily: FONT_BODY, color: '#666', marginTop: 6, fontSize: 15, lineHeight: 22 },

  // 🌟 UPDATED: AI-generations badge, now a compact pill that sits in the
  // header row next to the "Games" title instead of its own full-width
  // banner. limitBadgeLarge/limitBadgeCompact tweak padding + sizing per
  // breakpoint; limitBannerText/limitBannerTextReached/limitBannerTextCompact
  // (below) handle the text itself.
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 100,
    flexShrink: 0,
  },
  limitBadgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 280,
  },
  limitBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  limitBannerReached: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFD7D7',
  },
  limitBannerText: { fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#2E7D32',
  },
  limitBannerTextReached: {
    color: '#D32F2F',
  },
  // 🌟 Small-screen text: just the "7/10 generations" fraction, in a
  // smaller font so the pill stays compact next to the title.
  limitBannerTextCompact: {
    fontSize: 11,
  },

  // 🆕 RESUME SUPPORT: "unfinished quiz" card, styled to match Dashboard's
  // empty-state announcement (white card, thin gray border, large radius,
  // centered content) instead of its own blue-tinted banner. Icon on its
  // own row, then title, then subtitle, then the (larger) action buttons.
  resumeBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E5E9',
    borderRadius: 30,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginBottom: 24,
  },
  // Row 2: title, right under the icon.
  resumeBannerTitle: { fontFamily: FONT_BODY,
    fontSize: 16,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#111',
    marginTop: 12,
    textAlign: 'center',
  },
  // Row 3: "Multiple Choice · 2 items" subtitle.
  resumeBannerSubtitle: { fontFamily: FONT_BODY,
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  // Row 4: larger action buttons.
  resumeBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  startNewBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#90A4AE',
    borderRadius: 100,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  startNewBtnText: { fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#455A64',
  },
  resumeBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 100,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  resumeBtnText: { fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#FFF',
  },

  settingsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 24,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  settingsTitle: { fontFamily: FONT_TITLE,
    fontSize: 20,
    fontWeight: WEIGHT_TITLE,
    color: '#111',
  },
  settingsSubtitle: { fontFamily: FONT_BODY,
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },

  selectorCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 24, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  selectorTitle: { fontFamily: FONT_TITLE, fontSize: 20, fontWeight: WEIGHT_TITLE, marginBottom: 24, color: '#111' },
  
  inputLabel: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: WEIGHT_EMPHASIS, color: '#444', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  // 🌟 On tablet/web/desktop, cap the width of the class dropdown, questions
  // input, and generate button so they don't stretch full width of the card.
  inputLarge: {
    maxWidth: 360,
  },
  
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  dropdownTriggerText: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: WEIGHT_EMPHASIS, color: '#111', flex: 1 },
  placeholderText: { fontFamily: FONT_BODY, color: '#999', fontWeight: WEIGHT_EMPHASIS },
  
  questionsInput: { fontFamily: FONT_BODY,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#111',
    minHeight: 56,
  },
  questionsInputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  errorText: { fontFamily: FONT_BODY,
    color: '#F44336',
    fontSize: 12,
    fontWeight: WEIGHT_EMPHASIS,
    marginTop: 6,
  },

  // 🌟 Game Type Grid Styles
  gameTypeGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10 
  },
  gameTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  gameTypeChipSelected: { 
    backgroundColor: '#D32F2F', 
    borderColor: '#D32F2F' 
  },
  gameTypeText: { fontFamily: FONT_BODY, 
    fontSize: 13, 
    fontWeight: WEIGHT_EMPHASIS, 
    color: '#444' 
  },
  gameTypeTextSelected: { 
    color: '#FFF' 
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: WEIGHT_TITLE, color: '#111' },
  // 🆕 PLAY AGAIN: the "new quiz" modal reuses modalContent, but needs more
  // height (and a taller max) since it holds the whole settings + selector
  // form, not just a single scrollable list.
  newQuizModalContent: {
    maxHeight: '88%',
  },
  // 🆕 RESPONSIVE: on tablet/web/desktop, keep the centered-card look but
  // make it noticeably wider than the default 480 modal (more room for the
  // class dropdown, material chips, and question count/generate row side by
  // side without everything feeling cramped).
  newQuizModalContentLarge: {
    maxWidth: 720,
  },
  // 🆕 RESPONSIVE: on phones, drop the centered "card" look entirely and go
  // full screen — fill the whole viewport, no rounded corners/margins, so
  // there's no wasted space around the form on a small screen.
  newQuizModalContentFullScreen: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
  },
  // Full-screen variant of the overlay: no centering/padding so the card
  // above can stretch edge-to-edge instead of floating in the middle.
  modalOverlayFullScreen: {
    padding: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalList: { padding: 12 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: '#FAFAFA',
  },
  dropdownItemSelected: { backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFD7D7' },
  dropdownItemText: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: WEIGHT_EMPHASIS, color: '#333' },
  dropdownItemTextSelected: { color: '#D32F2F' },
  dropdownItemSub: { fontFamily: FONT_BODY, fontSize: 12, color: '#888', marginTop: 2, fontWeight: WEIGHT_EMPHASIS },
  emptyState: { padding: 30, alignItems: 'center' },
  emptyText: { fontFamily: FONT_BODY, color: '#999', fontSize: 14 },

  materialsSection: { marginBottom: 24 },
  materialsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  materialsHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},
clearSelectionText: { fontFamily: FONT_BODY,
  color: '#D32F2F',
  fontSize: 13,
  fontWeight: WEIGHT_EMPHASIS,
},
  materialChipSelected: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  materialTitle: { fontFamily: FONT_TITLE, fontSize: 13, fontWeight: WEIGHT_TITLE, color: '#444', flexShrink: 1 },
  materialTitleSelected: { color: '#FFF' },
  noMaterialsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  noMaterials: { fontFamily: FONT_BODY, color: '#999', fontSize: 14, fontStyle: 'italic' },

  generateButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  generateButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  generateButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, fontSize: 16, letterSpacing: 0.3 },
});

export default Game;