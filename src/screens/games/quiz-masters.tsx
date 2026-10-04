import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../../theme/typography';

// 🆕 AI GRADING: same backend base-url resolution as Game.tsx (duplicated
// rather than imported since the two files don't currently share a utils
// module — see the same pattern already used for the storage-key helpers
// below).
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

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface Props {
  onBack: () => void;
  generatedQuestions?: any[] | null;
  gameType?: string; // 'quiz_master' | 'memory_match' | 'fill_in_blanks' | 'flashcard'
  onComplete?: (score: number, totalQuestions: number, answers: any[]) => void;
  // 🆕 RESUME SUPPORT: pass the same studentId used by <Game studentId={...} />
  // so progress is scoped per-student rather than shared across everyone on
  // the same device. Safe to omit — falls back to a device-level 'anonymous'
  // bucket if not provided.
  studentId?: string;
  // 🆕 PLAY AGAIN: when provided, tapping "Play Again" on the results screen
  // calls this instead of a plain onBack(), so the parent can send the
  // student back to Game with its "new quiz" modal (game type, number of
  // questions, class & lesson) already open. Falls back to onBack() if omitted.
  onPlayAgain?: () => void;
}

// 🆕 RESUME SUPPORT: same hashing/key scheme as Game.tsx so progress saved
// here can be found (and previewed/cleared) from the Game screen, and vice
// versa. Kept in sync deliberately — duplicated rather than imported since
// the two files don't currently share a utils module.
function hashContent(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getActiveSessionStorageKey(studentId?: string) {
  return `gameAi_activeSession_${studentId || 'anonymous'}`;
}

function getProgressStorageKey(studentId: string | undefined, gameType: string, questions: any[]) {
  const hash = hashContent(`${gameType}:${JSON.stringify(questions)}`);
  return `gameAi_progress_${studentId || 'anonymous'}_${hash}`;
}

type GameMode = 'menu' | 'matchingCards' | 'flashcards' | 'fillBlank' | 'trivia' | 'summary';

type MatchingCard = {
  id: string;
  type: 'term' | 'definition';
  pairId: string;
  text: string;
  matched: boolean;
};

type FillBlankItem = {
  question: string;
  answer: string;
  prompt: string;
  explanation?: string;
};

type UserAnswer = {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  isCorrect: boolean;
};

function normalizeText(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// 🆕 AI GRADING: used by Flashcards and Fill-in-the-Blanks (the two free-text
// modes) so a student who has the right idea but phrases it differently from
// the accepted answer isn't marked wrong. An exact/normalized match is
// checked first with zero network cost; only a non-matching answer is sent
// to the backend for a semantic judgement. If that call fails for any
// reason (offline, timeout, server error), we fail safe back to the old
// exact-match behavior rather than blocking the student from finishing.
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

function sanitizeQuestions(value?: any[] | null): QuizQuestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const question = typeof item?.question === 'string' ? item.question.trim() : '';
      const options = Array.isArray(item?.options)
        ? item.options.map((option:any) => String(option || '').trim()).filter(Boolean)
        : [];
      const answer = typeof item?.answer === 'string' ? item.answer.trim() : '';
      const explanation = typeof item?.explanation === 'string' ? item.explanation.trim() : '';

      // Relaxed to allow >= 2 options in case backend fails to generate exactly 4
      if (!question || options.length < 2 || !answer) return null;

      const exactAnswer = options.find(
        (option:any) => normalizeText(option) === normalizeText(answer)
      );

      if (!exactAnswer) return null;

      return {
        question,
        options,
        answer: exactAnswer,
        explanation,
      };
    })
    .filter(Boolean) as QuizQuestion[];
}

function shuffleArray<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function createBlankPrompt(question: string, answer: string) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const answerRegex = new RegExp(escaped, 'i');

  if (answerRegex.test(question)) {
    return question.replace(answerRegex, '__________');
  }

  return `${question}\n\nAnswer: __________`;
}

function createFillBlankItems(questions: QuizQuestion[]): FillBlankItem[] {
  return questions.map((item) => ({
    question: item.question,
    answer: item.answer,
    prompt: createBlankPrompt(item.question, item.answer),
    explanation: item.explanation,
  }));
}

// Updated to handle both legacy QuizQuestion shape and new backend memory_match shape
function createMatchingCards(questions: any[]): MatchingCard[] {
  const cards = questions.flatMap((item, index) => {
    const pairId = `pair-${index}`;
    const termText = item.answer || item.term || '';
    const defText = item.question || item.definition || '';

    return [
      {
        id: `${pairId}-term`,
        type: 'term' as const,
        pairId,
        text: termText,
        matched: false,
      },
      {
        id: `${pairId}-definition`,
        type: 'definition' as const,
        pairId,
        text: defText,
        matched: false,
      },
    ];
  });

  return shuffleArray(cards);
}

// One distinct color per term (cycled if there are more than 12). The term, its
// number badge, and the definition it is paired with all share the same color.
const MATCH_COLORS = [
  '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1',
  '#D81B60', '#3949AB', '#6D4C41', '#7CB342', '#546E7A', '#F4511E',
];
const matchColor = (index: number) => MATCH_COLORS[index % MATCH_COLORS.length];

const LARGE_SCREEN_CONTENT_WIDTH_PERCENT = '65%'; 

export default function QuizMasters({ onBack, generatedQuestions, gameType = 'quiz_master', onComplete, studentId, onPlayAgain }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // Parse backend response into categorized arrays based on structure
  const parsedData = useMemo(() => {
    if (!generatedQuestions || !Array.isArray(generatedQuestions)) {
      return { trivia: [], matching: [], fillBlank: [], flashcards: [] };
    }

    const trivia: QuizQuestion[] = [];
    const matching: any[] = [];
    const fillBlank: any[] = [];
    const flashcards: any[] = [];

    for (const item of generatedQuestions) {
      // Trivia / Quiz Master structure
      if (item.question && Array.isArray(item.options) && item.answer) {
        const question = String(item.question).trim();
        const options = item.options.map((o: any) => String(o || '').trim()).filter(Boolean);
        const answer = String(item.answer).trim();
        const explanation = item.explanation ? String(item.explanation).trim() : '';
        if (question && options.length >= 2 && answer) {
          trivia.push({ question, options, answer, explanation });
        }
      }
      
      // Memory Match structure
      if (item.term && item.definition) {
        const term = String(item.term).trim();
        const definition = String(item.definition).trim();
        if (term && definition) {
          matching.push({ term, definition });
        }
      }

      // Fill in the Blanks structure
      if (item.sentence && item.answer) {
        const sentence = String(item.sentence).trim();
        const answer = String(item.answer).trim();
        const hint = item.hint ? String(item.hint).trim() : '';
        if (sentence && answer) {
          fillBlank.push({ sentence, answer, hint });
        }
      }

      // Flashcard structure
      if (item.front && item.back) {
        const front = String(item.front).trim();
        const back = String(item.back).trim();
        if (front && back) {
          flashcards.push({ front, back });
        }
      }
    }

    return { trivia, matching, fillBlank, flashcards };
  }, [generatedQuestions]);

  const questions = parsedData.trivia;
  const matchingItems = parsedData.matching;
  const fillBlankItemsRaw = parsedData.fillBlank;
  const flashcardItems = parsedData.flashcards;

  // Map raw fill-blank items to the internal FillBlankItem shape
  const fillBlankItems = useMemo(() => {
    if (fillBlankItemsRaw.length > 0) {
      return fillBlankItemsRaw.map(item => ({
        question: item.sentence,
        answer: item.answer,
        prompt: createBlankPrompt(item.sentence, item.answer),
        explanation: item.hint || '',
      }));
    }
    // Fallback to trivia questions if no specific fill-blank items were generated
    return createFillBlankItems(questions);
  }, [fillBlankItemsRaw, questions]);

  const [mode, setMode] = useState<GameMode>('menu');
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);

  // Matching Cards State
  const [terms, setTerms] = useState<MatchingCard[]>([]);
  const [definitions, setDefinitions] = useState<MatchingCard[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [userChoices, setUserChoices] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [matchingScore, setMatchingScore] = useState(0);

  // Flashcards State
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlashcardAnswerVisible, setIsFlashcardAnswerVisible] = useState(false);
  const [flashcardInput, setFlashcardInput] = useState('');
  const [flashcardChecked, setFlashcardChecked] = useState(false);
  const [flashcardIsCorrect, setFlashcardIsCorrect] = useState<boolean | null>(null);
  // 🆕 AI GRADING: grading is now an async call, so track an in-flight state
  // (to disable the button / show a spinner) and any feedback line the
  // grader returned back with its verdict.
  const [isFlashcardGrading, setIsFlashcardGrading] = useState(false);
  const [flashcardFeedback, setFlashcardFeedback] = useState<string | null>(null);

  // Fill Blank State
  const [fillIndex, setFillIndex] = useState(0);
  const [fillAnswer, setFillAnswer] = useState('');
  const [fillScore, setFillScore] = useState(0);
  const [fillChecked, setFillChecked] = useState(false);
  const [fillIsCorrect, setFillIsCorrect] = useState(false);
  // 🆕 AI GRADING: same in-flight/feedback tracking as the Flashcards state above.
  const [isFillGrading, setIsFillGrading] = useState(false);
  const [fillFeedback, setFillFeedback] = useState<string | null>(null);

  // Trivia State
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaSelected, setTriviaSelected] = useState<string | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);

  const hasGeneratedGame = questions.length > 0 || matchingItems.length > 0 || fillBlankItems.length > 0 || flashcardItems.length > 0;

  // 🆕 RESUME SUPPORT: storage keys for this exact quiz (scoped to student +
  // game type + the specific set of generated questions). Kept stable via
  // useMemo so the load/save effects below don't re-key on every render.
  const progressStorageKey = useMemo(
    () => getProgressStorageKey(studentId, gameType, generatedQuestions || []),
    [studentId, gameType, generatedQuestions]
  );
  const activeSessionStorageKey = useMemo(
    () => getActiveSessionStorageKey(studentId),
    [studentId]
  );

  // Guards so the "save progress" effect doesn't fire (and overwrite any
  // saved progress with blank defaults) before we've had a chance to try
  // restoring it on mount / whenever a new quiz is generated.
  const isProgressRestoredRef = useRef(false);
  const [isProgressRestored, setIsProgressRestored] = useState(false);

  // 🆕 LEADERBOARD: guards the "save score on reaching results" effect below
  // so an attempt is only ever saved once — not once per button the student
  // might tap next, and not again if they reload the app while still
  // sitting on the results screen. Reset per-quiz (new questions) and
  // restored from the saved snapshot's `scoreSaved` flag when resuming.
  const hasSavedScoreRef = useRef(false);

  const clearSavedProgress = async () => {
    try {
      await AsyncStorage.multiRemove([progressStorageKey, activeSessionStorageKey]);
    } catch (err) {
      console.warn('Failed to clear saved quiz progress:', err);
    }
  };

  // Normalize current flashcard to always have 'question' and 'answer' properties
  const currentFlashcardRaw = flashcardItems.length > 0 ? flashcardItems[flashcardIndex] : questions[flashcardIndex];
  const currentFlashcard = currentFlashcardRaw ? {
    question: currentFlashcardRaw.front || currentFlashcardRaw.question,
    answer: currentFlashcardRaw.back || currentFlashcardRaw.answer,
    explanation: currentFlashcardRaw.explanation || '',
  } : null;
  
  const currentFillItem = fillBlankItems[fillIndex];
  const currentTrivia = questions[triviaIndex];

  const autoSelectMode = () => {
    if (gameType === 'memory_match' && matchingItems.length > 0) setMode('matchingCards');
    else if (gameType === 'fill_in_blanks' && fillBlankItems.length > 0) setMode('fillBlank');
    else if (gameType === 'flashcard' && (flashcardItems.length > 0 || questions.length > 0)) setMode('flashcards');
    else if (gameType === 'quiz_master' && questions.length > 0) setMode('trivia');
    else if (matchingItems.length > 0) setMode('matchingCards');
    else if (fillBlankItems.length > 0) setMode('fillBlank');
    else if (flashcardItems.length > 0 || questions.length > 0) setMode('flashcards');
    else if (questions.length > 0) setMode('trivia');
    else setMode('menu');
  };

  // 🆕 RESUME SUPPORT: on a fresh set of generated questions, first check
  // whether there's saved progress for this exact quiz (same student, game
  // type, and question set). If so, restore it — including which question
  // the user was on and their score so far — instead of starting over. Only
  // falls back to a brand-new session when nothing valid is found.
  useEffect(() => {
    let isCancelled = false;
    isProgressRestoredRef.current = false;
    setIsProgressRestored(false);
    // 🆕 LEADERBOARD: default to "not yet saved" for this quiz; flipped back
    // to true below if the restored snapshot says this attempt's score was
    // already saved (e.g. reopening the app on the results screen).
    hasSavedScoreRef.current = false;

    const restore = async () => {
      let restored = false;
      try {
        const raw = await AsyncStorage.getItem(progressStorageKey);
        if (raw) {
          const saved = JSON.parse(raw);
          // 🐛 FIX: 'summary' (the results screen) used to be excluded here,
          // which meant closing the app while sitting on results — before
          // tapping "Play Again" / "Back to Games" — had no saved snapshot
          // to restore from, so this fell through to resetAll()+autoSelectMode()
          // below and silently restarted the quiz from scratch on reopen.
          // Only a real finish-button tap should end a session (those already
          // call clearSavedProgress() explicitly); just reaching the results
          // screen should still be resumable.
          if (saved && saved.mode && saved.mode !== 'menu') {
            if (!isCancelled) {
              setTriviaIndex(saved.triviaIndex ?? 0);
              setTriviaScore(saved.triviaScore ?? 0);
              setTriviaSelected(saved.triviaSelected ?? null);
              setFillIndex(saved.fillIndex ?? 0);
              setFillScore(saved.fillScore ?? 0);
              setFillAnswer(saved.fillAnswer ?? '');
              setFillChecked(saved.fillChecked ?? false);
              setFillIsCorrect(saved.fillIsCorrect ?? false);
              setFlashcardIndex(saved.flashcardIndex ?? 0);
              setFlashcardInput(saved.flashcardInput ?? '');
              setFlashcardChecked(saved.flashcardChecked ?? false);
              setFlashcardIsCorrect(saved.flashcardIsCorrect ?? null);
              setIsFlashcardAnswerVisible(saved.isFlashcardAnswerVisible ?? false);
              setMatchingScore(saved.matchingScore ?? 0);
              setUserChoices(saved.userChoices ?? {});
              setShowResults(saved.showResults ?? false);
              setUserAnswers(saved.userAnswers ?? []);
              setMode(saved.mode);
              hasSavedScoreRef.current = saved.scoreSaved === true;
            }
            restored = true;
          }
        }
      } catch (err) {
        console.warn('Failed to restore saved quiz progress:', err);
      }

      if (!isCancelled) {
        if (!restored) {
          resetAll();
          autoSelectMode();
        }
        isProgressRestoredRef.current = true;
        setIsProgressRestored(true);
      }
    };

    restore();
    return () => {
      isCancelled = true;
    };
  }, [generatedQuestions, gameType, progressStorageKey]);

  // 🆕 LEADERBOARD: save the score the moment the student reaches ANY
  // results screen — the shared "Practice Completed!" screen (trivia /
  // fill-in-the-blanks / flashcards, via mode 'summary') AND the Matching
  // Type game's own "Matching Completed!" screen (mode 'matchingCards' with
  // showResults true) — not when they tap a particular button afterward.
  // That way the attempt is recorded whether they end up tapping "Back to
  // Games" OR "Play Again", so every practice attempt adds to the class
  // record (and, from there, the leaderboard-style export) instead of only
  // the ones where the student happened to tap the "save" button.
  // hasSavedScoreRef (reset per-quiz/per-replay, restored from the saved
  // snapshot's scoreSaved flag) makes sure this only ever fires once per
  // attempt.
  const isOnResultsScreen = mode === 'summary' || (mode === 'matchingCards' && showResults);
  useEffect(() => {
    if (!isOnResultsScreen) return;
    if (!isProgressRestored) return;
    if (hasSavedScoreRef.current) return;

    const total = userAnswers.length;
    if (total === 0) return; // nothing answered yet (shouldn't normally happen here)

    hasSavedScoreRef.current = true;
    const correctCount = userAnswers.filter((a) => a.isCorrect).length;
    if (onComplete) onComplete(correctCount, total, userAnswers);
  }, [isOnResultsScreen, isProgressRestored, userAnswers, onComplete]);

  // 🆕 RESUME SUPPORT: persist progress after every meaningful change, so a
  // fully-closed-and-reopened app/website can pick back up at the right
  // question and score. Skipped until the restore effect above has run
  // (avoids clobbering saved progress with blank initial state), and while
  // on the menu (nothing to resume yet). 🐛 FIX: 'summary' is intentionally
  // NOT skipped anymore — closing the app while sitting on the results
  // screen (before tapping a finish button) needs an up-to-date snapshot to
  // resume back into, otherwise it looks like the quiz never happened. A
  // session only truly ends when a finish button is tapped, which already
  // calls clearSavedProgress() explicitly.
  useEffect(() => {
    if (!isProgressRestoredRef.current || !hasGeneratedGame) return;
    if (mode === 'menu') return;

    const snapshot = {
      mode,
      triviaIndex, triviaScore, triviaSelected,
      fillIndex, fillScore, fillAnswer, fillChecked, fillIsCorrect,
      flashcardIndex, flashcardInput, flashcardChecked, flashcardIsCorrect, isFlashcardAnswerVisible,
      matchingScore, userChoices, showResults,
      userAnswers,
      savedAt: Date.now(),
      // 🆕 LEADERBOARD: carried along so reopening the app on an
      // already-saved results screen doesn't record a duplicate attempt.
      scoreSaved: hasSavedScoreRef.current,
    };

    AsyncStorage.setItem(progressStorageKey, JSON.stringify(snapshot)).catch((err) => {
      console.warn('Failed to save quiz progress:', err);
    });
  }, [
    isProgressRestored, hasGeneratedGame, mode,
    triviaIndex, triviaScore, triviaSelected,
    fillIndex, fillScore, fillAnswer, fillChecked, fillIsCorrect,
    flashcardIndex, flashcardInput, flashcardChecked, flashcardIsCorrect, isFlashcardAnswerVisible,
    matchingScore, userChoices, showResults,
    userAnswers,
  ]);

  const recordAnswer = (question: string, userAns: string, correctAns: string, explanation?: string, isCorrect?: boolean) => {
    const correct = isCorrect !== undefined ? isCorrect : normalizeText(userAns) === normalizeText(correctAns);
    setUserAnswers((prev) => {
      if (prev.some((a) => a.question === question)) return prev;
      return [...prev, { question, userAnswer: userAns, correctAnswer: correctAns, explanation, isCorrect: correct }];
    });
  };

  const resetMatchingCards = () => {
    // Map matchingItems to QuizQuestion shape so createMatchingCards can process them uniformly
    const itemsToUse = matchingItems.length > 0 
      ? matchingItems.map(m => ({ question: m.definition, answer: m.term, options: [], explanation: '' }))
      : questions;
      
    const shuffledQuestions = shuffleArray(itemsToUse);
    const cards = createMatchingCards(shuffledQuestions);
    setTerms(cards.filter(c => c.type === 'term'));
    setDefinitions(cards.filter(c => c.type === 'definition'));
    setSelectedTermId(null);
    setUserChoices({});
    setMatchingScore(0);
    setShowResults(false);
    setUserAnswers([]);
    // 🆕 LEADERBOARD: this starts a fresh matching attempt (new shuffle), so
    // its score needs to be saved again once it's completed.
    hasSavedScoreRef.current = false;
  };

  const resetFlashcards = () => {
    setFlashcardIndex(0);
    setIsFlashcardAnswerVisible(false);
    setFlashcardInput('');
    setFlashcardChecked(false);
    setFlashcardIsCorrect(null);
    setIsFlashcardGrading(false);
    setFlashcardFeedback(null);
  };

  const resetFillBlank = () => {
    setFillIndex(0);
    setFillAnswer('');
    setFillScore(0);
    setFillChecked(false);
    setFillIsCorrect(false);
    setIsFillGrading(false);
    setFillFeedback(null);
  };

  const resetTrivia = () => {
    setTriviaIndex(0);
    setTriviaSelected(null);
    setTriviaScore(0);
  };

  const resetAll = () => {
    resetMatchingCards();
    resetFlashcards();
    resetFillBlank();
    resetTrivia();
    setUserAnswers([]);
    setMode('menu');
    setShowResults(false);
  };

  const goToGameScreen = async () => {
    // 🆕 RESUME SUPPORT: the top back button is now a "pause", not a
    // "finish". Progress is already saved to storage after every change
    // (see the persist effect above) and the active-session entry written
    // by Game.tsx is still in place, so we deliberately do NOT clear
    // anything, reset state, or submit a partial score here. Game.tsx will
    // find the saved session on return and offer the "Resume" banner, and
    // the attempt is submitted once the student actually finishes it.
    //
    // The one exception is the results screen (summary / matching results):
    // that attempt is complete and its score was already recorded by the
    // results-screen effect, so there is nothing to resume — clear it just
    // like the "Back to Games" / "Save & Back" buttons do. Awaited so Game.tsx
    // doesn't re-read a stale session from storage when it remounts.
    if (isOnResultsScreen) {
      await clearSavedProgress();
    }

    onBack();
  };

  const openMode = (nextMode: GameMode) => {
    if (nextMode === 'matchingCards') resetMatchingCards();
    if (nextMode === 'flashcards') resetFlashcards();
    if (nextMode === 'fillBlank') resetFillBlank();
    if (nextMode === 'trivia') resetTrivia();
    setUserAnswers([]);
    setMode(nextMode);
    setShowResults(false);
  };

  // One-to-one matching: each term owns at most one definition and each
  // definition belongs to at most one term. Tapping a paired card "picks it up"
  // so it can be re-paired; choosing a definition another term holds steals it.
  const handleTermPress = (termId: string) => {
    if (selectedTermId === termId) {
      setSelectedTermId(null);
      return;
    }
    setUserChoices(prev => {
      const next = { ...prev };
      delete next[termId];
      return next;
    });
    setSelectedTermId(termId);
  };

  const handleDefinitionPress = (defId: string) => {
    const ownerId = Object.keys(userChoices).find(k => userChoices[k] === defId);

    // Nothing selected: tapping a paired definition picks it back up.
    if (!selectedTermId) {
      if (ownerId) {
        setUserChoices(prev => {
          const next = { ...prev };
          delete next[ownerId];
          return next;
        });
        setSelectedTermId(ownerId);
      }
      return;
    }

    setUserChoices(prev => {
      const next: Record<string, string> = {};
      Object.keys(prev).forEach(k => {
        if (prev[k] !== defId) next[k] = prev[k];
      });
      next[selectedTermId] = defId;
      return next;
    });
    setSelectedTermId(null);
  };

  const handleSubmitMatching = () => {
    let score = 0;
    const answers: UserAnswer[] = [];
    
    terms.forEach(term => {
      const chosenDefId = userChoices[term.id];
      const chosenDefIndex = definitions.findIndex(d => d.id === chosenDefId);
      const chosenDef = chosenDefIndex >= 0 ? definitions[chosenDefIndex] : null;
      const chosenLetter = chosenDefIndex >= 0 ? String.fromCharCode(65 + chosenDefIndex) : '';
      
      const correctDefIndex = definitions.findIndex(d => d.pairId === term.pairId);
      const correctDef = correctDefIndex >= 0 ? definitions[correctDefIndex] : null;
      const correctLetter = correctDefIndex >= 0 ? String.fromCharCode(65 + correctDefIndex) : '';
      
      const isCorrect = chosenDef?.pairId === term.pairId;
      
      if (isCorrect) score++;
      
      answers.push({
        question: term.text,
        userAnswer: chosenLetter ? `${chosenLetter}: ${chosenDef?.text}` : 'No Answer',
        correctAnswer: correctLetter ? `${correctLetter}: ${correctDef?.text}` : '',
        isCorrect,
      });
    });
    
    setMatchingScore(score);
    setUserAnswers(answers);
    setShowResults(true);
  };

  const handleFlashcardCheck = async () => {
    if (!currentFlashcard || isFlashcardGrading) return;
    setIsFlashcardGrading(true);
    setFlashcardFeedback(null);
    try {
      const { isCorrect, feedback } = await gradeFreeTextAnswer(
        currentFlashcard.question,
        currentFlashcard.answer,
        flashcardInput
      );
      setFlashcardIsCorrect(isCorrect);
      setFlashcardChecked(true);
      setFlashcardFeedback(feedback || null);
      recordAnswer(currentFlashcard.question, flashcardInput, currentFlashcard.answer, currentFlashcard.explanation, isCorrect);

      if (isCorrect) {
        setTimeout(() => setIsFlashcardAnswerVisible(true), 600);
      }
    } finally {
      setIsFlashcardGrading(false);
    }
  };

  const handleNextFlashcard = () => {
    const totalCards = flashcardItems.length > 0 ? flashcardItems.length : questions.length;
    if (flashcardIndex + 1 >= totalCards) {
      setMode('summary');
    } else {
      setFlashcardIndex((prev) => prev + 1);
      setIsFlashcardAnswerVisible(false);
      setFlashcardInput('');
      setFlashcardChecked(false);
      setFlashcardIsCorrect(null);
      setFlashcardFeedback(null);
    }
  };

  const checkFillAnswer = async () => {
    if (!currentFillItem || fillChecked || isFillGrading) return;
    setIsFillGrading(true);
    setFillFeedback(null);
    try {
      const { isCorrect, feedback } = await gradeFreeTextAnswer(
        currentFillItem.question,
        currentFillItem.answer,
        fillAnswer
      );
      setFillIsCorrect(isCorrect);
      setFillChecked(true);
      setFillFeedback(feedback || null);
      if (isCorrect) setFillScore((prev) => prev + 1);
      recordAnswer(currentFillItem.question, fillAnswer, currentFillItem.answer, currentFillItem.explanation, isCorrect);
    } finally {
      setIsFillGrading(false);
    }
  };

  const nextFillBlank = () => {
    if (!fillChecked) return;
    if (fillIndex + 1 >= fillBlankItems.length) {
      setMode('summary');
    } else {
      setFillIndex((prev) => prev + 1);
      setFillAnswer('');
      setFillChecked(false);
      setFillIsCorrect(false);
      setFillFeedback(null);
    }
  };

  const handleTriviaSelect = (option: string) => {
    if (triviaSelected || !currentTrivia) return;
    setTriviaSelected(option);
    const isCorrect = option === currentTrivia.answer;
    if (isCorrect) setTriviaScore((prev) => prev + 1);
    recordAnswer(currentTrivia.question, option, currentTrivia.answer, currentTrivia.explanation, isCorrect);
  };

  const nextTrivia = () => {
    if (!triviaSelected) return;
    if (triviaIndex + 1 >= questions.length) {
      setMode('summary');
    } else {
      setTriviaIndex((prev) => prev + 1);
      setTriviaSelected(null);
    }
  };

  const renderMenu = () => {
    const modes = [
      { id: 'matchingCards' as GameMode, title: 'Matching Cards', desc: 'Match terms with their correct definitions.', icon: 'grid-outline', bgColor: '#E3F2FD', iconColor: '#2196F3' },
      { id: 'flashcards' as GameMode, title: 'Flashcards', desc: 'Test your knowledge and reveal answers.', icon: 'albums-outline', bgColor: '#FFF3E0', iconColor: '#FF9800' },
      { id: 'fillBlank' as GameMode, title: 'Fill in the Blank', desc: 'Complete key sentences from the lesson.', icon: 'create-outline', bgColor: '#E8F5E9', iconColor: '#4CAF50' },
      { id: 'trivia' as GameMode, title: 'Trivia Challenge', desc: 'Answer multiple-choice questions.', icon: 'trophy-outline', bgColor: '#FCE4EC', iconColor: '#E91E63' },
    ];

    return (
      <View style={styles.gameContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.eyebrow}>Practice Games</Text>
          <Text style={styles.title}>Choose a Game</Text>
          <Text style={styles.subtitle}>Review your lessons with interactive games.</Text>
        </View>

        <View style={styles.modeGrid}>
          {modes.map((m) => (
            <Pressable key={m.id} style={styles.modeCard} onPress={() => openMode(m.id)}>
              <View style={[styles.modeIconBox, { backgroundColor: m.bgColor }]}>
                <Ionicons name={m.icon as any} size={28} color={m.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>{m.title}</Text>
                <Text style={styles.modeDescription}>{m.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderMatchingResults = () => {
    const total = terms.length;
    const percentage = total > 0 ? Math.round((matchingScore / total) * 100) : 0;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.summaryHeader}>
          <Ionicons name={percentage >= 75 ? 'trophy' : 'school'} size={60} color={percentage >= 75 ? '#FFC107' : '#2196F3'} />
          <Text style={styles.summaryTitle}>Matching Completed!</Text>
          <Text style={styles.summaryScore}>{matchingScore} / {total}</Text>
          <Text style={styles.summaryPercentage}>{percentage}% Accuracy</Text>
        </View>

        <Text style={styles.reviewTitle}>Review Your Matches</Text>
        <View style={styles.reviewList}>
          {terms.map((term, idx) => {
            const ans = userAnswers[idx];
            const isCorrect = ans?.isCorrect;

            return (
              <View key={term.id} style={[styles.reviewItem, isCorrect ? styles.reviewCorrect : styles.reviewWrong]}>
                <View style={styles.reviewItemHeader}>
                  <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={20} color={isCorrect ? '#4CAF50' : '#F44336'} />
                  <Text style={styles.reviewQuestionText} numberOfLines={2}>
                    Term: {term.text}
                  </Text>
                </View>
                <View style={styles.reviewAnswers}>
                  <Text style={styles.reviewUserAnswer}>
                    Your Match:{'\n'}
                    {ans?.userAnswer || 'No Answer'}
                  </Text>
                  {!isCorrect && (
                    <Text style={styles.reviewCorrectAnswer}>
                      Correct Match:{'\n'}
                      {ans?.correctAnswer}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.modalButtonRow}>
          <Pressable style={styles.cancelBtn} onPress={resetMatchingCards}>
            <Text style={styles.cancelBtnText}>Play Again</Text>
          </Pressable>
          <Pressable 
            style={styles.saveBtn} 
            onPress={async () => {
              // 🆕 LEADERBOARD: no need to save here — the score was already
              // recorded the moment this results screen was reached (see the
              // effect above). This just leaves the results screen.
              // 🐛 FIX: await so the storage removal finishes before onBack()
              // navigates away and Game.tsx re-checks for a resumable
              // session (otherwise it can still see the stale entry).
              await clearSavedProgress();
              onBack();
            }}
          >
            <Text style={styles.saveBtnText}>Save & Back</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderMatchingCardGame = () => {
    if (showResults) {
      return renderMatchingResults();
    }

    const pairedCount = Object.keys(userChoices).length;
    const isSubmitDisabled = pairedCount < terms.length;
    const activeTermIndex = selectedTermId
      ? terms.findIndex(t => t.id === selectedTermId)
      : -1;
    const activeColor = activeTermIndex >= 0 ? matchColor(activeTermIndex) : null;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Paired: {pairedCount}/{terms.length}</Text>
        </View>

        <Text style={styles.memoryMatchInstructions}>
          Pick a term, then pick its definition. Each definition can only be used once.
          Tap a paired card to change it.
        </Text>

        {/* Progress: one dot per term, filled with that term's color once paired */}
        <View style={styles.matchProgressRow}>
          {terms.map((t, i) => (
            <View
              key={`dot-${t.id}`}
              style={[
                styles.matchDot,
                userChoices[t.id] ? { backgroundColor: matchColor(i), borderColor: matchColor(i) } : null,
              ]}
            />
          ))}
        </View>

        <Text style={[styles.matchPrompt, activeColor ? { color: activeColor } : null]}>
          {selectedTermId
            ? `Now choose the match for term ${activeTermIndex + 1}`
            : 'Select a term from Column A'}
        </Text>

        <View style={styles.memoryMatchContainer}>
          <View style={styles.memoryColumn}>
            <Text style={styles.memoryColumnHeader}>Column A (Terms)</Text>
            {terms.map((card, tIdx) => {
              const color = matchColor(tIdx);
              const pairedDefIndex = definitions.findIndex(d => d.id === userChoices[card.id]);
              const isPaired = pairedDefIndex >= 0;
              const isActive = selectedTermId === card.id;
              return (
                <Pressable
                  key={card.id}
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
                  onPress={() => handleTermPress(card.id)}
                >
                  <View style={[styles.matchBadge, { backgroundColor: color }]}>
                    <Text style={styles.matchBadgeText}>{tIdx + 1}</Text>
                  </View>
                  <Text style={styles.matchCardText}>{card.text}</Text>
                  {isPaired ? (
                    <View style={[styles.matchChip, { backgroundColor: color }]}>
                      <Text style={styles.matchChipText}>{String.fromCharCode(65 + pairedDefIndex)}</Text>
                    </View>
                  ) : isActive ? (
                    <Ionicons name="radio-button-on" size={22} color={color} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.memoryColumn}>
            <Text style={styles.memoryColumnHeader}>Column B (Definitions)</Text>
            {definitions.map((card, index) => {
              const letter = String.fromCharCode(65 + index);
              const ownerId = Object.keys(userChoices).find(k => userChoices[k] === card.id);
              const ownerIndex = ownerId ? terms.findIndex(t => t.id === ownerId) : -1;
              const isTaken = ownerIndex >= 0;
              const ownerColor = isTaken ? matchColor(ownerIndex) : null;
              // Free definitions glow in the active term's color so the target is obvious.
              const isTarget = !isTaken && activeColor !== null;

              return (
                <Pressable
                  key={card.id}
                  style={[
                    styles.matchCard,
                    isTaken && { backgroundColor: ownerColor + '1A', borderColor: ownerColor as string },
                    isTarget && { borderColor: activeColor as string, borderStyle: 'dashed' },
                  ]}
                  onPress={() => handleDefinitionPress(card.id)}
                >
                  <View style={[styles.matchBadge, { backgroundColor: isTaken ? (ownerColor as string) : '#ECEFF1' }]}>
                    <Text style={[styles.matchBadgeText, !isTaken && { color: '#546E7A' }]}>{letter}</Text>
                  </View>
                  <Text style={styles.matchCardText}>{card.text}</Text>
                  {isTaken && (
                    <View style={[styles.matchChip, { backgroundColor: ownerColor as string }]}>
                      <Text style={styles.matchChipText}>{ownerIndex + 1}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          style={[styles.nextButton, isSubmitDisabled && styles.nextButtonDisabled]}
          onPress={handleSubmitMatching}
          disabled={isSubmitDisabled}
        >
          <Text style={styles.nextButtonText}>Submit Answers</Text>
        </Pressable>
      </View>
    );
  };

  // Compact response bar used by every fixed-layout game. It lives in a fixed
  // slot at the bottom so answering never pushes the page taller / scrollable.
  const renderFeedbackBar = (
    correct: boolean,
    title: string,
    lines: Array<string | null | undefined>,
    buttons: Array<{ label: string; onPress: () => void }>
  ) => (
    <View style={[styles.feedbackBar, correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
      <Text style={[styles.feedbackTitle, { color: correct ? '#2E7D32' : '#C62828' }]}>{title}</Text>
      {lines.filter(Boolean).length > 0 && (
        <ScrollView style={styles.feedbackLines} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {lines.filter(Boolean).map((line, i) => (
            <Text key={i} style={styles.feedbackLine}>{line}</Text>
          ))}
        </ScrollView>
      )}
      {buttons.map(b => (
        <Pressable key={b.label} style={[styles.nextButton, styles.feedbackNextButton]} onPress={b.onPress}>
          <Text style={styles.nextButtonText}>{b.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderFlashcardGame = () => {
    if (!currentFlashcard) return null;
    const flashcardTotal = flashcardItems.length > 0 ? flashcardItems.length : questions.length;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Card {flashcardIndex + 1} of {flashcardTotal}</Text>
        </View>

        <View style={styles.flashcardContainer}>
          <ScrollView
            style={styles.flashcardScrollFill}
            contentContainerStyle={styles.flashcardScroll}
            showsVerticalScrollIndicator={false}
          >
            {!isFlashcardAnswerVisible ? (
              <>
                <Ionicons name="help-circle-outline" size={40} color="#8B0000" />
                <Text style={styles.flashcardQuestion}>{currentFlashcard.question}</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={40} color="#4CAF50" />
                <Text style={styles.flashcardAnswerText}>{currentFlashcard.answer}</Text>
                {currentFlashcard.explanation ? (
                  <Text style={styles.flashcardExplanation}>{currentFlashcard.explanation}</Text>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>

        <View style={styles.fixedFooter}>
          {!flashcardChecked ? (
            <View style={styles.flashcardInputContainer}>
              <TextInput
                style={[styles.flashcardInput, styles.fixedInput]}
                placeholder="Type your answer here..."
                placeholderTextColor="#999"
                value={flashcardInput}
                onChangeText={setFlashcardInput}
                multiline
              />
              <Pressable
                style={[styles.nextButton, styles.feedbackNextButton, (!flashcardInput.trim() || isFlashcardGrading) && styles.nextButtonDisabled]}
                onPress={handleFlashcardCheck}
                disabled={!flashcardInput.trim() || isFlashcardGrading}
              >
                {isFlashcardGrading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.nextButtonText}>Check Answer</Text>
                )}
              </Pressable>
            </View>
          ) : (
            renderFeedbackBar(
              !!flashcardIsCorrect,
              flashcardIsCorrect ? 'Correct! 🎉' : 'Incorrect ❌',
              [!flashcardIsCorrect && isFlashcardAnswerVisible ? `Your answer: ${flashcardInput}` : null],
              !flashcardIsCorrect && !isFlashcardAnswerVisible
                ? [{ label: 'Tap to See Answer', onPress: () => setIsFlashcardAnswerVisible(true) }]
                : [{
                    label: flashcardIndex + 1 >= flashcardTotal ? 'Finish Practice' : 'Next Card',
                    onPress: handleNextFlashcard,
                  }]
            )
          )}
        </View>
      </View>
    );
  };

  const renderFillBlankGame = () => {
    if (!currentFillItem) return null;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Item {fillIndex + 1} of {fillBlankItems.length}</Text>
          <Text style={styles.scoreText}>Score: {fillScore}</Text>
        </View>

        <View style={styles.fixedQuestionCard}>
          <ScrollView contentContainerStyle={styles.fixedQuestionScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.questionText}>{currentFillItem.prompt}</Text>
          </ScrollView>
        </View>

        <View style={styles.fixedFooter}>
          <TextInput
            style={[
              styles.flashcardInput,
              styles.fixedInput,
              fillChecked && (fillIsCorrect ? { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' } : { borderColor: '#F44336', backgroundColor: '#FFEBEE' }),
            ]}
            value={fillAnswer}
            onChangeText={setFillAnswer}
            placeholder="Type the missing word..."
            placeholderTextColor="#999"
            editable={!fillChecked}
            autoCapitalize="none"
          />

          {fillChecked ? (
            renderFeedbackBar(
              !!fillIsCorrect,
              fillIsCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌',
              [!fillIsCorrect ? `Correct answer: ${currentFillItem.answer}` : null, fillFeedback, currentFillItem.explanation],
              [{ label: fillIndex + 1 >= fillBlankItems.length ? 'Finish Practice' : 'Next Item', onPress: nextFillBlank }]
            )
          ) : (
            <Pressable
              style={[styles.nextButton, styles.feedbackNextButton, (!fillAnswer.trim() || isFillGrading) && styles.nextButtonDisabled]}
              onPress={checkFillAnswer}
              disabled={!fillAnswer.trim() || isFillGrading}
            >
              {isFillGrading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.nextButtonText}>Check Answer</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderTriviaGame = () => {
    if (!currentTrivia) return null;
    const triviaCorrect = triviaSelected === currentTrivia.answer;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Question {triviaIndex + 1} of {questions.length}</Text>
          <Text style={styles.scoreText}>Score: {triviaScore}</Text>
        </View>

        <View style={styles.fixedQuestionCard}>
          <ScrollView contentContainerStyle={styles.fixedQuestionScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.questionText}>{currentTrivia.question}</Text>
          </ScrollView>
        </View>

        <View style={styles.optionsContainer}>
          {currentTrivia.options.map((opt) => {
            let bgColor = '#FFF';
            let borderColor = '#DDD';
            let textColor = '#333';
            let icon = null;

            if (triviaSelected) {
              if (opt === currentTrivia.answer) {
                bgColor = '#E8F5E9';
                borderColor = '#4CAF50';
                textColor = '#2E7D32';
                icon = <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
              } else if (opt === triviaSelected) {
                bgColor = '#FFEBEE';
                borderColor = '#F44336';
                textColor = '#C62828';
                icon = <Ionicons name="close-circle" size={24} color="#F44336" />;
              } else {
                bgColor = '#F9F9F9';
                borderColor = '#EEE';
                textColor = '#999';
              }
            }

            return (
              <Pressable
                key={opt}
                style={[styles.optionButton, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleTriviaSelect(opt)}
                disabled={!!triviaSelected}
              >
                <Text style={[styles.optionText, { color: textColor, flex: 1 }]}>{opt}</Text>
                {icon}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.fixedFooter, styles.fixedFooterMin]}>
          {triviaSelected ? (
            renderFeedbackBar(
              triviaCorrect,
              triviaCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌',
              [!triviaCorrect ? `Correct answer: ${currentTrivia.answer}` : null, currentTrivia.explanation],
              [{ label: triviaIndex + 1 >= questions.length ? 'Finish Practice' : 'Next Question', onPress: nextTrivia }]
            )
          ) : (
            <View style={styles.footerHint}>
              <Text style={styles.footerHintText}>Choose an answer</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSummary = () => {
    const total = userAnswers.length;
    const correctCount = userAnswers.filter((a) => a.isCorrect).length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.summaryHeader}>
          <Ionicons name={percentage >= 75 ? 'trophy' : 'school'} size={60} color={percentage >= 75 ? '#FFC107' : '#2196F3'} />
          <Text style={styles.summaryTitle}>Practice Completed!</Text>
          <Text style={styles.summaryScore}>
            {correctCount} / {total}
          </Text>
          <Text style={styles.summaryPercentage}>{percentage}% Accuracy</Text>
          <Text style={styles.summarySubtext}>
            {percentage >= 80
              ? 'Excellent work! Keep it up.'
              : percentage >= 50
              ? 'Good job! Review the missed questions.'
              : 'Nice try! Review the lesson and play again.'}
          </Text>
        </View>

        <Text style={styles.reviewTitle}>Review Your Answers</Text>
        <View style={styles.reviewList}>
          {userAnswers.map((ans, idx) => (
            <View key={idx} style={[styles.reviewItem, ans.isCorrect ? styles.reviewCorrect : styles.reviewWrong]}>
              <View style={styles.reviewItemHeader}>
                <Ionicons name={ans.isCorrect ? 'checkmark-circle' : 'close-circle'} size={20} color={ans.isCorrect ? '#4CAF50' : '#F44336'} />
                <Text style={styles.reviewQuestionText} numberOfLines={2}>
                  Q{idx + 1}: {ans.question}
                </Text>
              </View>
              <View style={styles.reviewAnswers}>
                <Text style={styles.reviewUserAnswer}>Your Answer: {ans.userAnswer || 'No answer'}</Text>
                {!ans.isCorrect && <Text style={styles.reviewCorrectAnswer}>Correct Answer: {ans.correctAnswer}</Text>}
                {ans.explanation && <Text style={styles.reviewExplanation}>Explanation: {ans.explanation}</Text>}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.modalButtonRow}>
          <Pressable
                style={styles.cancelBtn}
                onPress={async () => {
                  // 🆕 LEADERBOARD: no need to worry about saving here — the
                  // score was already recorded the moment this results
                  // screen was reached (see the effect above). This just
                  // clears the "unfinished quiz" resume state and hands off
                  // to the parent to reopen the new-quiz modal.
                  // 🐛 FIX: await so the removal finishes before we navigate
                  // away — otherwise Game.tsx can remount and re-check
                  // storage before the old session is actually gone.
                  await clearSavedProgress();
                  if (onPlayAgain) onPlayAgain();
                  else onBack();
                }}
            >
            <Text style={styles.cancelBtnText}>Play Again</Text>
          </Pressable>
          <Pressable
            style={styles.saveBtn}
            onPress={async () => {
              // 🆕 LEADERBOARD: score is already saved (see the effect
              // above) — this button now just leaves the results screen.
              // 🐛 FIX: await so this finishes before onBack() navigates
              // away (see note above).
              await clearSavedProgress();
              onBack();
            }}
          >
            <Text style={styles.saveBtnText}>Back to Games</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (!hasGeneratedGame) {
      return (
        <View style={styles.gameContainer}>
          <View style={styles.headerSection}>
            <Text style={styles.eyebrow}>Quiz Masters</Text>
            <Text style={styles.title}>No Questions Generated</Text>
            <Text style={styles.subtitle}>Upload a lesson file first to generate practice questions.</Text>
          </View>
          <Pressable style={styles.nextButton} onPress={onBack}>
            <Text style={styles.nextButtonText}>Back to Games</Text>
          </Pressable>
        </View>
      );
    }

    if (mode === 'summary') return renderSummary();
    if (mode === 'matchingCards') return renderMatchingCardGame();
    if (mode === 'flashcards') return renderFlashcardGame();
    if (mode === 'fillBlank') return renderFillBlankGame();
    if (mode === 'trivia') return renderTriviaGame();

    return renderMenu();
  };

  // Matching has a long two-column list and the summary/menu are plain pages, so they
  // keep the scrolling page; the other practice games are a fixed, no-scroll layout.
  const isFixedLayout =
    hasGeneratedGame && (mode === 'flashcards' || mode === 'fillBlank' || mode === 'trivia');

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={goToGameScreen} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {mode === 'menu' ? 'Quiz Masters' : mode === 'summary' ? 'Practice Results' : 'Practice Game'}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      {isFixedLayout ? (
        // Question-style games fit the screen: no page scrolling, so the
        // correct/wrong response and Next button are always visible.
        <KeyboardAvoidingView
          style={styles.fixedShell}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              isLargeScreen
                ? [styles.contentWrapLarge, { width: LARGE_SCREEN_CONTENT_WIDTH_PERCENT }]
                : styles.contentWrapSmall,
              styles.fixedFill,
            ]}
          >
            {renderContent()}
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View
            style={
              isLargeScreen
                ? [styles.contentWrapLarge, { width: LARGE_SCREEN_CONTENT_WIDTH_PERCENT }]
                : styles.contentWrapSmall
            }
          >
            {renderContent()}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B0000',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 50,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: { fontFamily: FONT_TITLE, color: '#FFF', fontSize: 18, fontWeight: WEIGHT_TITLE, flex: 1, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  contentWrapSmall: { width: '100%' },
  contentWrapLarge: { maxWidth: 900, minWidth: 480, alignSelf: 'center' },
  gameContainer: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressText: { fontFamily: FONT_BODY, fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#555' },
  scoreText: { fontFamily: FONT_BODY, fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#8B0000' },
  questionCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  questionText: { fontFamily: FONT_BODY, fontSize: 18, fontWeight: WEIGHT_EMPHASIS, color: '#222', lineHeight: 26 },
  optionsContainer: { gap: 10 },
  optionButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: WEIGHT_EMPHASIS },
  feedbackCard: { marginTop: 24, padding: 20, borderRadius: 16, alignItems: 'center' },
  feedbackCorrect: { backgroundColor: '#E8F5E9' },
  feedbackWrong: { backgroundColor: '#FFEBEE' },
  feedbackText: { fontFamily: FONT_BODY, fontSize: 20, fontWeight: WEIGHT_EMPHASIS, marginBottom: 8 },
  feedbackSubtext: { fontFamily: FONT_BODY, fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
  feedbackMessage: { fontFamily: FONT_BODY, textAlign: 'center', color: '#2196F3', fontWeight: WEIGHT_EMPHASIS, marginTop: 12, marginBottom: 12 },
  nextButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonDisabled: { backgroundColor: '#CCC' },
  nextButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontSize: 16, fontWeight: WEIGHT_EMPHASIS },
  // Fixed (no-scroll) game layout
  fixedShell: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  fixedFill: { flex: 1 },
  fixedQuestionCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 80,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  fixedQuestionScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  fixedFooter: { flexShrink: 0, marginTop: 8, justifyContent: 'flex-end', gap: 8 },
  fixedFooterMin: { minHeight: 134 },
  footerHint: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  footerHintText: { fontFamily: FONT_BODY, color: '#8A8F98', fontSize: 14, fontWeight: WEIGHT_EMPHASIS },
  feedbackBar: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  feedbackTitle: { fontFamily: FONT_BODY, fontSize: 18, fontWeight: WEIGHT_EMPHASIS, textAlign: 'center' },
  feedbackLines: { maxHeight: 84, alignSelf: 'stretch', marginTop: 4 },
  feedbackLine: { fontFamily: FONT_BODY, fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 2 },
  feedbackNextButton: { marginTop: 8, paddingVertical: 12 },
  fixedInput: { minHeight: 48, maxHeight: 96 },
  flashcardScrollFill: { alignSelf: 'stretch' },
  flashcardScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  flashcardContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    overflow: 'hidden',
  },
  flashcardFront: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  flashcardBack: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
  },
  flashcardQuestion: { fontFamily: FONT_BODY, fontSize: 20, fontWeight: WEIGHT_EMPHASIS, color: '#222', textAlign: 'center', marginTop: 16 },
  flashcardAnswerText: { fontFamily: FONT_BODY, fontSize: 22, fontWeight: WEIGHT_EMPHASIS, color: '#2E7D32', textAlign: 'center', marginTop: 16 },
  flashcardExplanation: { fontFamily: FONT_BODY, marginTop: 10, color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  flashcardInputContainer: { gap: 12 },
  flashcardInput: { fontFamily: FONT_BODY, 
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  memoryMatchInstructions: { fontFamily: FONT_BODY, fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, fontWeight: WEIGHT_EMPHASIS },
  memoryMatchContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 10 },
  memoryColumn: { flex: 1, paddingHorizontal: 10 },
  memoryColumnHeader: { fontFamily: FONT_BODY, 
    fontSize: 16,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#222',
    textAlign: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#8B0000',
  },
  memoryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memoryCardSelected: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  memoryCardMatched: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', opacity: 0.85 },
  // Matching — colored pair cards
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E3E8',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    minHeight: 64,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  matchBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  matchBadgeText: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: '#FFF', fontSize: 14 },
  matchCardText: { fontFamily: FONT_BODY, flex: 1, color: '#222', fontSize: 14, fontWeight: WEIGHT_EMPHASIS },
  matchChip: { minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  matchChipText: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: '#FFF', fontSize: 13 },
  matchProgressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  matchDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#CFD4DA', backgroundColor: '#FFF' },
  matchPrompt: { fontFamily: FONT_BODY, textAlign: 'center', marginBottom: 14, color: '#2196F3', fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  memoryCardText: { fontFamily: FONT_BODY, color: '#222', fontSize: 14, fontWeight: WEIGHT_EMPHASIS, textAlign: 'center' },
  memoryCardSubtext: { fontFamily: FONT_BODY, fontSize: 12, color: '#4CAF50', marginTop: 4, fontWeight: WEIGHT_EMPHASIS },
  memoryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  memoryCardSelectedLetter: { fontFamily: FONT_BODY, 
    marginLeft: 8,
    color: '#8B0000',
    fontWeight: WEIGHT_EMPHASIS,
    fontSize: 14,
  },
  memoryCardLetter: { fontFamily: FONT_BODY, 
    fontWeight: WEIGHT_EMPHASIS,
    color: '#8B0000',
    marginBottom: 4,
    fontSize: 16,
  },
  summaryHeader: { alignItems: 'center', marginBottom: 24, padding: 20 },
  summaryTitle: { fontFamily: FONT_TITLE, fontSize: 24, fontWeight: WEIGHT_TITLE, color: '#222', marginTop: 12 },
  summaryScore: { fontFamily: FONT_BODY, fontSize: 28, fontWeight: WEIGHT_EMPHASIS, color: '#8B0000', marginTop: 8 },
  summaryPercentage: { fontFamily: FONT_BODY, fontSize: 18, fontWeight: WEIGHT_EMPHASIS, color: '#555', marginTop: 4 },
  summarySubtext: { fontFamily: FONT_BODY, fontSize: 14, color: '#777', marginTop: 8, textAlign: 'center' },
  reviewTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: WEIGHT_TITLE, color: '#222', marginBottom: 12, paddingHorizontal: 16 },
  reviewList: { paddingHorizontal: 16, marginBottom: 16 },
  reviewItem: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  reviewCorrect: { borderLeftColor: '#4CAF50' },
  reviewWrong: { borderLeftColor: '#F44336' },
  reviewItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reviewQuestionText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: '#222', flex: 1 },
  reviewAnswers: { marginLeft: 28 },
  reviewUserAnswer: { fontFamily: FONT_BODY, fontSize: 13, color: '#555', marginBottom: 4 },
  reviewCorrectAnswer: { fontFamily: FONT_BODY, fontSize: 13, color: '#4CAF50', fontWeight: WEIGHT_EMPHASIS },
  reviewExplanation: { fontFamily: FONT_BODY, fontSize: 13, color: '#2196F3', marginTop: 4, fontStyle: 'italic' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 6, paddingHorizontal: 16 },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  cancelBtnText: { fontFamily: FONT_BODY, color: '#444', fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  saveBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#8B0000',
  },
  saveBtnText: { fontFamily: FONT_BODY, color: '#fff', fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  headerSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  eyebrow: { fontFamily: FONT_BODY, color: '#8B0000', fontSize: 13, fontWeight: WEIGHT_EMPHASIS, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontFamily: FONT_TITLE, fontSize: 26, fontWeight: WEIGHT_TITLE, color: '#222', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: FONT_BODY, fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  modeGrid: { gap: 14, paddingHorizontal: 16 },
  modeCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E3EAF5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modeIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontFamily: FONT_TITLE, color: '#122033', fontSize: 18, fontWeight: WEIGHT_TITLE, marginBottom: 4 },
  modeDescription: { fontFamily: FONT_BODY, color: '#5A6B7F', fontSize: 14, lineHeight: 20 },
});