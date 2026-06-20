import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
}

// ============================================================
// RESPONSIVE DESIGN SYSTEM
// ============================================================
// Centralizes every breakpoint, scale, and spacing decision so
// no component below ever reaches for a hardcoded pixel value.
// ============================================================

const BREAKPOINTS = {
  smallPhone: 400,
  mobile: 600,
  tablet: 900,
};

interface ResponsiveInfo {
  width: number;
  height: number;
  isSmallPhone: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isWeb: boolean;
  contentWidth: number;
  horizontalPadding: number;
  cardPadding: number;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  font: {
    heading: number;
    subheading: number;
    body: number;
    question: number;
    caption: number;
    button: number;
  };
  flashcardWidth: number;
  flashcardHeight: number;
  memoryColumns: 1 | 2;
  touchTarget: number;
}

const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isSmallPhone = width < BREAKPOINTS.smallPhone;
    const isMobile = width >= BREAKPOINTS.smallPhone && width < BREAKPOINTS.mobile;
    const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
    const isDesktop = width >= BREAKPOINTS.tablet;
    const isLandscape = width > height;
    const isWeb = Platform.OS === 'web';

    // Centered content container max width, scales by device class.
    let contentWidth: number;
    if (isDesktop) {
      contentWidth = Math.min(width * 0.9, 1100);
      contentWidth = Math.max(contentWidth, 900 > width ? width * 0.94 : 900);
      contentWidth = Math.min(contentWidth, width - 32);
    } else if (isTablet) {
      contentWidth = Math.min(width * 0.92, 800);
      contentWidth = Math.max(Math.min(contentWidth, width - 24), 700 > width ? width - 24 : 700);
    } else {
      contentWidth = width; // small phone / mobile: full width with internal padding
    }

    const horizontalPadding = isSmallPhone ? 12 : isMobile ? 16 : isTablet ? 24 : 32;
    const cardPadding = isSmallPhone ? 16 : isMobile ? 20 : isTablet ? 24 : 28;

    const spacing = {
      xs: isSmallPhone ? 4 : 6,
      sm: isSmallPhone ? 8 : isMobile ? 10 : 12,
      md: isSmallPhone ? 12 : isMobile ? 16 : isTablet ? 20 : 24,
      lg: isSmallPhone ? 16 : isMobile ? 20 : isTablet ? 28 : 32,
      xl: isSmallPhone ? 20 : isMobile ? 28 : isTablet ? 36 : 44,
    };

    const font = {
      heading: isSmallPhone ? 18 : isMobile ? 20 : isTablet ? 25 : 30,
      subheading: isSmallPhone ? 15 : isMobile ? 16 : isTablet ? 18 : 20,
      body: isSmallPhone ? 14 : isMobile ? 15 : isTablet ? 16 : 18,
      question: isSmallPhone ? 18 : isMobile ? 19 : isTablet ? 23 : 26,
      caption: isSmallPhone ? 12 : isMobile ? 13 : 14,
      button: isSmallPhone ? 15 : isMobile ? 16 : isTablet ? 17 : 18,
    };

    // Flashcards: scale width with screen, keep a comfortable aspect ratio.
    const flashcardWidth = isDesktop
      ? Math.min(contentWidth * 0.7, 560)
      : isTablet
      ? contentWidth * 0.8
      : width - horizontalPadding * 2;
    const flashcardHeight = isSmallPhone
      ? 200
      : isMobile
      ? 230
      : isTablet
      ? 280
      : 320;

    // Memory match: stack on phones, two columns side-by-side on tablet/desktop.
    const memoryColumns: 1 | 2 = isTablet || isDesktop ? 2 : 1;

    const touchTarget = 48;

    return {
      width,
      height,
      isSmallPhone,
      isMobile,
      isTablet,
      isDesktop,
      isLandscape,
      isWeb,
      contentWidth,
      horizontalPadding,
      cardPadding,
      spacing,
      font,
      flashcardWidth,
      flashcardHeight,
      memoryColumns,
      touchTarget,
    };
  }, [width, height]);
};

const GameBasedAssignment: React.FC<GameBasedAssignmentProps> = ({
  assignmentTitle,
  questions,
  gameType,
  timeLimitMinutes,
  onBack,
  onComplete,
}) => {
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(r), [r]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Flashcard specific
  const [flashcardAnswer, setFlashcardAnswer] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSubmitted, setFlashcardSubmitted] = useState(false);

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

  // Initialize global timer on mount
  useEffect(() => {
    if (timeLimitMinutes && timeLimitMinutes > 0) {
      setGlobalTimeLeft(timeLimitMinutes * 60);
    } else {
      setGlobalTimeLeft(null); // Unlimited
    }
  }, [timeLimitMinutes]);

  // Handle Time Up Force Submit
  // 🌟 UPDATED: Immediately finishes game AND submits score
  const handleTimeUp = () => {
    setIsTimeUp(true);

    // 1. Force switch to Summary screen immediately
    setGameFinished(true);

    // 2. Submit current score to parent/backend immediately
    onComplete(scoreRef.current, questions.length);

    // 3. Show alert over the summary screen
    Alert.alert(
      "Time's Up!",
      'Your time limit has expired. Your current score has been automatically submitted.',
      [{ text: 'View Results', onPress: () => {} }]
    );
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

  // Reset per-question states when moving to the next question/card
  useEffect(() => {
    if (gameType === 'quiz_master') {
      setHasAnswered(false);
      setSelectedOption(null);
      setIsCorrect(null);
    } else if (gameType === 'flashcard') {
      setFlashcardAnswer('');
      setIsFlipped(false);
      setFlashcardSubmitted(false);
      setIsCorrect(null);
    } else if (gameType === 'fill_in_blanks') {
      setFlashcardAnswer('');
      setHasAnswered(false);
      setIsCorrect(null);
    }
  }, [currentIndex, gameType]);

  const currentQuestion = questions[currentIndex];

  const handleFinishGame = () => {
    setGameFinished(true);
  };

  // This function acts as "Return Home" / Final Submit
  const handleSubmitGame = () => {
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

  const handleFlashcardSubmit = () => {
    if (!flashcardAnswer.trim()) return;
    setFlashcardSubmitted(true);
    setIsFlipped(true);
    const correct = flashcardAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
    setIsCorrect(correct);
    if (correct) {
      setScore(prev => prev + 1);
    }
    setUserAnswers(prev => ({ ...prev, [currentIndex]: { selected: flashcardAnswer, isCorrect: correct } }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinishGame();
    }
  };

  const handleMemoryCardPress = (card: any) => {
    if (matchingSubmitted) return;

    if (card.type === 'term') {
      setSelectedTerm(card.pairId);
      return;
    }

    if (card.type === 'def' && selectedTerm !== null) {
      setTermAnswers(prev => ({
        ...prev,
        [selectedTerm]: card.pairId,
      }));

      setSelectedTerm(null);
    }
  };

  // UPDATED: Capture both Letter AND Full Sentence text
  const handleSubmitMatching = () => {
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

    setTimeout(() => {
      handleFinishGame();
    }, 500);
  };

  // Unified Header with Global Timer
  const renderHeader = (progressText: string) => (
    <View style={styles.header}>
      <Text style={styles.progressText} numberOfLines={1}>
        {progressText}
      </Text>

      {/* Global Timer Badge */}
      {globalTimeLeft !== null && (
        <View style={[styles.timerBadge, globalTimeLeft <= 60 && styles.timerBadgeUrgent]}>
          <Ionicons
            name="time-outline"
            size={r.isSmallPhone ? 14 : 16}
            color={globalTimeLeft <= 60 ? '#D32F2F' : '#FFF'}
          />
          <Text style={[styles.timerText, globalTimeLeft <= 60 && styles.timerTextUrgent]} numberOfLines={1}>
            {gameType === 'quiz_master' ? 'Time Limit ' : ''}{formatTime(globalTimeLeft)}
          </Text>
        </View>
      )}

      <Text style={styles.scoreText} numberOfLines={1}>
        Score: {score}/{questions.length}
      </Text>
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
          <Text style={styles.summaryTitle}>Game Completed!</Text>
          <Text style={styles.summaryScore}>{score} / {totalQuestions}</Text>
          <Text style={styles.summaryPercentage}>{percentage}% Accuracy</Text>
          <Text style={styles.summarySubtext}>
            You got {correctCount} out of {totalQuestions} correct.
          </Text>
        </View>

        <Text style={styles.reviewTitle}>Review Your Answers</Text>
        <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={false}>
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

                  <Text
                    style={styles.reviewQuestionText}
                    numberOfLines={2}
                  >
                    Q{idx + 1}: {q.question}
                  </Text>
                </View>

                <View style={styles.reviewAnswers}>
                  {gameType === 'memory_match' ? (
                    <>
                      {/* UPDATED: Show Letter + Full Sentence */}
                      <Text style={styles.reviewUserAnswer}>
                        Your Answer:{'\n'}
                        {matchingResults[idx]?.selectedLetter || 'No Answer'}: {' '}
                        {matchingResults[idx]?.selectedText || 'No Answer'}
                      </Text>

                      {/* Only show correct answer if wrong */}
                      {!isAnsCorrect && (
                        <Text style={styles.reviewCorrectAnswer}>
                          Correct Answer:{'\n'}
                          {matchingResults[idx]?.correctLetter}: {' '}
                          {matchingResults[idx]?.correctText}
                        </Text>
                      )}

                      <Text
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
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.reviewUserAnswer}>
                        Your Answer: {userAnswerText}
                      </Text>

                      {!isAnsCorrect && (
                        <Text
                          style={styles.reviewCorrectAnswer}
                        >
                          Correct Answer:{' '}
                          {correctAnswerText}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* CHANGED: Button now says "Return Home" as it submits and exits */}
        <TouchableOpacity style={styles.nextButton} onPress={handleSubmitGame}>
          <Text style={styles.nextButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderQuizMaster = () => (
    <View style={styles.gameContainer}>
      {renderHeader(`Question ${currentIndex + 1} / ${questions.length}`)}

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
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
              <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
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

      {hasAnswered && (
        <View style={[styles.feedbackCard, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
          <Text style={[styles.feedbackText, { color: isCorrect ? '#2E7D32' : '#C62828' }]}>
            {isCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌'}
          </Text>
          {!isCorrect && (
            <Text style={styles.feedbackSubtext}>
              Correct answer: {currentQuestion.options?.[currentQuestion.correctIndex!]}
            </Text>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFlashcard = () => (
    <View style={styles.gameContainer}>
      {renderHeader(`Card ${currentIndex + 1} / ${questions.length}`)}

      <View style={styles.flashcardOuter}>
        <View style={[styles.flashcardContainer, isFlipped && styles.flashcardFlipped]}>
          {!isFlipped ? (
            <View style={styles.flashcardFront}>
              <Ionicons name="help-circle-outline" size={r.isSmallPhone ? 32 : 40} color="#D32F2F" />
              <Text style={styles.flashcardQuestion}>{currentQuestion.question}</Text>
            </View>
          ) : (
            <View style={styles.flashcardBack}>
              <Ionicons name="checkmark-circle-outline" size={r.isSmallPhone ? 32 : 40} color="#4CAF50" />
              <Text style={styles.flashcardAnswerText}>{currentQuestion.answer}</Text>
            </View>
          )}
        </View>
      </View>

      {!flashcardSubmitted ? (
        <View style={styles.flashcardInputContainer}>
          <TextInput
            style={styles.flashcardInput}
            placeholder="Type your answer here..."
            placeholderTextColor="#999"
            value={flashcardAnswer}
            onChangeText={setFlashcardAnswer}
            multiline
          />
          <TouchableOpacity
            style={[styles.nextButton, !flashcardAnswer.trim() && styles.nextButtonDisabled]}
            onPress={handleFlashcardSubmit}
            disabled={!flashcardAnswer.trim()}
          >
            <Text style={styles.nextButtonText}>Submit & Flip Card</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.feedbackCard, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
          <Text style={[styles.feedbackText, { color: isCorrect ? '#2E7D32' : '#C62828' }]}>
            {isCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌'}
          </Text>
          {!isCorrect && (
            <Text style={styles.feedbackSubtext}>
              Your answer: {flashcardAnswer}
            </Text>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex < questions.length - 1 ? 'Next Card' : 'Finish Game'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFillInBlanks = () => (
    <View style={styles.gameContainer}>
      {renderHeader(`Question ${currentIndex + 1} / ${questions.length}`)}

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>

      {!hasAnswered ? (
        <View style={styles.flashcardInputContainer}>
          <TextInput
            style={styles.flashcardInput}
            placeholder="Type the missing word..."
            placeholderTextColor="#999"
            value={flashcardAnswer}
            onChangeText={setFlashcardAnswer}
          />
          <TouchableOpacity
            style={[styles.nextButton, !flashcardAnswer.trim() && styles.nextButtonDisabled]}
            onPress={() => {
              setHasAnswered(true);
              const correct = flashcardAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
              setIsCorrect(correct);
              if (correct) setScore(prev => prev + 1);
              setUserAnswers(prev => ({ ...prev, [currentIndex]: { selected: flashcardAnswer, isCorrect: correct } }));
            }}
            disabled={!flashcardAnswer.trim()}
          >
            <Text style={styles.nextButtonText}>Submit Answer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.feedbackCard, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
          <Text style={[styles.feedbackText, { color: isCorrect ? '#2E7D32' : '#C62828' }]}>
            {isCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect '}
          </Text>
          {!isCorrect && (
            <Text style={styles.feedbackSubtext}>
              Correct answer: {currentQuestion.answer}
            </Text>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderMemoryMatch = () => {
    const terms = memoryCards.filter(c => c.type === 'term');
    const defs = memoryCards.filter(c => c.type === 'def');
    const allAnswered = Object.keys(termAnswers).length === questions.length;
    return (
      <View style={styles.gameContainer}>
        {renderHeader('Match Terms to Definitions')}

        <Text style={styles.memoryMatchInstructions}>
          Select a term then select its matching letter.
        </Text>

        <Text style={styles.memoryMatchPrompt}>
          {selectedTerm !== null
            ? 'Select a letter from Column B'
            : 'Select a term from Column A'}
        </Text>

        <View style={styles.memoryMatchContainer}>
          {/* COLUMN A */}
          <View style={styles.memoryColumn}>
            <Text style={styles.memoryColumnHeader}>
              Column A (Terms)
            </Text>

            {terms.map(card => {
              const selectedDefId =
                termAnswers[card.pairId];

              const selectedIndex =
                defs.findIndex(
                  d => d.pairId === selectedDefId
                );

              const selectedLetter =
                selectedIndex >= 0
                  ? String.fromCharCode(
                      65 + selectedIndex
                    )
                  : '';

              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.memoryCard,
                    selectedTerm === card.pairId &&
                      styles.memoryCardSelected,
                  ]}
                  onPress={() =>
                    handleMemoryCardPress(card)
                  }
                >
                  <View style={styles.memoryCardRow}>
                    <Text style={styles.memoryCardText}>
                      {card.text}
                    </Text>

                    {selectedLetter !== '' && (
                      <Text style={styles.memoryCardSelectedLetter}>
                        ({selectedLetter})
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* COLUMN B */}
          <View style={styles.memoryColumn}>
            <Text style={styles.memoryColumnHeader}>
              Column B (Choices)
            </Text>

            {defs.map((card, index) => {
              const letter =
                String.fromCharCode(65 + index);

              return (
                <TouchableOpacity
                  key={card.id}
                  style={styles.memoryCard}
                  onPress={() =>
                    handleMemoryCardPress(card)
                  }
                >
                  <Text style={styles.memoryCardLetter}>
                    {letter}
                  </Text>

                  <Text style={styles.memoryCardText}>
                    {card.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.nextButton,
            !allAnswered && styles.nextButtonDisabled,
          ]}
          onPress={handleSubmitMatching}
          disabled={!allAnswered}
        >
          <Text style={styles.nextButtonText}>
            Submit Matching
          </Text>
        </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.topBar, { paddingTop: styles.topBar.paddingVertical + insets.top }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={r.isSmallPhone ? 20 : 24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1} ellipsizeMode="tail">
          {assignmentTitle}
        </Text>
        <View style={styles.topBarSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.centeredContent}>{renderGame()}</View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================
// STYLE FACTORY — derives every value from the responsive token
// set above. No hardcoded pixel widths/paddings/fonts here.
// ============================================================
const createStyles = (r: ResponsiveInfo) => {
  const isRowMemory = r.memoryColumns === 2;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#D32F2F',
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
    topBarTitle: {
      color: '#FFF',
      fontSize: r.font.subheading,
      fontWeight: '800',
      flex: 1,
      textAlign: 'center',
      marginHorizontal: r.spacing.sm,
    },
    topBarSpacer: { width: r.touchTarget },
    scrollContent: {
      paddingHorizontal: r.horizontalPadding,
      paddingTop: r.spacing.md,
      paddingBottom: r.spacing.xl + 16,
      alignItems: 'center',
      width: '100%',
    },
    centeredContent: {
      width: '100%',
      maxWidth: r.contentWidth,
      alignSelf: 'center',
    },
    gameContainer: { flex: 1, width: '100%' },
    header: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: r.spacing.lg,
      gap: r.spacing.sm,
    },
    progressText: {
      fontSize: r.font.body,
      fontWeight: '700',
      color: '#555',
      flexShrink: 1,
    },
    scoreText: {
      fontSize: r.font.body,
      fontWeight: '700',
      color: '#D32F2F',
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
    timerText: { color: '#FFF', fontWeight: '800', fontSize: r.font.caption },
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
    questionText: {
      fontSize: r.font.question,
      fontWeight: '700',
      color: '#222',
      lineHeight: r.font.question * 1.4,
      flexWrap: 'wrap',
    },
    optionsContainer: { gap: r.spacing.sm, width: '100%' },
    optionButton: {
      backgroundColor: '#FFF',
      borderWidth: 2,
      borderColor: '#DDD',
      borderRadius: 12,
      padding: r.isSmallPhone ? 14 : 16,
      minHeight: r.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    optionText: {
      fontSize: r.font.body,
      fontWeight: '600',
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
    feedbackText: {
      fontSize: r.font.subheading + 4,
      fontWeight: '800',
      marginBottom: r.spacing.sm,
      textAlign: 'center',
    },
    feedbackSubtext: {
      fontSize: r.font.body,
      color: '#555',
      marginBottom: r.spacing.md,
      textAlign: 'center',
    },
    nextButton: {
      backgroundColor: '#D32F2F',
      paddingVertical: r.isSmallPhone ? 12 : 14,
      paddingHorizontal: r.isDesktop ? 48 : 32,
      borderRadius: 12,
      marginTop: r.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: r.touchTarget,
      alignSelf: r.isDesktop ? 'center' : 'stretch',
      minWidth: r.isDesktop ? 240 : undefined,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
    },
    nextButtonDisabled: { backgroundColor: '#CCC' },
    nextButtonText: { color: '#FFF', fontSize: r.font.button, fontWeight: '800' },
    // Flashcard
    flashcardOuter: {
      width: '100%',
      alignItems: 'center',
    },
    flashcardContainer: {
      width: r.flashcardWidth,
      height: r.flashcardHeight,
      backgroundColor: '#FFF',
      borderRadius: 20,
      marginBottom: r.spacing.lg,
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
    flashcardQuestion: {
      fontSize: r.font.subheading + 4,
      fontWeight: '700',
      color: '#222',
      textAlign: 'center',
      marginTop: r.spacing.md,
      flexWrap: 'wrap',
    },
    flashcardAnswerText: {
      fontSize: r.font.subheading + 6,
      fontWeight: '800',
      color: '#2E7D32',
      textAlign: 'center',
      marginTop: r.spacing.md,
      flexWrap: 'wrap',
    },
    flashcardInputContainer: { gap: r.spacing.sm, width: '100%' },
    flashcardInput: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#DDD',
      borderRadius: 12,
      padding: r.isSmallPhone ? 14 : 16,
      fontSize: r.font.body,
      minHeight: 60,
      textAlignVertical: 'top',
      width: '100%',
    },
    // Memory Match — responsive two-column layout
    memoryMatchInstructions: {
      fontSize: r.font.caption,
      color: '#666',
      textAlign: 'center',
      marginBottom: r.spacing.md,
      fontWeight: '600',
    },
    memoryMatchPrompt: {
      textAlign: 'center',
      marginBottom: r.spacing.sm + 2,
      color: '#2196F3',
      fontWeight: '700',
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
    memoryColumnHeader: {
      fontSize: r.font.subheading,
      fontWeight: '800',
      color: '#222',
      textAlign: 'center',
      marginBottom: r.spacing.md,
      paddingBottom: r.spacing.xs + 4,
      borderBottomWidth: 2,
      borderBottomColor: '#D32F2F',
    },
    memoryCard: {
      backgroundColor: '#FFF',
      borderRadius: 12,
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
    memoryCardSelectedLetter: {
      marginLeft: r.spacing.xs + 4,
      color: '#D32F2F',
      fontWeight: '900',
      fontSize: r.font.body,
    },
    memoryCardLetter: {
      fontWeight: '900',
      color: '#D32F2F',
      marginBottom: r.spacing.xs + 2,
      fontSize: r.font.body,
    },
    memoryCardText: {
      color: '#222',
      fontSize: r.font.caption + 1,
      fontWeight: '600',
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
    summaryTitle: {
      fontSize: r.font.heading,
      fontWeight: '800',
      color: '#222',
      marginTop: r.spacing.sm,
      textAlign: 'center',
    },
    summaryScore: {
      fontSize: r.font.heading + (r.isDesktop ? 6 : 4),
      fontWeight: '900',
      color: '#D32F2F',
      marginTop: r.spacing.xs + 4,
      textAlign: 'center',
    },
    summaryPercentage: {
      fontSize: r.font.subheading,
      fontWeight: '700',
      color: '#555',
      marginTop: r.spacing.xs,
      textAlign: 'center',
    },
    summarySubtext: {
      fontSize: r.font.caption + 1,
      color: '#777',
      marginTop: r.spacing.xs + 4,
      textAlign: 'center',
    },
    reviewTitle: {
      fontSize: r.font.subheading,
      fontWeight: '800',
      color: '#222',
      marginBottom: r.spacing.sm + 4,
      width: '100%',
    },
    reviewList: { width: '100%', marginBottom: r.spacing.md },
    reviewItem: {
      backgroundColor: '#FFF',
      borderRadius: 12,
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
    reviewQuestionText: {
      fontSize: r.font.caption + 1,
      fontWeight: '700',
      color: '#222',
      flex: 1,
      flexWrap: 'wrap',
    },
    reviewAnswers: { marginLeft: 28, flexShrink: 1 },
    reviewUserAnswer: {
      fontSize: r.font.caption,
      color: '#555',
      marginBottom: r.spacing.xs,
      flexWrap: 'wrap',
    },
    reviewCorrectAnswer: {
      fontSize: r.font.caption,
      color: '#4CAF50',
      fontWeight: '600',
      flexWrap: 'wrap',
    },
  });
};

export default GameBasedAssignment;