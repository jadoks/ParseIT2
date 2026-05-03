import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface Props {
  onBack: () => void;
  generatedQuestions?: QuizQuestion[] | null;
}

type GameMode = 'menu' | 'matchingCards' | 'flashcards' | 'fillBlank' | 'trivia';

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
};

function normalizeText(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function sanitizeQuestions(value?: QuizQuestion[] | null): QuizQuestion[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const question = typeof item?.question === 'string' ? item.question.trim() : '';
      const options = Array.isArray(item?.options)
        ? item.options.map((option) => String(option || '').trim()).filter(Boolean)
        : [];
      const answer = typeof item?.answer === 'string' ? item.answer.trim() : '';
      const explanation = typeof item?.explanation === 'string' ? item.explanation.trim() : '';

      if (!question || options.length !== 4 || !answer) return null;

      const exactAnswer = options.find(
        (option) => normalizeText(option) === normalizeText(answer)
      );

      if (!exactAnswer) return null;

      return {
        question,
        options,
        answer: exactAnswer,
        explanation,
      };
    })
    .filter(Boolean)
    .slice(0, 10) as QuizQuestion[];
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
  }));
}

function createMatchingCards(questions: QuizQuestion[]): MatchingCard[] {
  const selectedQuestions = questions.slice(0, Math.min(6, questions.length));

  const cards = selectedQuestions.flatMap((item, index) => {
    const pairId = `pair-${index}`;

    return [
      {
        id: `${pairId}-term`,
        type: 'term' as const,
        pairId,
        text: item.answer,
        matched: false,
      },
      {
        id: `${pairId}-definition`,
        type: 'definition' as const,
        pairId,
        text: item.question,
        matched: false,
      },
    ];
  });

  return shuffleArray(cards);
}

export default function QuizMasters({ onBack, generatedQuestions }: Props) {
  const { width, height } = useWindowDimensions();

  const contentWidth = useMemo(() => {
    if (width >= 900) return 780;
    if (width >= 600) return width * 0.86;
    return width - 24;
  }, [width]);

  const questions = useMemo(() => sanitizeQuestions(generatedQuestions), [generatedQuestions]);
  const fillBlankItems = useMemo(() => createFillBlankItems(questions), [questions]);

  const [mode, setMode] = useState<GameMode>('menu');

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [matchingCards, setMatchingCards] = useState<MatchingCard[]>([]);
  const [matchingMoves, setMatchingMoves] = useState(0);
  const [matchingMessage, setMatchingMessage] = useState('');

  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlashcardAnswerVisible, setIsFlashcardAnswerVisible] = useState(false);

  const [fillIndex, setFillIndex] = useState(0);
  const [fillAnswer, setFillAnswer] = useState('');
  const [fillScore, setFillScore] = useState(0);
  const [fillChecked, setFillChecked] = useState(false);
  const [fillFinished, setFillFinished] = useState(false);

  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaSelected, setTriviaSelected] = useState<string | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);

  const hasGeneratedGame = questions.length > 0;

  const currentFlashcard = questions[flashcardIndex];
  const currentFillItem = fillBlankItems[fillIndex];
  const currentTrivia = questions[triviaIndex];

  const matchedPairs = matchingCards.filter(
    (card) => card.type === 'term' && card.matched
  ).length;

  const totalMatchingPairs = Math.floor(matchingCards.length / 2);
  const isMatchingComplete = totalMatchingPairs > 0 && matchedPairs === totalMatchingPairs;

  useEffect(() => {
    resetAll();
  }, [questions.length]);

  const resetMatchingCards = () => {
    setSelectedCardId(null);
    setMatchingCards(createMatchingCards(questions));
    setMatchingMoves(0);
    setMatchingMessage('');
  };

  const resetFlashcards = () => {
    setFlashcardIndex(0);
    setIsFlashcardAnswerVisible(false);
  };

  const resetFillBlank = () => {
    setFillIndex(0);
    setFillAnswer('');
    setFillScore(0);
    setFillChecked(false);
    setFillFinished(false);
  };

  const resetTrivia = () => {
    setTriviaIndex(0);
    setTriviaSelected(null);
    setTriviaScore(0);
    setTriviaFinished(false);
  };

  const resetAll = () => {
    resetMatchingCards();
    resetFlashcards();
    resetFillBlank();
    resetTrivia();
    setMode('menu');
  };

  const goToMenu = () => {
    resetMatchingCards();
    resetFlashcards();
    resetFillBlank();
    resetTrivia();
    setMode('menu');
  };

  const renderBackButton = (onPress = onBack) => (
    <Pressable style={styles.backButtonInline} onPress={onPress}>
      <Text style={styles.backIcon}>←</Text>
    </Pressable>
  );

  const renderMissingGame = () => (
    <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
      {renderBackButton(onBack)}
      <View style={styles.contentCard}>
        <Text style={styles.sectionEyebrow}>Quiz Masters</Text>
        <Text style={styles.headerTitle}>Upload a Lesson File First</Text>
        <Text style={styles.headerSubtitle}>
          Go back to the Games screen, tap Upload File, and wait for Quiz Masters to generate content from your file.
        </Text>
        <View style={styles.divider} />
        <Pressable style={styles.primaryButton} onPress={onBack}>
          <Text style={styles.primaryButtonText}>Back to Games</Text>
        </Pressable>
      </View>
    </View>
  );

  const openMode = (nextMode: GameMode) => {
    if (nextMode === 'matchingCards') resetMatchingCards();
    if (nextMode === 'flashcards') resetFlashcards();
    if (nextMode === 'fillBlank') resetFillBlank();
    if (nextMode === 'trivia') resetTrivia();
    setMode(nextMode);
  };

  const renderMenu = () => (
    <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
      {renderBackButton(onBack)}
      <View style={styles.contentCard}>
        <Text style={styles.sectionEyebrow}>Quiz Masters</Text>
        <Text style={styles.headerTitle}>Choose a Game</Text>
        <Text style={styles.headerSubtitle}>
          Your uploaded file generated {questions.length} review item{questions.length === 1 ? '' : 's'}.
        </Text>
        <View style={styles.divider} />

        <View style={styles.modeGrid}>
          <Pressable style={styles.modeCard} onPress={() => openMode('matchingCards')}>
            <Text style={styles.modeIcon}>▣</Text>
            <Text style={styles.modeTitle}>Matching Card Game</Text>
            <Text style={styles.modeDescription}>Match terms with their correct definitions.</Text>
          </Pressable>

          <Pressable style={styles.modeCard} onPress={() => openMode('flashcards')}>
            <Text style={styles.modeIcon}>◫</Text>
            <Text style={styles.modeTitle}>Flashcard Game</Text>
            <Text style={styles.modeDescription}>Review questions and reveal answers one card at a time.</Text>
          </Pressable>

          <Pressable style={styles.modeCard} onPress={() => openMode('fillBlank')}>
            <Text style={styles.modeIcon}>＿</Text>
            <Text style={styles.modeTitle}>Fill-in-the-blank Game</Text>
            <Text style={styles.modeDescription}>Complete key sentences based on the lesson file.</Text>
          </Pressable>

          <Pressable style={styles.modeCard} onPress={() => openMode('trivia')}>
            <Text style={styles.modeIcon}>?</Text>
            <Text style={styles.modeTitle}>Trivia Game</Text>
            <Text style={styles.modeDescription}>Answer multiple-choice questions from the uploaded file.</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const handleMatchingCardPress = (card: MatchingCard) => {
    if (card.matched) return;

    if (!selectedCardId) {
      setSelectedCardId(card.id);
      setMatchingMessage('Select the matching card.');
      return;
    }

    if (selectedCardId === card.id) {
      setSelectedCardId(null);
      setMatchingMessage('');
      return;
    }

    const selectedCard = matchingCards.find((item) => item.id === selectedCardId);
    if (!selectedCard) return;

    setMatchingMoves((prev) => prev + 1);

    const isCorrectPair =
      selectedCard.pairId === card.pairId && selectedCard.type !== card.type;

    if (isCorrectPair) {
      setMatchingCards((prev) =>
        prev.map((item) =>
          item.pairId === card.pairId ? { ...item, matched: true } : item
        )
      );
      setSelectedCardId(null);
      setMatchingMessage('Correct match.');
      return;
    }

    setSelectedCardId(null);
    setMatchingMessage('Not a match. Try again.');
  };

  const renderMatchingCardGame = () => (
    <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
      {renderBackButton(goToMenu)}
      <View style={styles.contentCard}>
        <Text style={styles.sectionEyebrow}>Terms and Definitions</Text>
        <Text style={styles.headerTitle}>Matching Card Game</Text>
        <Text style={styles.headerSubtitle}>Tap one term card and one definition card to make a match.</Text>
        <View style={styles.divider} />

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>Matches: {matchedPairs}/{totalMatchingPairs}</Text>
          <Text style={styles.progressScore}>Moves: {matchingMoves}</Text>
        </View>

        {matchingMessage ? <Text style={styles.feedbackText}>{matchingMessage}</Text> : null}

        <View style={styles.cardGrid}>
          {matchingCards.map((card) => {
            const isSelected = selectedCardId === card.id;
            return (
              <Pressable
                key={card.id}
                style={[
                  styles.matchCard,
                  card.type === 'term' ? styles.termCard : styles.definitionCard,
                  isSelected && styles.selectedCard,
                  card.matched && styles.matchedCard,
                ]}
                onPress={() => handleMatchingCardPress(card)}
              >
                <Text style={styles.matchCardLabel}>
                  {card.type === 'term' ? 'TERM' : 'DEFINITION'}
                </Text>
                <Text style={styles.matchCardText}>{card.text}</Text>
              </Pressable>
            );
          })}
        </View>

        {isMatchingComplete ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>All terms matched.</Text>
            <Text style={styles.resultSubtext}>Completed in {matchingMoves} move{matchingMoves === 1 ? '' : 's'}.</Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={resetMatchingCards}>
            <Text style={styles.secondaryButtonText}>Restart</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonSmall} onPress={goToMenu}>
            <Text style={styles.primaryButtonText}>Menu</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderFlashcardGame = () => {
    if (!currentFlashcard) return renderMissingGame();

    return (
      <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
        {renderBackButton(goToMenu)}
        <View style={styles.contentCard}>
          <Text style={styles.sectionEyebrow}>Review Questions</Text>
          <Text style={styles.headerTitle}>Flashcard Game</Text>
          <Text style={styles.headerSubtitle}>Read the review question, then reveal the answer.</Text>
          <View style={styles.divider} />

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Card {flashcardIndex + 1} of {questions.length}</Text>
          </View>

          <View style={styles.flashcard}>
            <Text style={styles.flashcardLabel}>Review Question</Text>
            <Text style={styles.flashcardQuestion}>{currentFlashcard.question}</Text>

            {isFlashcardAnswerVisible ? (
              <View style={styles.answerRevealBox}>
                <Text style={styles.flashcardLabel}>Answer</Text>
                <Text style={styles.flashcardAnswer}>{currentFlashcard.answer}</Text>
                {currentFlashcard.explanation ? (
                  <Text style={styles.flashcardExplanation}>{currentFlashcard.explanation}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.footerArea}>
            {!isFlashcardAnswerVisible ? (
              <Pressable style={styles.primaryButton} onPress={() => setIsFlashcardAnswerVisible(true)}>
                <Text style={styles.primaryButtonText}>Show Answer</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  if (flashcardIndex + 1 >= questions.length) {
                    goToMenu();
                    return;
                  }

                  setFlashcardIndex((prev) => prev + 1);
                  setIsFlashcardAnswerVisible(false);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {flashcardIndex + 1 >= questions.length ? 'Back to Menu' : 'Next Card'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  const checkFillAnswer = () => {
    if (!currentFillItem || fillChecked) return;

    const isCorrect = normalizeText(fillAnswer) === normalizeText(currentFillItem.answer);
    if (isCorrect) {
      setFillScore((prev) => prev + 1);
    }

    setFillChecked(true);
  };

  const nextFillBlank = () => {
    if (!fillChecked) return;

    if (fillIndex + 1 >= fillBlankItems.length) {
      setFillFinished(true);
      return;
    }

    setFillIndex((prev) => prev + 1);
    setFillAnswer('');
    setFillChecked(false);
  };

  const renderFillBlankGame = () => {
    if (!currentFillItem) return renderMissingGame();

    const isCorrect = normalizeText(fillAnswer) === normalizeText(currentFillItem.answer);

    return (
      <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
        {renderBackButton(goToMenu)}
        <View style={styles.contentCard}>
          <Text style={styles.sectionEyebrow}>Key Sentences</Text>
          <Text style={styles.headerTitle}>Fill-in-the-blank Game</Text>
          <Text style={styles.headerSubtitle}>Type the missing answer based on the lesson sentence.</Text>
          <View style={styles.divider} />

          {!fillFinished ? (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>Item {fillIndex + 1} of {fillBlankItems.length}</Text>
                <Text style={styles.progressScore}>Score: {fillScore}</Text>
              </View>

              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{currentFillItem.prompt}</Text>
              </View>

              <TextInput
                style={[
                  styles.textInput,
                  fillChecked && (isCorrect ? styles.correctInput : styles.wrongInput),
                ]}
                value={fillAnswer}
                onChangeText={setFillAnswer}
                placeholder="Type your answer here"
                editable={!fillChecked}
                autoCapitalize="none"
              />

              {fillChecked ? (
                <View style={styles.explanationCard}>
                  <Text style={styles.explanationTitle}>
                    {isCorrect ? 'Correct' : 'Correct Answer'}
                  </Text>
                  <Text style={styles.explanationText}>{currentFillItem.answer}</Text>
                </View>
              ) : null}

              <View style={styles.footerArea}>
                {!fillChecked ? (
                  <Pressable
                    style={[styles.primaryButton, !fillAnswer.trim() && styles.disabledButton]}
                    onPress={checkFillAnswer}
                    disabled={!fillAnswer.trim()}
                  >
                    <Text style={styles.primaryButtonText}>Check Answer</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.primaryButton} onPress={nextFillBlank}>
                    <Text style={styles.primaryButtonText}>
                      {fillIndex + 1 >= fillBlankItems.length ? 'Finish' : 'Next Item'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <View style={styles.resultWrapper}>
              <View style={styles.resultCard}>
                <Text style={styles.resultText}>
                  You scored {fillScore} out of {fillBlankItems.length}
                </Text>
                <Text style={styles.resultSubtext}>Fill-in-the-blank game completed.</Text>
              </View>

              <Pressable style={styles.primaryButton} onPress={resetFillBlank}>
                <Text style={styles.primaryButtonText}>Play Again</Text>
              </Pressable>

              <Pressable style={styles.secondaryButtonFull} onPress={goToMenu}>
                <Text style={styles.secondaryButtonText}>Back to Menu</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleTriviaSelect = (option: string) => {
    if (triviaSelected || !currentTrivia) return;

    setTriviaSelected(option);
    if (option === currentTrivia.answer) {
      setTriviaScore((prev) => prev + 1);
    }
  };

  const nextTrivia = () => {
    if (!triviaSelected) return;

    if (triviaIndex + 1 >= questions.length) {
      setTriviaFinished(true);
      return;
    }

    setTriviaIndex((prev) => prev + 1);
    setTriviaSelected(null);
  };

  const getTriviaOptionStyle = (option: string) => {
    if (!currentTrivia) return styles.optionButton;

    const isCorrect = option === currentTrivia.answer;
    const isSelected = option === triviaSelected;

    if (!triviaSelected) return styles.optionButton;
    if (isCorrect) return [styles.optionButton, styles.correctOption];
    if (isSelected && !isCorrect) return [styles.optionButton, styles.wrongOption];
    return [styles.optionButton, styles.disabledOption];
  };

  const getTriviaOptionTextStyle = (option: string) => {
    if (!currentTrivia) return styles.optionText;

    const isCorrect = option === currentTrivia.answer;
    const isSelected = option === triviaSelected;

    if (!triviaSelected) return styles.optionText;
    if (isCorrect) return [styles.optionText, styles.correctOptionText];
    if (isSelected && !isCorrect) return [styles.optionText, styles.wrongOptionText];
    return styles.optionText;
  };

  const renderTriviaGame = () => {
    if (!currentTrivia) return renderMissingGame();

    return (
      <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
        {renderBackButton(goToMenu)}
        <View style={styles.contentCard}>
          <Text style={styles.sectionEyebrow}>Multiple Choice</Text>
          <Text style={styles.headerTitle}>Trivia Game</Text>
          <Text style={styles.headerSubtitle}>Choose the correct answer from the options.</Text>
          <View style={styles.divider} />

          {!triviaFinished ? (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>Question {triviaIndex + 1} of {questions.length}</Text>
                <Text style={styles.progressScore}>Score: {triviaScore}</Text>
              </View>

              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{currentTrivia.question}</Text>
              </View>

              <View style={styles.optionsWrapper}>
                {currentTrivia.options.map((option) => (
                  <Pressable
                    key={option}
                    style={getTriviaOptionStyle(option)}
                    onPress={() => handleTriviaSelect(option)}
                  >
                    <Text style={getTriviaOptionTextStyle(option)}>{option}</Text>
                  </Pressable>
                ))}
              </View>

              {triviaSelected && currentTrivia.explanation ? (
                <View style={styles.explanationCard}>
                  <Text style={styles.explanationTitle}>Explanation</Text>
                  <Text style={styles.explanationText}>{currentTrivia.explanation}</Text>
                </View>
              ) : null}

              <View style={styles.footerArea}>
                <Pressable
                  style={[styles.primaryButton, !triviaSelected && styles.disabledButton]}
                  onPress={nextTrivia}
                  disabled={!triviaSelected}
                >
                  <Text style={styles.primaryButtonText}>
                    {triviaIndex + 1 >= questions.length ? 'Finish Trivia' : 'Next Question'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.resultWrapper}>
              <View style={styles.resultCard}>
                <Text style={styles.resultText}>You scored {triviaScore} out of {questions.length}</Text>
                <Text style={styles.resultSubtext}>
                  {triviaScore >= Math.ceil(questions.length * 0.8)
                    ? 'Excellent work.'
                    : triviaScore >= Math.ceil(questions.length * 0.5)
                      ? 'Good job. Keep practicing.'
                      : 'Nice try. Review the lesson and play again.'}
                </Text>
              </View>

              <Pressable style={styles.primaryButton} onPress={resetTrivia}>
                <Text style={styles.primaryButtonText}>Play Again</Text>
              </Pressable>

              <Pressable style={styles.secondaryButtonFull} onPress={goToMenu}>
                <Text style={styles.secondaryButtonText}>Back to Menu</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (!hasGeneratedGame) return renderMissingGame();

    if (mode === 'matchingCards') return renderMatchingCardGame();
    if (mode === 'flashcards') return renderFlashcardGame();
    if (mode === 'fillBlank') return renderFillBlankGame();
    if (mode === 'trivia') return renderTriviaGame();

    return renderMenu();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F6FB" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: height,
            paddingHorizontal: width < 400 ? 12 : 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  gameScreen: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  backButtonInline: {
    position: 'absolute',
    top: 20,
    left: 0,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C1A2A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    zIndex: 10,
  },
  backIcon: {
    fontSize: 40,
    color: '#122033',
    fontWeight: '800',
    marginTop: -10,
  },
  contentCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0C1A2A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sectionEyebrow: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#122033',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#5A6B7F',
    textAlign: 'center',
    lineHeight: 23,
  },
  divider: {
    height: 1,
    backgroundColor: '#E4EAF2',
    marginVertical: 22,
  },
  modeGrid: {
    gap: 14,
  },
  modeCard: {
    backgroundColor: '#F7FAFE',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E3EAF5',
  },
  modeIcon: {
    fontSize: 28,
    color: '#D32F2F',
    fontWeight: '900',
    marginBottom: 8,
  },
  modeTitle: {
    color: '#122033',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  modeDescription: {
    color: '#5A6B7F',
    fontSize: 14,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    color: '#66778D',
    fontWeight: '700',
  },
  progressScore: {
    color: '#D32F2F',
    fontWeight: '900',
  },
  feedbackText: {
    color: '#5A6B7F',
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  matchCard: {
    width: '48%',
    minHeight: 126,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
  },
  termCard: {
    backgroundColor: '#FFF7F7',
    borderColor: '#F2C5C5',
  },
  definitionCard: {
    backgroundColor: '#F7FAFE',
    borderColor: '#DDE7F2',
  },
  selectedCard: {
    borderColor: '#D32F2F',
    borderWidth: 2,
  },
  matchedCard: {
    backgroundColor: '#E8F7EF',
    borderColor: '#2EAD66',
    opacity: 0.85,
  },
  matchCardLabel: {
    fontSize: 10,
    color: '#D32F2F',
    fontWeight: '900',
    marginBottom: 6,
  },
  matchCardText: {
    fontSize: 14,
    color: '#1C2B3C',
    fontWeight: '800',
    lineHeight: 20,
  },
  flashcard: {
    backgroundColor: '#F7FAFE',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E3EAF5',
    minHeight: 260,
    justifyContent: 'center',
  },
  flashcardLabel: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  flashcardQuestion: {
    fontSize: 22,
    color: '#122033',
    fontWeight: '900',
    lineHeight: 31,
    textAlign: 'center',
  },
  answerRevealBox: {
    marginTop: 22,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#D8E0EA',
  },
  flashcardAnswer: {
    fontSize: 24,
    color: '#15824A',
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  flashcardExplanation: {
    marginTop: 10,
    color: '#5A6B7F',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  questionCard: {
    backgroundColor: '#F7FAFE',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E3EAF5',
    marginBottom: 18,
  },
  questionText: {
    fontSize: 20,
    color: '#1C2B3C',
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
  },
  textInput: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#122033',
    fontWeight: '700',
  },
  correctInput: {
    borderColor: '#2EAD66',
    backgroundColor: '#E8F7EF',
  },
  wrongInput: {
    borderColor: '#D32F2F',
    backgroundColor: '#FDECEC',
  },
  optionsWrapper: {
    gap: 12,
  },
  optionButton: {
    minHeight: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  disabledOption: {
    opacity: 0.75,
  },
  correctOption: {
    backgroundColor: '#E8F7EF',
    borderColor: '#2EAD66',
  },
  wrongOption: {
    backgroundColor: '#FDECEC',
    borderColor: '#D32F2F',
  },
  optionText: {
    fontSize: 16,
    color: '#223246',
    fontWeight: '700',
  },
  correctOptionText: {
    color: '#15824A',
  },
  wrongOptionText: {
    color: '#C62828',
  },
  explanationCard: {
    marginTop: 16,
    backgroundColor: '#FFF8E6',
    borderColor: '#F0D184',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  explanationTitle: {
    color: '#7A5400',
    fontWeight: '900',
    marginBottom: 4,
  },
  explanationText: {
    color: '#7A5400',
    lineHeight: 21,
  },
  footerArea: {
    marginTop: 22,
  },
  primaryButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonSmall: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonFull: {
    width: '100%',
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#1C2B3C',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resultWrapper: {
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#F7FAFE',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E3EAF5',
    alignItems: 'center',
    marginTop: 16,
  },
  resultText: {
    fontSize: 24,
    color: '#122033',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 16,
    color: '#5A6B7F',
    textAlign: 'center',
    lineHeight: 22,
  },
});
