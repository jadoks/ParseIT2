import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../../theme/typography';
// ✅ Reuses the same Toast component used across the app instead of native Alert dialogs.
import Toast from '../../Final_Admin_Components/Toast';
// Shared responsive tokens (breakpoints, font scale, spacing) — also used by quiz-masters.
import { ResponsiveInfo, useResponsive } from './gameResponsive';

type ToastType = 'success' | 'error' | 'info';

// Text that stops growing past 1.3x the user's system font size, so large
// accessibility fonts can't break the game layouts.
const AppText: React.FC<React.ComponentProps<typeof Text>> = (props) => (
  <Text maxFontSizeMultiplier={1.3} {...props} />
);

// 🆕 AI GRADING: same backend base-url resolution as Game.tsx / quiz-masters.tsx
// (duplicated rather than imported since these files don't currently share a
// utils module).
function getGameAiBaseUrl() {
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

function normalizeText(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// 🆕 AI GRADING: used by Flashcards and Fill-in-the-Blanks — the two
// free-text question types — so a student who has the right idea but
// phrases it differently from the accepted answer isn't marked wrong on a
// graded assignment. An exact/normalized match resolves instantly with no
// network call; anything else is sent to the backend (Gemini) for a
// semantic judgement. If that call fails for any reason, we fail safe back
// to the exact-match behavior rather than blocking assignment submission.
type GradedAnswer = { isCorrect: boolean; feedback?: string };

async function gradeFreeTextAnswer(
  question: string,
  correctAnswer: string,
  studentAnswer: string
): Promise<GradedAnswer> {
  if (normalizeText(studentAnswer) === normalizeText(correctAnswer)) {
    return { isCorrect: true };
  }
  if (!studentAnswer.trim()) {
    return { isCorrect: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await apiFetch(`${API_BASE_URL}/game-ai/grade-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, correctAnswer, studentAnswer }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Grading request failed (${response.status})`);
    const data = await response.json();
    return {
      isCorrect: !!data.isCorrect,
      feedback: typeof data.feedback === 'string' ? data.feedback : undefined,
    };
  } catch (error) {
    console.warn('AI grading unavailable, falling back to exact match:', error);
    return { isCorrect: normalizeText(studentAnswer) === normalizeText(correctAnswer) };
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface GameQuestion {
  id: string;
  question: string;
  options?: string[];
  answer: string;
  correctIndex?: number;
}

interface GameBasedAssignmentProps {
  assignmentTitle: string;
  questions: GameQuestion[];
  gameType: string;
  timeLimitMinutes?: number | null; //  Global time limit in MINUTES
  onBack: () => void;
  onComplete: (score: number, total: number) => void;
  // ✅ NEW: identify which assignment/student this playthrough belongs to,
  // so in-progress answers can be saved locally and resumed later — even
  // if the student backs out, closes the tab, or force-quits the app
  // mid-game. Without an assignmentId, progress simply isn't persisted.
  assignmentId?: string;
  studentId?: string;
}

// ✅ NEW: Builds the AsyncStorage key used to save/restore in-progress game
// state for a given student + assignment. Namespaced by studentId (mirrors
// Game.tsx's per-student storage keys) so a shared/kiosk device doesn't mix
// up two different students' progress on the same assignment.
function getGameProgressStorageKey(assignmentId?: string, studentId?: string) {
  return `gameProgress_${studentId || 'anonymous'}_${assignmentId || 'unknown'}`;
}

const GameBasedAssignment: React.FC<GameBasedAssignmentProps> = ({
  assignmentTitle,
  questions,
  gameType,
  timeLimitMinutes,
  onBack,
  onComplete,
  assignmentId,
  studentId,
}) => {
  const r = useResponsive();
  const styles = useMemo(() => createStyles(r), [r]);

  // The sticky bottom bar (feedback + Next / Submit button) is collected while
  // a game renders via setFooter(...), then drawn outside the scrolling page so
  // it is always on screen — however small the device or long the question.
  const footerSlot: { node: React.ReactNode } = { node: null };
  const setFooter = (node: React.ReactNode) => {
    footerSlot.node = node;
    return null;
  };

  // ✅ Toast state — replaces native Alert usage with the shared Toast UI.
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Flashcard specific
  const [flashcardAnswer, setFlashcardAnswer] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSubmitted, setFlashcardSubmitted] = useState(false);
  // 🆕 AI GRADING: grading is now an async call for flashcard/fill-in-blanks
  // free text — track an in-flight state (disable the button / show a
  // spinner) and any feedback line the grader returned with its verdict.
  const [isGradingAnswer, setIsGradingAnswer] = useState(false);

  // The page scrolls now, so the question card simply sizes to its text
  // (and stretches to fill spare height on tall screens).
  const fixedQuestionCardStyle = styles.fixedQuestionCard;
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);

  // Memory match specific (Two-column matching)
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [memoryCards, setMemoryCards] = useState<any[]>([]);
  const [termAnswers, setTermAnswers] = useState<Record<number, number>>({});
  const [matchingSubmitted, setMatchingSubmitted] = useState(false);

  // UPDATED: Added selectedText and correctText to store full sentences
  const [matchingResults, setMatchingResults] = useState<
    Record<number, {
      selectedLetter: string;
      selectedText: string;   // Full sentence user chose
      correctLetter: string;
      correctText: string;    // Full correct sentence
      isCorrect: boolean;
    }>
  >({});

  // GLOBAL TIMER STATE (in seconds)
  const [globalTimeLeft, setGlobalTimeLeft] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const scoreRef = useRef(score);

  // Keep score ref in sync for timer closure
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Summary & Review State
  const [gameFinished, setGameFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, { selected: string | number | null, isCorrect: boolean }>>({});

  // ✅ NEW: Resume-in-progress support. Starts false so the very first
  // frame doesn't flash "Question 1" before a saved attempt (if any) has
  // had a chance to load and jump the student back to where they left off.
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);

  // Initialize global timer on mount
  useEffect(() => {
    if (timeLimitMinutes && timeLimitMinutes > 0) {
      setGlobalTimeLeft(timeLimitMinutes * 60);
    } else {
      setGlobalTimeLeft(null); // Unlimited
    }
  }, [timeLimitMinutes]);

  // Page scroll: jump back to the top on every new question / card / summary.
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentIndex, gameFinished]);

  // Handle Time Up
  // 🌟 UPDATED: Only finalizes local state and shows the Review screen.
  // It does NOT call onComplete anymore — onComplete is what triggers the
  // parent's submit-to-backend + navigate-away flow, and that should only
  // happen once the student actively taps "Done" / "Return Home" on the
  // Review screen below, not automatically a few seconds after time runs out.
  const handleTimeUp = () => {
    setIsTimeUp(true);

    // If the student was mid-way through a Memory Match round, grade
    // whatever pairs they had selected so the Review screen has results
    // to show (mirrors the logic in handleSubmitMatching, minus the
    // auto-advance timeout since we're forcing completion here anyway).
    if (gameType === 'memory_match' && !matchingSubmitted) {
      finalizeMatchingResults();
    }

    // Force switch to Summary/Review screen
    setGameFinished(true);

    // Show toast over the summary screen — score is NOT submitted yet.
    showToast("Time's up! Review your answers, then tap Done.", 'info');
  };

  // Global Countdown Effect
  useEffect(() => {
    if (globalTimeLeft === null || globalTimeLeft <= 0 || gameFinished || isTimeUp) return;

    const timer = setInterval(() => {
      setGlobalTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [globalTimeLeft, gameFinished, isTimeUp]);

  // Format Timer Display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (gameType === 'memory_match') {
      const cards: any[] = [];
      questions.forEach((q, idx) => {
        cards.push({ id: `term-${idx}`, text: q.question, pairId: idx, type: 'term', column: 'A' });
        cards.push({ id: `def-${idx}`, text: q.answer, pairId: idx, type: 'def', column: 'B' });
      });
      // Shuffle cards within each column independently
      const terms = cards.filter(c => c.type === 'term').sort(() => Math.random() - 0.5);
      const defs = cards.filter(c => c.type === 'def').sort(() => Math.random() - 0.5);
      setTermAnswers({});
      setMatchingResults({});
      setMatchingSubmitted(false);
      setSelectedTerm(null);
      setMemoryCards([...terms, ...defs]);
    }
  }, [gameType, questions]);

  // 🌟 UPDATED: This used to be a useEffect keyed on [currentIndex, gameType],
  // which reset the per-question fields as a *side effect of currentIndex
  // changing*. That meant restoring a saved currentIndex (to resume an
  // in-progress attempt) would immediately wipe out the very
  // hasAnswered/selectedOption/flashcardAnswer/etc. state we'd just
  // restored for that question. Now it's a plain function called only from
  // handleNext, exactly when the student actively advances to a new
  // question/card — so resuming saved progress (including a
  // half-answered current question) is never clobbered.
  const resetPerQuestionState = () => {
    if (gameType === 'quiz_master') {
      setHasAnswered(false);
      setSelectedOption(null);
      setIsCorrect(null);
    } else if (gameType === 'flashcard') {
      setFlashcardAnswer('');
      setIsFlipped(false);
      setFlashcardSubmitted(false);
      setIsCorrect(null);
      setIsGradingAnswer(false);
      setAnswerFeedback(null);
    } else if (gameType === 'fill_in_blanks') {
      setFlashcardAnswer('');
      setHasAnswered(false);
      setIsCorrect(null);
      setIsGradingAnswer(false);
      setAnswerFeedback(null);
    }
  };

  // ✅ NEW: Restore any saved in-progress attempt for this assignment.
  // Runs once on mount. If a matching save is found (same assignment,
  // student, question count, and game type), it jumps the student back to
  // exactly where they left off — including a half-answered current
  // question — instead of restarting from Question 1. If nothing is
  // saved, the game simply starts fresh as before.
  useEffect(() => {
    let cancelled = false;
    const loadSavedProgress = async () => {
      try {
        const key = getGameProgressStorageKey(assignmentId, studentId);
        const raw = await AsyncStorage.getItem(key);
        if (raw && !cancelled) {
          const saved = JSON.parse(raw);
          const looksValid =
            saved &&
            saved.gameType === gameType &&
            saved.totalQuestions === questions.length;
          if (looksValid) {
            setCurrentIndex(
              Math.min(Math.max(saved.currentIndex ?? 0, 0), Math.max(questions.length - 1, 0))
            );
            setScore(saved.score ?? 0);
            setUserAnswers(saved.userAnswers ?? {});
            setGameFinished(!!saved.gameFinished);
            setIsTimeUp(!!saved.isTimeUp);
            if (typeof saved.globalTimeLeft === 'number') {
              setGlobalTimeLeft(saved.globalTimeLeft);
            }
            // quiz_master / fill_in_blanks — resume a half-answered question
            setHasAnswered(!!saved.hasAnswered);
            setSelectedOption(saved.selectedOption ?? null);
            setIsCorrect(saved.isCorrect ?? null);
            // flashcard
            setFlashcardAnswer(saved.flashcardAnswer ?? '');
            setIsFlipped(!!saved.isFlipped);
            setFlashcardSubmitted(!!saved.flashcardSubmitted);
            // memory match — restore the same shuffled layout + pairings
            if (saved.gameType === 'memory_match') {
              if (Array.isArray(saved.memoryCards) && saved.memoryCards.length > 0) {
                setMemoryCards(saved.memoryCards);
              }
              setTermAnswers(saved.termAnswers ?? {});
              setMatchingResults(saved.matchingResults ?? {});
              setMatchingSubmitted(!!saved.matchingSubmitted);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load saved game progress:', err);
      } finally {
        if (!cancelled) setIsProgressLoaded(true);
      }
    };
    loadSavedProgress();
    return () => {
      cancelled = true;
    };
    // Intentionally runs once on mount — assignmentId/studentId/gameType
    // are stable for the lifetime of a single playthrough screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ NEW: Keep the saved attempt up to date after every meaningful change,
  // so a back button, closed tab, or killed app never loses progress.
  // Skipped until the initial restore above has finished, so we don't
  // stomp a real saved attempt with the component's brand-new default
  // state during the split second before it's loaded.
  useEffect(() => {
    if (!isProgressLoaded) return;
    const key = getGameProgressStorageKey(assignmentId, studentId);
    const snapshot = {
      totalQuestions: questions.length,
      gameType,
      currentIndex,
      score,
      userAnswers,
      gameFinished,
      isTimeUp,
      globalTimeLeft,
      hasAnswered,
      selectedOption,
      isCorrect,
      flashcardAnswer,
      isFlipped,
      flashcardSubmitted,
      termAnswers,
      matchingResults,
      matchingSubmitted,
      memoryCards,
      savedAt: Date.now(),
    };
    AsyncStorage.setItem(key, JSON.stringify(snapshot)).catch((err) => {
      console.warn('Failed to save game progress:', err);
    });
  }, [
    isProgressLoaded,
    assignmentId,
    studentId,
    questions.length,
    gameType,
    currentIndex,
    score,
    userAnswers,
    gameFinished,
    isTimeUp,
    globalTimeLeft,
    hasAnswered,
    selectedOption,
    isCorrect,
    flashcardAnswer,
    isFlipped,
    flashcardSubmitted,
    termAnswers,
    matchingResults,
    matchingSubmitted,
    memoryCards,
  ]);

  // ✅ NEW: Wipes the saved attempt once it's actually been submitted as a
  // final score — a fresh "Play Again" attempt should start clean, not
  // resume the attempt that was just graded.
  const clearSavedProgress = async () => {
    try {
      await AsyncStorage.removeItem(getGameProgressStorageKey(assignmentId, studentId));
    } catch (err) {
      console.warn('Failed to clear saved game progress:', err);
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleFinishGame = () => {
    setGameFinished(true);
  };

  // This function acts as "Return Home" / Final Submit
  const handleSubmitGame = () => {
    clearSavedProgress();
    onComplete(score, questions.length);
  };

  const handleSelectOption = (index: number) => {
    if (hasAnswered) return;
    setSelectedOption(index);
    setHasAnswered(true);
    const correct = index === currentQuestion.correctIndex;
    setIsCorrect(correct);
    if (correct) {
      setScore(prev => prev + 1);
    }
    setUserAnswers(prev => ({ ...prev, [currentIndex]: { selected: currentQuestion.options?.[index] ?? '', isCorrect: correct } }));
  };

  const handleFlashcardSubmit = async () => {
    if (!flashcardAnswer.trim() || isGradingAnswer) return;
    setIsGradingAnswer(true);
    setAnswerFeedback(null);
    try {
      const { isCorrect: correct, feedback } = await gradeFreeTextAnswer(
        currentQuestion.question,
        currentQuestion.answer,
        flashcardAnswer
      );
      setFlashcardSubmitted(true);
      // Correct: reveal the card right away. Wrong: the student taps
      // "Tap to See Answer" first, so the flip is a deliberate step.
      setIsFlipped(correct);
      setIsCorrect(correct);
      setAnswerFeedback(feedback || null);
      if (correct) {
        setScore(prev => prev + 1);
      }
      setUserAnswers(prev => ({ ...prev, [currentIndex]: { selected: flashcardAnswer, isCorrect: correct } }));
    } finally {
      setIsGradingAnswer(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      resetPerQuestionState();
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinishGame();
    }
  };

  // One-to-one matching: every term owns at most one choice and every choice
  // belongs to at most one term. Tapping an already-paired card "picks it up"
  // so it can be re-paired; picking a choice that another term holds steals it
  // (the previous owner becomes unpaired).
  const handleMemoryCardPress = (card: any) => {
    if (matchingSubmitted) return;

    if (card.type === 'term') {
      if (selectedTerm === card.pairId) {
        setSelectedTerm(null);
        return;
      }
      setTermAnswers(prev => {
        const next = { ...prev };
        delete next[card.pairId];
        return next;
      });
      setSelectedTerm(card.pairId);
      return;
    }

    if (card.type === 'def') {
      const ownerKey = Object.keys(termAnswers).find(
        k => termAnswers[Number(k)] === card.pairId
      );

      // Nothing selected: tapping a paired choice picks it back up.
      if (selectedTerm === null) {
        if (ownerKey !== undefined) {
          const ownerId = Number(ownerKey);
          setTermAnswers(prev => {
            const next = { ...prev };
            delete next[ownerId];
            return next;
          });
          setSelectedTerm(ownerId);
        }
        return;
      }

      setTermAnswers(prev => {
        const next: Record<number, number> = {};
        Object.keys(prev).forEach(k => {
          if (prev[Number(k)] !== card.pairId) next[Number(k)] = prev[Number(k)];
        });
        next[selectedTerm] = card.pairId;
        return next;
      });
      setSelectedTerm(null);
    }
  };

  // UPDATED: Capture both Letter AND Full Sentence text
  // Shared grading logic used both by the manual "Submit" button and by
  // handleTimeUp (when the timer runs out mid-match). Returns nothing —
  // it commits the graded results into state.
  const finalizeMatchingResults = () => {
    const defs = memoryCards.filter(c => c.type === 'def');

    let correctCount = 0;

    const reviewResults: any = {};
    const reviewAnswers: any = {};

    questions.forEach((q, idx) => {
      const selectedDefId = termAnswers[idx];

      const correct = selectedDefId === idx;

      if (correct) {
        correctCount++;
      }

      const selectedIndex = defs.findIndex(
        d => d.pairId === selectedDefId
      );

      const correctIndex = defs.findIndex(
        d => d.pairId === idx
      );

      const selectedLetter =
        selectedIndex >= 0
          ? String.fromCharCode(65 + selectedIndex)
          : 'No Answer';

      const correctLetter =
        correctIndex >= 0
          ? String.fromCharCode(65 + correctIndex)
          : '';

      // NEW: Get the actual full text strings
      const selectedText = selectedIndex >= 0 ? defs[selectedIndex].text : 'No Answer';
      const correctText = correctIndex >= 0 ? defs[correctIndex].text : '';

      reviewResults[idx] = {
        selectedLetter,
        selectedText,       // Full sentence user picked
        correctLetter,
        correctText,        // Full correct sentence
        isCorrect: correct,
      };

      reviewAnswers[idx] = {
        // Combine letter + text for unified summary display
        selected: `${selectedLetter}: ${selectedText}`,
        isCorrect: correct,
      };
    });

    setMatchingResults(reviewResults);
    setUserAnswers(reviewAnswers);
    setScore(correctCount);
    setMatchingSubmitted(true);
  };

  const handleSubmitMatching = () => {
    finalizeMatchingResults();

    setTimeout(() => {
      handleFinishGame();
    }, 500);
  };

  // Unified Header with Global Timer
  const renderHeader = (progressText: string) => (
    <View style={styles.header}>
      <AppText style={styles.progressText} numberOfLines={1}>
        {progressText}
      </AppText>

      {/* Global Timer Badge */}
      {globalTimeLeft !== null && (
        <View style={[styles.timerBadge, globalTimeLeft <= 60 && styles.timerBadgeUrgent]}>
          <Ionicons
            name="time-outline"
            size={r.isSmallPhone ? 14 : 16}
            color={globalTimeLeft <= 60 ? '#D32F2F' : '#FFF'}
          />
          <AppText style={[styles.timerText, globalTimeLeft <= 60 && styles.timerTextUrgent]} numberOfLines={1}>
            {gameType === 'quiz_master' ? 'Time Limit ' : ''}{formatTime(globalTimeLeft)}
          </AppText>
        </View>
      )}

      <AppText style={styles.scoreText} numberOfLines={1}>
        Score: {score}/{questions.length}
      </AppText>
    </View>
  );

  // Render Summary & Review Screen
  const renderSummary = () => {
    const totalQuestions = questions.length;
    const correctCount = Object.values(userAnswers).filter(a => a.isCorrect).length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.summaryHeader}>
          <Ionicons
            name={percentage >= 75 ? 'trophy' : 'school'}
            size={r.isDesktop ? 80 : r.isTablet ? 70 : r.isSmallPhone ? 48 : 60}
            color={percentage >= 75 ? '#FFC107' : '#2196F3'}
          />
          <AppText style={styles.summaryTitle}>Game Completed!</AppText>
          <AppText style={styles.summaryScore}>{score} / {totalQuestions}</AppText>
          <AppText style={styles.summaryPercentage}>{percentage}% Accuracy</AppText>
          <AppText style={styles.summarySubtext}>
            You got {correctCount} out of {totalQuestions} correct.
          </AppText>
        </View>

        <AppText style={styles.reviewTitle}>Review Your Answers</AppText>
        <View style={styles.reviewList}>
          {questions.map((q, idx) => {
            const userAns = userAnswers[idx];
            const isAnsCorrect = userAns?.isCorrect || false;

            const userAnswerText =
              userAns?.selected !== null &&
              userAns?.selected !== undefined
                ? String(userAns.selected)
                : 'No answer';

            const correctAnswerText =
              q.options
                ? q.options[q.correctIndex!]
                : q.answer;

            return (
              <View
                key={idx}
                style={[
                  styles.reviewItem,
                  isAnsCorrect
                    ? styles.reviewCorrect
                    : styles.reviewWrong,
                ]}
              >
                <View style={styles.reviewItemHeader}>
                  <Ionicons
                    name={
                      isAnsCorrect
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={20}
                    color={
                      isAnsCorrect
                        ? '#4CAF50'
                        : '#F44336'
                    }
                  />

                  <AppText
                    style={styles.reviewQuestionText}
                    numberOfLines={2}
                  >
                    Q{idx + 1}: {q.question}
                  </AppText>
                </View>

                <View style={styles.reviewAnswers}>
                  {gameType === 'memory_match' ? (
                    <>
                      {/* UPDATED: Show Letter + Full Sentence */}
                      <AppText style={styles.reviewUserAnswer}>
                        Your Answer:{'\n'}
                        {matchingResults[idx]?.selectedLetter || 'No Answer'}: {' '}
                        {matchingResults[idx]?.selectedText || 'No Answer'}
                      </AppText>

                      {/* Only show correct answer if wrong */}
                      {!isAnsCorrect && (
                        <AppText style={styles.reviewCorrectAnswer}>
                          Correct Answer:{'\n'}
                          {matchingResults[idx]?.correctLetter}: {' '}
                          {matchingResults[idx]?.correctText}
                        </AppText>
                      )}

                      <AppText
                        style={{
                          marginTop: r.spacing.xs + 4,
                          fontWeight: '700',
                          color:
                            matchingResults[idx]?.isCorrect
                              ? '#4CAF50'
                              : '#F44336',
                        }}
                      >
                        {matchingResults[idx]?.isCorrect
                          ? '✓ Correct'
                          : ' Wrong'}
                      </AppText>
                    </>
                  ) : (
                    <>
                      <AppText style={styles.reviewUserAnswer}>
                        Your Answer: {userAnswerText}
                      </AppText>

                      {!isAnsCorrect && (
                        <AppText
                          style={styles.reviewCorrectAnswer}
                        >
                          Correct Answer:{' '}
                          {correctAnswerText}
                        </AppText>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {setFooter(
          <>
        {isTimeUp && (
          <AppText style={styles.timeUpNotice}>
            ⏱ Time's up — tap Done when you're ready to submit your score.
          </AppText>
        )}

        {/* This button is the ONLY thing that submits the score and exits.
            It stays here until the student actively taps it — nothing
            navigates away automatically, even after a timeout. */}
        <TouchableOpacity style={[styles.nextButton, styles.stickyButton]} onPress={handleSubmitGame}>
          <AppText style={styles.nextButtonText}>{isTimeUp ? 'Done' : 'Return Home'}</AppText>
        </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  // Compact response bar used by every fixed-layout game. It lives in a fixed
  // slot at the bottom so answering never pushes the page taller / scrollable.
  const renderFeedbackBar = (
    correct: boolean,
    title: string,
    lines: Array<string | null | undefined>,
    label: string,
    onPress: () => void = handleNext
  ) => (
    <View style={[styles.feedbackBar, correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
      <AppText style={[styles.feedbackTitle, { color: correct ? '#2E7D32' : '#C62828' }]}>{title}</AppText>
      {lines.filter(Boolean).length > 0 && (
        <View style={styles.feedbackLines}>
          {lines.filter(Boolean).map((line, i) => (
            <AppText key={i} style={styles.feedbackLine}>{line}</AppText>
          ))}
        </View>
      )}
      <TouchableOpacity style={[styles.nextButton, styles.feedbackNextButton]} onPress={onPress}>
        <AppText style={styles.nextButtonText}>{label}</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderQuizMaster = () => (
    <View style={styles.gameContainer}>
      {renderHeader(`Question ${currentIndex + 1} / ${questions.length}`)}

      <View style={fixedQuestionCardStyle}>
        <View style={styles.fixedQuestionScroll}>
          <AppText style={styles.questionText}>{currentQuestion.question}</AppText>
        </View>
      </View>

      <View style={styles.optionsContainer}>
        {currentQuestion.options?.map((opt, idx) => {
          let bgColor = '#FFF';
          let borderColor = '#DDD';
          let textColor = '#333';

          if (hasAnswered) {
            if (idx === currentQuestion.correctIndex) {
              bgColor = '#E8F5E9'; borderColor = '#4CAF50'; textColor = '#2E7D32';
            } else if (idx === selectedOption && idx !== currentQuestion.correctIndex) {
              bgColor = '#FFEBEE'; borderColor = '#F44336'; textColor = '#C62828';
            }
          }

          return (
            <TouchableOpacity
              key={idx}
              style={[styles.optionButton, { backgroundColor: bgColor, borderColor }]}
              onPress={() => handleSelectOption(idx)}
              disabled={hasAnswered}
            >
              <AppText style={[styles.optionText, { color: textColor }]}>{opt}</AppText>
              {hasAnswered && idx === currentQuestion.correctIndex && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              )}
              {hasAnswered && idx === selectedOption && idx !== currentQuestion.correctIndex && (
                <Ionicons name="close-circle" size={24} color="#F44336" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {setFooter(
        <>
        {hasAnswered ? (
          renderFeedbackBar(
            !!isCorrect,
            isCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌',
            [!isCorrect ? `Correct answer: ${currentQuestion.options?.[currentQuestion.correctIndex!]}` : null],
            currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'
          )
        ) : (
          <View style={styles.footerHint}>
            <AppText style={styles.footerHintText}>Choose an answer</AppText>
          </View>
        )}
        </>
      )}
    </View>
  );

  const renderFlashcard = () => (
    <View style={styles.gameContainer}>
      {renderHeader(`Card ${currentIndex + 1} / ${questions.length}`)}

      <View style={styles.flashcardOuter}>
        <View style={[styles.flashcardContainer, isFlipped && styles.flashcardFlipped]}>
          <View style={[styles.flashcardScrollFill, styles.flashcardScroll]}>
            {!isFlipped ? (
              <>
                <Ionicons name="help-circle-outline" size={r.isSmallPhone ? 32 : 40} color="#8B0000" />
                <AppText style={styles.flashcardQuestion}>{currentQuestion.question}</AppText>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={r.isSmallPhone ? 32 : 40} color="#4CAF50" />
                <AppText style={styles.flashcardAnswerText}>{currentQuestion.answer}</AppText>
              </>
            )}
          </View>
        </View>
      </View>

      {setFooter(
        <>
        {!flashcardSubmitted ? (
          <View style={styles.flashcardInputContainer}>
            <TextInput
              maxFontSizeMultiplier={1.3}
              style={[styles.flashcardInput, styles.fixedInput]}
              placeholder="Type your answer here..."
              placeholderTextColor="#999"
              value={flashcardAnswer}
              onChangeText={setFlashcardAnswer}
              multiline
              editable={!isGradingAnswer}
            />
            <TouchableOpacity
              style={[styles.nextButton, styles.feedbackNextButton, (!flashcardAnswer.trim() || isGradingAnswer) && styles.nextButtonDisabled]}
              onPress={handleFlashcardSubmit}
              disabled={!flashcardAnswer.trim() || isGradingAnswer}
            >
              {isGradingAnswer ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <AppText style={styles.nextButtonText}>Submit & Flip Card</AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          !isCorrect && !isFlipped
            ? renderFeedbackBar(
                false,
                'Incorrect ❌',
                [],
                'Tap to See Answer',
                () => setIsFlipped(true)
              )
            : renderFeedbackBar(
                !!isCorrect,
                isCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌',
                [!isCorrect ? `Your answer: ${flashcardAnswer}` : null],
                currentIndex < questions.length - 1 ? 'Next Card' : 'Finish Game'
              )
        )}
        </>
      )}
    </View>
  );

  const handleFillBlankSubmit = async () => {
    if (!flashcardAnswer.trim() || isGradingAnswer) return;
    setIsGradingAnswer(true);
    setAnswerFeedback(null);
    try {
      const { isCorrect: correct, feedback } = await gradeFreeTextAnswer(
        currentQuestion.question,
        currentQuestion.answer,
        flashcardAnswer
      );
      setHasAnswered(true);
      setIsCorrect(correct);
      setAnswerFeedback(feedback || null);
      if (correct) setScore(prev => prev + 1);
      setUserAnswers(prev => ({ ...prev, [currentIndex]: { selected: flashcardAnswer, isCorrect: correct } }));
    } finally {
      setIsGradingAnswer(false);
    }
  };

  const renderFillInBlanks = () => (
    <View style={styles.gameContainer}>
      {renderHeader(`Question ${currentIndex + 1} / ${questions.length}`)}

      <View style={fixedQuestionCardStyle}>
        <View style={styles.fixedQuestionScroll}>
          <AppText style={styles.questionText}>{currentQuestion.question}</AppText>
        </View>
      </View>

      {setFooter(
        <>
        {!hasAnswered ? (
          <View style={styles.flashcardInputContainer}>
            <TextInput
              maxFontSizeMultiplier={1.3}
              style={[styles.flashcardInput, styles.fixedInput]}
              placeholder="Type the missing word..."
              placeholderTextColor="#999"
              value={flashcardAnswer}
              onChangeText={setFlashcardAnswer}
              editable={!isGradingAnswer}
            />
            <TouchableOpacity
              style={[styles.nextButton, styles.feedbackNextButton, (!flashcardAnswer.trim() || isGradingAnswer) && styles.nextButtonDisabled]}
              onPress={handleFillBlankSubmit}
              disabled={!flashcardAnswer.trim() || isGradingAnswer}
            >
              {isGradingAnswer ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <AppText style={styles.nextButtonText}>Submit Answer</AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          renderFeedbackBar(
            !!isCorrect,
            isCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌',
            [!isCorrect ? `Correct answer: ${currentQuestion.answer}` : null, answerFeedback],
            currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'
          )
        )}
        </>
      )}
    </View>
  );

  const renderMemoryMatch = () => {
    const terms = memoryCards.filter(c => c.type === 'term');
    const defs = memoryCards.filter(c => c.type === 'def');
    const pairedCount = Object.keys(termAnswers).length;
    const allAnswered = pairedCount === questions.length;
    const activeTermIndex =
      selectedTerm !== null ? terms.findIndex(t => t.pairId === selectedTerm) : -1;
    const activeColor = activeTermIndex >= 0 ? matchColor(activeTermIndex) : null;

    return (
      <View style={styles.gameContainer}>
        {renderHeader('Match Terms to Definitions')}

        <AppText style={styles.memoryMatchInstructions}>
          Pick a term, then pick its definition. Each definition can only be used once.
          Tap a paired card to change it.
        </AppText>

        {/* Progress: one dot per term, filled with that term's color once paired */}
        <View style={styles.matchProgressRow}>
          {terms.map((t, i) => {
            const paired = termAnswers[t.pairId] !== undefined;
            return (
              <View
                key={`dot-${t.id}`}
                style={[
                  styles.matchDot,
                  paired && { backgroundColor: matchColor(i), borderColor: matchColor(i) },
                ]}
              />
            );
          })}
          <AppText style={styles.matchProgressText}>
            {pairedCount}/{questions.length} paired
          </AppText>
        </View>

        <AppText
          style={[
            styles.memoryMatchPrompt,
            activeColor ? { color: activeColor } : null,
          ]}
        >
          {selectedTerm !== null
            ? `Now choose the match for term ${activeTermIndex + 1} in Column B`
            : 'Select a term from Column A'}
        </AppText>

        <View style={styles.memoryMatchContainer}>
          {/* COLUMN A */}
          <View style={styles.memoryColumn}>
            <AppText style={styles.memoryColumnHeader}>Column A (Terms)</AppText>

            {terms.map((card, tIdx) => {
              const color = matchColor(tIdx);
              const pairedDefId = termAnswers[card.pairId];
              const defIndex =
                pairedDefId !== undefined
                  ? defs.findIndex(d => d.pairId === pairedDefId)
                  : -1;
              const isPaired = defIndex >= 0;
              const isActive = selectedTerm === card.pairId;

              return (
                <TouchableOpacity
                  key={card.id}
                  activeOpacity={0.85}
                  style={[
                    styles.matchCard,
                    isPaired && { backgroundColor: color + '1A', borderColor: color },
                    isActive && {
                      backgroundColor: color + '26',
                      borderColor: color,
                      borderWidth: 3,
                      shadowColor: color,
                      shadowOpacity: 0.35,
                      shadowRadius: 8,
                      elevation: 5,
                    },
                  ]}
                  onPress={() => handleMemoryCardPress(card)}
                >
                  <View style={[styles.matchBadge, { backgroundColor: color }]}>
                    <AppText style={styles.matchBadgeText}>{tIdx + 1}</AppText>
                  </View>

                  <AppText style={styles.matchCardText}>{card.text}</AppText>

                  {isPaired ? (
                    <View style={[styles.matchChip, { backgroundColor: color }]}>
                      <AppText style={styles.matchChipText}>
                        {String.fromCharCode(65 + defIndex)}
                      </AppText>
                    </View>
                  ) : isActive ? (
                    <Ionicons name="radio-button-on" size={22} color={color} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* COLUMN B */}
          <View style={styles.memoryColumn}>
            <AppText style={styles.memoryColumnHeader}>Column B (Choices)</AppText>

            {defs.map((card, dIdx) => {
              const letter = String.fromCharCode(65 + dIdx);
              const ownerKey = Object.keys(termAnswers).find(
                k => termAnswers[Number(k)] === card.pairId
              );
              const ownerIndex =
                ownerKey !== undefined
                  ? terms.findIndex(t => t.pairId === Number(ownerKey))
                  : -1;
              const isTaken = ownerIndex >= 0;
              const ownerColor = isTaken ? matchColor(ownerIndex) : null;
              // Free choices glow in the active term's color so the target is obvious.
              const isTarget = !isTaken && activeColor !== null;

              return (
                <TouchableOpacity
                  key={card.id}
                  activeOpacity={0.85}
                  style={[
                    styles.matchCard,
                    isTaken && {
                      backgroundColor: ownerColor + '1A',
                      borderColor: ownerColor as string,
                    },
                    isTarget && {
                      borderColor: activeColor as string,
                      borderStyle: 'dashed',
                    },
                  ]}
                  onPress={() => handleMemoryCardPress(card)}
                >
                  <View
                    style={[
                      styles.matchBadge,
                      { backgroundColor: isTaken ? (ownerColor as string) : '#ECEFF1' },
                    ]}
                  >
                    <AppText
                      style={[
                        styles.matchBadgeText,
                        !isTaken && { color: '#546E7A' },
                      ]}
                    >
                      {letter}
                    </AppText>
                  </View>

                  <AppText style={styles.matchCardText}>{card.text}</AppText>

                  {isTaken && (
                    <View style={[styles.matchChip, { backgroundColor: ownerColor as string }]}>
                      <AppText style={styles.matchChipText}>{ownerIndex + 1}</AppText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {setFooter(
          <TouchableOpacity
            style={[
              styles.nextButton,
              styles.stickyButton,
              !allAnswered && styles.nextButtonDisabled,
            ]}
          onPress={handleSubmitMatching}
          disabled={!allAnswered}
        >
          <AppText style={styles.nextButtonText}>Submit Matching</AppText>
        </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderGame = () => {
    if (gameFinished) return renderSummary();
    switch (gameType) {
      case 'flashcard': return renderFlashcard();
      case 'fill_in_blanks': return renderFillInBlanks();
      case 'memory_match': return renderMemoryMatch();
      case 'quiz_master':
      default: return renderQuizMaster();
    }
  };

  const gameBody = isProgressLoaded ? renderGame() : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={r.isSmallPhone ? 20 : 24} color="#FFF" />
        </TouchableOpacity>
        <AppText style={styles.topBarTitle} numberOfLines={1} ellipsizeMode="tail">
          {assignmentTitle}
        </AppText>
        <View style={styles.topBarSpacer} />
      </View>
      {!isProgressLoaded ? (
        // ✅ NEW: brief loading state while we check for — and, if found,
        // apply — a saved in-progress attempt, so the student never sees a
        // flash of "Question 1" right before jumping to where they left off.
        <View style={styles.resumeLoadingContainer}>
          <ActivityIndicator size="large" color="#8B0000" />
          <AppText style={styles.resumeLoadingText}>Resuming your game...</AppText>
        </View>
      ) : (
        // One scrolling page for every game type: tall screens stretch the
        // content to fill the height, short screens scroll — so the answer
        // feedback and Next button can never be clipped off-screen.
        <KeyboardAvoidingView
          style={styles.scrollShell}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scrollShell}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            persistentScrollbar
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <View style={styles.centeredContent}>{gameBody}</View>
          </ScrollView>
          {footerSlot.node ? (
            <View style={styles.stickyFooter}>
              <ScrollView
                style={{ maxHeight: r.height * 0.45 }}
                contentContainerStyle={styles.stickyFooterInner}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {footerSlot.node}
              </ScrollView>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}

      {/* Toast — portal-based so it renders above the game/summary screens */}
      <Modal
        visible={toast.visible}
        transparent
        animationType="fade"
        onRequestClose={hideToast}
        statusBarTranslucent
      >
        <View style={styles.toastPortal} pointerEvents="box-none">
          <Toast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onHide={hideToast}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================================
// STYLE FACTORY — derives every value from the responsive token
// set above. No hardcoded pixel widths/paddings/fonts here.
// ============================================================
// One distinct color per term (cycled if there are more than 12). The term, its
// number badge, and the definition it is paired with all share the same color.
const MATCH_COLORS = [
  '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1',
  '#D81B60', '#3949AB', '#6D4C41', '#7CB342', '#546E7A', '#F4511E',
];
const matchColor = (index: number) => MATCH_COLORS[index % MATCH_COLORS.length];

const createStyles = (r: ResponsiveInfo) => {
  const isRowMemory = r.memoryColumns === 2;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#8B0000',
      paddingHorizontal: r.horizontalPadding,
      paddingVertical: r.isSmallPhone ? 10 : r.isDesktop ? 18 : 14,
      width: '100%',
    },
    backBtn: {
      width: r.touchTarget,
      height: r.touchTarget,
      borderRadius: r.touchTarget / 2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: { fontFamily: FONT_TITLE, 
      color: '#FFF',
      fontSize: r.font.subheading,
      fontWeight: WEIGHT_TITLE,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: r.spacing.sm,
    },
    topBarSpacer: { width: r.touchTarget },
    resumeLoadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: r.spacing.sm,
      paddingVertical: r.spacing.xl,
    },
    resumeLoadingText: { fontFamily: FONT_BODY, 
      fontSize: r.font.body,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#777',
    },
    scrollShell: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: r.horizontalPadding,
      paddingTop: r.spacing.md,
      paddingBottom: r.spacing.xl + 16,
      alignItems: 'center',
      width: '100%',
    },
    centeredContent: {
      flexGrow: 1,
      width: '100%',
      maxWidth: r.contentWidth,
      alignSelf: 'center',
    },
    gameContainer: { flexGrow: 1, width: '100%' },
    header: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: r.spacing.md,
      gap: r.spacing.sm,
    },
    progressText: { fontFamily: FONT_BODY, 
      fontSize: r.font.body,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#555',
      flexShrink: 1,
    },
    scoreText: { fontFamily: FONT_BODY, 
      fontSize: r.font.body,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#8B0000',
      flexShrink: 0,
    },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#2196F3',
      paddingHorizontal: r.isSmallPhone ? 8 : 10,
      paddingVertical: r.isSmallPhone ? 5 : 6,
      borderRadius: 20,
      flexShrink: 1,
      maxWidth: '100%',
    },
    timerBadgeUrgent: { backgroundColor: '#FFEBEE' },
    timerText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, fontSize: r.font.caption },
    timerTextUrgent: { color: '#D32F2F' },
    questionCard: {
      backgroundColor: '#FFF',
      padding: r.cardPadding,
      borderRadius: 16,
      marginBottom: r.spacing.lg,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 4,
      width: '100%',
    },
    questionText: { fontFamily: FONT_BODY, 
      fontSize: r.font.question,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#222',
      lineHeight: r.font.question * 1.4,
      flexWrap: 'wrap',
    },
    optionsContainer: {
      gap: r.optionsInRow ? r.spacing.md : r.spacing.sm,
      width: '100%',
      flexDirection: r.optionsInRow ? 'row' : 'column',
      alignItems: 'stretch',
    },
    optionButton: {
      backgroundColor: '#FFF',
      borderWidth: 2,
      borderColor: '#DDD',
      borderRadius: 16,
      paddingVertical: r.isSmallPhone ? 10 : 12,
      paddingHorizontal: r.isSmallPhone ? 14 : 16,
      minHeight: r.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...(r.optionsInRow ? { flex: 1, flexBasis: 0, minWidth: 0 } : { width: '100%' }),
    },
    optionText: { fontFamily: FONT_BODY, 
      fontSize: r.font.body,
      fontWeight: WEIGHT_EMPHASIS,
      flex: 1,
      flexShrink: 1,
      flexWrap: 'wrap',
      marginRight: r.spacing.sm,
    },
    feedbackCard: {
      marginTop: r.spacing.lg,
      padding: r.cardPadding,
      borderRadius: 16,
      alignItems: 'center',
      width: '100%',
    },
    feedbackCorrect: { backgroundColor: '#E8F5E9' },
    feedbackWrong: { backgroundColor: '#FFEBEE' },
    feedbackText: { fontFamily: FONT_BODY, 
      fontSize: r.font.subheading + 4,
      fontWeight: WEIGHT_EMPHASIS,
      marginBottom: r.spacing.sm,
      textAlign: 'center',
    },
    feedbackSubtext: { fontFamily: FONT_BODY, 
      fontSize: r.font.body,
      color: '#555',
      marginBottom: r.spacing.md,
      textAlign: 'center',
    },
    nextButton: {
      backgroundColor: '#8B0000',
      paddingVertical: r.isSmallPhone ? 12 : 14,
      paddingHorizontal: r.isDesktop ? 48 : 32,
      borderRadius: 16,
      marginTop: r.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: r.touchTarget,
      alignSelf: r.isDesktop ? 'center' : 'stretch',
      minWidth: r.isDesktop ? 280 : undefined,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
    },
    nextButtonDisabled: { backgroundColor: '#CCC' },
    nextButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontSize: r.font.button, fontWeight: WEIGHT_EMPHASIS },
    // Question-card / footer layout (page scrolls, so nothing is clipped)
    fixedQuestionCard: {
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 'auto',
      minHeight: 80,
      backgroundColor: '#FFF',
      borderRadius: 16,
      marginBottom: r.spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 4,
      width: '100%',
      overflow: 'hidden',
    },
    fixedQuestionScroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: r.cardPadding,
    },
    // Sticky bottom bar — always visible, never scrolls away with the page
    stickyFooter: {
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#E0E3E8',
      paddingHorizontal: r.horizontalPadding,
      paddingTop: r.spacing.sm,
      paddingBottom: r.spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: 10,
    },
    stickyFooterInner: {
      width: '100%',
      maxWidth: r.contentWidth,
      alignSelf: 'center',
      gap: r.spacing.xs,
    },
    stickyButton: { marginTop: 0 },
    footerHint: { alignItems: 'center', justifyContent: 'center', paddingVertical: r.spacing.xs },
    footerHintText: {
      fontFamily: FONT_BODY,
      color: '#8A8F98',
      fontSize: r.font.caption,
      fontWeight: WEIGHT_EMPHASIS,
    },
    feedbackBar: {
      width: '100%',
      // Large screens: keep the feedback container compact and centered.
      ...(r.isDesktop ? { maxWidth: 720, alignSelf: 'center' as const } : null),
      borderRadius: 16,
      paddingVertical: r.spacing.sm + 2,
      paddingHorizontal: r.cardPadding,
      alignItems: 'center',
    },
    feedbackTitle: {
      fontFamily: FONT_BODY,
      fontSize: r.font.subheading + 2,
      fontWeight: WEIGHT_EMPHASIS,
      textAlign: 'center',
    },
    feedbackLines: { alignSelf: 'stretch', marginTop: 4 },
    feedbackLine: {
      fontFamily: FONT_BODY,
      fontSize: r.font.caption + 1,
      color: '#555',
      textAlign: 'center',
      marginBottom: 2,
    },
    feedbackNextButton: r.isDesktop
      ? { marginTop: r.spacing.sm, alignSelf: 'center', minWidth: 280 }
      : { marginTop: r.spacing.sm, alignSelf: 'stretch', minWidth: undefined },
    fixedInput: { minHeight: 48, maxHeight: 96 },
    flashcardScrollFill: { alignSelf: 'stretch' },
    flashcardScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    // Flashcard
    flashcardOuter: {
      width: '100%',
      flexGrow: 1,
      flexShrink: 0,
      alignItems: 'center',
    },
    flashcardContainer: {
      width: r.flashcardWidth,
      flexGrow: 1,
      flexShrink: 0,
      minHeight: r.isShortScreen ? 160 : r.flashcardHeight,
      backgroundColor: '#FFF',
      borderRadius: 20,
      marginBottom: r.spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 15,
      elevation: 6,
      justifyContent: 'center',
      alignItems: 'center',
      padding: r.cardPadding,
    },
    flashcardFlipped: { backgroundColor: '#E8F5E9' },
    flashcardFront: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    flashcardBack: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    flashcardQuestion: { fontFamily: FONT_BODY, 
      fontSize: r.font.subheading + 4,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#222',
      textAlign: 'center',
      marginTop: r.spacing.md,
      flexWrap: 'wrap',
    },
    flashcardAnswerText: { fontFamily: FONT_BODY, 
      fontSize: r.font.subheading + 6,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#2E7D32',
      textAlign: 'center',
      marginTop: r.spacing.md,
      flexWrap: 'wrap',
    },
    flashcardInputContainer: { gap: r.spacing.sm, width: '100%' },
    flashcardInput: { fontFamily: FONT_BODY, 
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#DDD',
      borderRadius: 16,
      padding: r.isSmallPhone ? 14 : 16,
      fontSize: r.font.body,
      minHeight: 60,
      textAlignVertical: 'top',
      width: '100%',
    },
    // Memory Match — responsive two-column layout
    memoryMatchInstructions: { fontFamily: FONT_BODY, 
      fontSize: r.font.caption,
      color: '#666',
      textAlign: 'center',
      marginBottom: r.spacing.md,
      fontWeight: WEIGHT_EMPHASIS,
    },
    memoryMatchPrompt: { fontFamily: FONT_BODY, 
      textAlign: 'center',
      marginBottom: r.spacing.sm + 2,
      color: '#2196F3',
      fontWeight: WEIGHT_EMPHASIS,
      fontSize: r.font.body,
    },
    memoryMatchContainer: {
      flexDirection: isRowMemory ? 'row' : 'column',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      width: '100%',
      gap: isRowMemory ? r.spacing.md : 0,
    },
    memoryColumn: {
      flex: isRowMemory ? 1 : undefined,
      width: isRowMemory ? undefined : '100%',
      marginBottom: isRowMemory ? 0 : r.spacing.lg,
    },
    memoryColumnHeader: { fontFamily: FONT_BODY, 
      fontSize: r.font.subheading,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#222',
      textAlign: 'center',
      marginBottom: r.spacing.md,
      paddingBottom: r.spacing.xs + 4,
      borderBottomWidth: 2,
      borderBottomColor: '#8B0000',
    },
    memoryCard: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: r.isSmallPhone ? 12 : 16,
      marginBottom: r.spacing.sm,
      minHeight: Math.max(r.touchTarget + 16, 80),
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#DDD',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      width: '100%',
    },
    memoryCardMatched: {
      backgroundColor: '#E8F5E9',
      borderColor: '#4CAF50',
    },
    memoryCardSelected: {
      backgroundColor: '#E3F2FD',
      borderColor: '#2196F3',
    },
    memoryCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    memoryCardSelectedLetter: { fontFamily: FONT_BODY, 
      marginLeft: r.spacing.xs + 4,
      color: '#8B0000',
      fontWeight: WEIGHT_EMPHASIS,
      fontSize: r.font.body,
    },
    memoryCardLetter: { fontFamily: FONT_BODY, 
      fontWeight: WEIGHT_EMPHASIS,
      color: '#8B0000',
      marginBottom: r.spacing.xs + 2,
      fontSize: r.font.body,
    },
    // Matching — colored pair cards
    matchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#E0E3E8',
      paddingVertical: r.isSmallPhone ? 10 : 14,
      paddingHorizontal: r.isSmallPhone ? 10 : 14,
      marginBottom: r.spacing.sm,
      minHeight: Math.max(r.touchTarget + 8, 64),
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    matchBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchBadgeText: {
      fontFamily: FONT_BODY,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#FFF',
      fontSize: r.font.caption,
    },
    matchCardText: {
      fontFamily: FONT_BODY,
      flex: 1,
      color: '#222',
      fontSize: r.font.caption + 1,
      fontWeight: WEIGHT_EMPHASIS,
    },
    matchChip: {
      minWidth: 30,
      height: 30,
      borderRadius: 15,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchChipText: {
      fontFamily: FONT_BODY,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#FFF',
      fontSize: r.font.caption,
    },
    matchProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: r.spacing.sm,
    },
    matchDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: '#CFD4DA',
      backgroundColor: '#FFF',
    },
    matchProgressText: {
      fontFamily: FONT_BODY,
      marginLeft: 8,
      color: '#555',
      fontSize: r.font.caption,
      fontWeight: WEIGHT_EMPHASIS,
    },
    memoryCardText: { fontFamily: FONT_BODY, 
      color: '#222',
      fontSize: r.font.caption + 1,
      fontWeight: WEIGHT_EMPHASIS,
      textAlign: 'center',
      flexWrap: 'wrap',
      flexShrink: 1,
    },
    connectionsContainer: {
      width: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectionLine: {
      width: 40,
      height: 2,
      backgroundColor: '#4CAF50',
      marginVertical: 40,
    },
    // Summary & Review Styles
    summaryHeader: {
      alignItems: 'center',
      marginBottom: r.spacing.lg,
      padding: r.spacing.lg,
      width: '100%',
    },
    summaryTitle: { fontFamily: FONT_TITLE, 
      fontSize: r.font.heading,
      fontWeight: WEIGHT_TITLE,
      color: '#222',
      marginTop: r.spacing.sm,
      textAlign: 'center',
    },
    summaryScore: { fontFamily: FONT_BODY, 
      fontSize: r.font.heading + (r.isDesktop ? 6 : 4),
      fontWeight: WEIGHT_EMPHASIS,
      color: '#8B0000',
      marginTop: r.spacing.xs + 4,
      textAlign: 'center',
    },
    summaryPercentage: { fontFamily: FONT_BODY, 
      fontSize: r.font.subheading,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#555',
      marginTop: r.spacing.xs,
      textAlign: 'center',
    },
    summarySubtext: { fontFamily: FONT_BODY, 
      fontSize: r.font.caption + 1,
      color: '#777',
      marginTop: r.spacing.xs + 4,
      textAlign: 'center',
    },
    reviewTitle: { fontFamily: FONT_TITLE, 
      fontSize: r.font.subheading,
      fontWeight: WEIGHT_TITLE,
      color: '#222',
      marginBottom: r.spacing.sm + 4,
      width: '100%',
    },
    reviewList: { width: '100%', marginBottom: r.spacing.md },
    timeUpNotice: { fontFamily: FONT_BODY, 
      fontSize: r.font.caption + 1,
      color: '#D32F2F',
      fontWeight: WEIGHT_EMPHASIS,
      textAlign: 'center',
      marginBottom: r.spacing.sm,
      width: '100%',
    },
    reviewItem: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: r.isSmallPhone ? 14 : 16,
      marginBottom: r.spacing.sm + 4,
      borderLeftWidth: 4,
      width: '100%',
    },
    reviewCorrect: { borderLeftColor: '#4CAF50' },
    reviewWrong: { borderLeftColor: '#F44336' },
    reviewItemHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: r.spacing.sm,
      marginBottom: r.spacing.sm,
    },
    reviewQuestionText: { fontFamily: FONT_BODY, 
      fontSize: r.font.caption + 1,
      fontWeight: WEIGHT_EMPHASIS,
      color: '#222',
      flex: 1,
      flexWrap: 'wrap',
    },
    reviewAnswers: { marginLeft: 28, flexShrink: 1 },
    reviewUserAnswer: { fontFamily: FONT_BODY, 
      fontSize: r.font.caption,
      color: '#555',
      marginBottom: r.spacing.xs,
      flexWrap: 'wrap',
    },
    reviewCorrectAnswer: { fontFamily: FONT_BODY, 
      fontSize: r.font.caption,
      color: '#4CAF50',
      fontWeight: WEIGHT_EMPHASIS,
      flexWrap: 'wrap',
    },
    // ✅ Toast portal — lets touches pass through to whatever's behind, except the toast itself
    toastPortal: {
      ...StyleSheet.absoluteFillObject,
    },
  });
};

export default GameBasedAssignment;