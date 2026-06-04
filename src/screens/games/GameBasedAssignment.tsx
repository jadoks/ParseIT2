import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
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

const GameBasedAssignment: React.FC<GameBasedAssignmentProps> = ({
  assignmentTitle,
  questions,
  gameType,
  timeLimitMinutes,
  onBack,
  onComplete,
}) => {
  const { width } = useWindowDimensions();
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
      <Text style={styles.progressText}>{progressText}</Text>
      
      {/* Global Timer Badge */}
      {globalTimeLeft !== null && (
        <View style={[styles.timerBadge, globalTimeLeft <= 60 && styles.timerBadgeUrgent]}>
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={globalTimeLeft <= 60 ? '#D32F2F' : '#FFF'} 
          />
          <Text style={[styles.timerText, globalTimeLeft <= 60 && styles.timerTextUrgent]}>
            {gameType === 'quiz_master' ? 'Time Limit ' : ''}{formatTime(globalTimeLeft)}
          </Text>
        </View>
      )}

      <Text style={styles.scoreText}>Score: {score}/{questions.length}</Text>
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
          <Ionicons name={percentage >= 75 ? "trophy" : "school"} size={60} color={percentage >= 75 ? "#FFC107" : "#2196F3"} />
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
                          marginTop: 8,
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

      <View style={[styles.flashcardContainer, isFlipped && styles.flashcardFlipped]}>
        {!isFlipped ? (
          <View style={styles.flashcardFront}>
            <Ionicons name="help-circle-outline" size={40} color="#D32F2F" />
            <Text style={styles.flashcardQuestion}>{currentQuestion.question}</Text>
          </View>
        ) : (
          <View style={styles.flashcardBack}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#4CAF50" />
            <Text style={styles.flashcardAnswerText}>{currentQuestion.answer}</Text>
          </View>
        )}
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

        <Text
          style={{
            textAlign: 'center',
            marginBottom: 10,
            color: '#2196F3',
            fontWeight: '700',
          }}
        >
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
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={styles.memoryCardText}>
                      {card.text}
                    </Text>

                    {selectedLetter !== '' && (
                      <Text
                        style={{
                          marginLeft: 8,
                          color: '#D32F2F',
                          fontWeight: '900',
                          fontSize: 16,
                        }}
                      >
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
                  <Text
                    style={{
                      fontWeight: '900',
                      color: '#D32F2F',
                      marginBottom: 6,
                    }}
                  >
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
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{assignmentTitle}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderGame()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#D32F2F', paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: 50,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  gameContainer: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressText: { fontSize: 16, fontWeight: '700', color: '#555' },
  scoreText: { fontSize: 16, fontWeight: '700', color: '#D32F2F' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2196F3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  timerBadgeUrgent: { backgroundColor: '#FFEBEE' },
  timerText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  timerTextUrgent: { color: '#D32F2F' },
  questionCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  questionText: { fontSize: 18, fontWeight: '700', color: '#222', lineHeight: 26 },
  optionsContainer: { gap: 12 },
  optionButton: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#DDD', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: { fontSize: 15, fontWeight: '600', flex: 1 },
  feedbackCard: { marginTop: 24, padding: 20, borderRadius: 16, alignItems: 'center' },
  feedbackCorrect: { backgroundColor: '#E8F5E9' },
  feedbackWrong: { backgroundColor: '#FFEBEE' },
  feedbackText: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  feedbackSubtext: { fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
  nextButton: { backgroundColor: '#D32F2F', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 16, alignItems: 'center' },
  nextButtonDisabled: { backgroundColor: '#CCC' },
  nextButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  // Flashcard
  flashcardContainer: { height: 250, backgroundColor: '#FFF', borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, elevation: 6, justifyContent: 'center', alignItems: 'center', padding: 24 },
  flashcardFlipped: { backgroundColor: '#E8F5E9' },
  flashcardFront: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  flashcardBack: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  flashcardQuestion: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center', marginTop: 16 },
  flashcardAnswerText: { fontSize: 22, fontWeight: '800', color: '#2E7D32', textAlign: 'center', marginTop: 16 },
  flashcardInputContainer: { gap: 12 },
  flashcardInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 60, textAlignVertical: 'top' },
  // Memory Match - Two Column Layout
  memoryMatchInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  memoryMatchContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  memoryColumn: {
    flex: 1,
    paddingHorizontal: 10,
  },
  memoryColumnHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#D32F2F',
  },
  memoryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
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
  memoryCardMatched: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  memoryCardSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  memoryCardText: {
    color: '#222',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  summaryHeader: { alignItems: 'center', marginBottom: 24, padding: 20 },
  summaryTitle: { fontSize: 24, fontWeight: '800', color: '#222', marginTop: 12 },
  summaryScore: { fontSize: 28, fontWeight: '900', color: '#D32F2F', marginTop: 8 },
  summaryPercentage: { fontSize: 18, fontWeight: '700', color: '#555', marginTop: 4 },
  summarySubtext: { fontSize: 14, color: '#777', marginTop: 8 },
  reviewTitle: { fontSize: 18, fontWeight: '800', color: '#222', marginBottom: 12, paddingHorizontal: 16 },
  reviewList: { paddingHorizontal: 16, marginBottom: 16 },
  reviewItem: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4 },
  reviewCorrect: { borderLeftColor: '#4CAF50' },
  reviewWrong: { borderLeftColor: '#F44336' },
  reviewItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reviewQuestionText: { fontSize: 14, fontWeight: '700', color: '#222', flex: 1 },
  reviewAnswers: { marginLeft: 28 },
  reviewUserAnswer: { fontSize: 13, color: '#555', marginBottom: 4 },
  reviewCorrectAnswer: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
});

export default GameBasedAssignment;