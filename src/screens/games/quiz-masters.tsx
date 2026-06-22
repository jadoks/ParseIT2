import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

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

const LARGE_SCREEN_CONTENT_WIDTH_PERCENT = '65%'; 

export default function QuizMasters({ onBack, generatedQuestions, gameType = 'quiz_master', onComplete }: Props) {
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

  // Fill Blank State
  const [fillIndex, setFillIndex] = useState(0);
  const [fillAnswer, setFillAnswer] = useState('');
  const [fillScore, setFillScore] = useState(0);
  const [fillChecked, setFillChecked] = useState(false);
  const [fillIsCorrect, setFillIsCorrect] = useState(false);

  // Trivia State
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaSelected, setTriviaSelected] = useState<string | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);

  const hasGeneratedGame = questions.length > 0 || matchingItems.length > 0 || fillBlankItems.length > 0 || flashcardItems.length > 0;

  // Normalize current flashcard to always have 'question' and 'answer' properties
  const currentFlashcardRaw = flashcardItems.length > 0 ? flashcardItems[flashcardIndex] : questions[flashcardIndex];
  const currentFlashcard = currentFlashcardRaw ? {
    question: currentFlashcardRaw.front || currentFlashcardRaw.question,
    answer: currentFlashcardRaw.back || currentFlashcardRaw.answer,
    explanation: currentFlashcardRaw.explanation || '',
  } : null;
  
  const currentFillItem = fillBlankItems[fillIndex];
  const currentTrivia = questions[triviaIndex];

  // Automatically select the correct game mode based on backend gameType or fallback
  useEffect(() => {
    resetAll();
    
    if (gameType === 'memory_match' && matchingItems.length > 0) setMode('matchingCards');
    else if (gameType === 'fill_in_blanks' && fillBlankItems.length > 0) setMode('fillBlank');
    else if (gameType === 'flashcard' && (flashcardItems.length > 0 || questions.length > 0)) setMode('flashcards');
    else if (gameType === 'quiz_master' && questions.length > 0) setMode('trivia');
    else if (matchingItems.length > 0) setMode('matchingCards');
    else if (fillBlankItems.length > 0) setMode('fillBlank');
    else if (flashcardItems.length > 0 || questions.length > 0) setMode('flashcards');
    else if (questions.length > 0) setMode('trivia');
    else setMode('menu');

  }, [generatedQuestions]);

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
  };

  const resetFlashcards = () => {
    setFlashcardIndex(0);
    setIsFlashcardAnswerVisible(false);
    setFlashcardInput('');
    setFlashcardChecked(false);
    setFlashcardIsCorrect(null);
  };

  const resetFillBlank = () => {
    setFillIndex(0);
    setFillAnswer('');
    setFillScore(0);
    setFillChecked(false);
    setFillIsCorrect(false);
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

  const goToGameScreen = () => {
    resetAll();

    if (onComplete) {
        let score = 0;
        let total = 0;

        switch (mode) {
            case 'trivia':
                score = triviaScore;
                total = questions.length;
                break;

            case 'fillBlank':
                score = fillScore;
                total = fillBlankItems.length;
                break;

            case 'matchingCards':
                score = matchingScore;
                total = terms.length;
                break;

            case 'flashcards':
                score = userAnswers.filter(a => a.isCorrect).length;
                total = flashcardItems.length > 0
                    ? flashcardItems.length
                    : questions.length;
                break;
        }

        onComplete(score, total, userAnswers);
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

  const handleTermPress = (termId: string) => {
    setSelectedTermId(termId);
  };

  const handleDefinitionPress = (defId: string) => {
    if (!selectedTermId) return;
    setUserChoices(prev => ({ ...prev, [selectedTermId]: defId }));
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

  const handleFlashcardCheck = () => {
    if (!currentFlashcard) return;
    const isCorrect = normalizeText(flashcardInput) === normalizeText(currentFlashcard.answer);
    setFlashcardIsCorrect(isCorrect);
    setFlashcardChecked(true);
    recordAnswer(currentFlashcard.question, flashcardInput, currentFlashcard.answer, currentFlashcard.explanation, isCorrect);

    if (isCorrect) {
      setTimeout(() => setIsFlashcardAnswerVisible(true), 600);
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
    }
  };

  const checkFillAnswer = () => {
    if (!currentFillItem || fillChecked) return;
    const isCorrect = normalizeText(fillAnswer) === normalizeText(currentFillItem.answer);
    setFillIsCorrect(isCorrect);
    setFillChecked(true);
    if (isCorrect) setFillScore((prev) => prev + 1);
    recordAnswer(currentFillItem.question, fillAnswer, currentFillItem.answer, currentFillItem.explanation, isCorrect);
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
            onPress={() => {
              if (onComplete) onComplete(matchingScore, total, userAnswers);
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

    const isSubmitDisabled = Object.keys(userChoices).length < terms.length;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Paired: {Object.keys(userChoices).length}/{terms.length}</Text>
        </View>

        <Text style={styles.memoryMatchInstructions}>
          Tap a term, then tap its matching definition letter.
        </Text>

        <View style={styles.memoryMatchContainer}>
          <View style={styles.memoryColumn}>
            <Text style={styles.memoryColumnHeader}>Column A (Terms)</Text>
            {terms.map((card) => {
              const pairedDefId = userChoices[card.id];
              const pairedDefIndex = definitions.findIndex(d => d.id === pairedDefId);
              const pairedDef = pairedDefIndex >= 0 ? definitions[pairedDefIndex] : null;
              const selectedLetter = pairedDefIndex >= 0 ? String.fromCharCode(65 + pairedDefIndex) : '';
              const isSelected = selectedTermId === card.id;
              return (
                <Pressable
                  key={card.id}
                  style={[
                    styles.memoryCard,
                    isSelected && styles.memoryCardSelected,
                    pairedDef && styles.memoryCardMatched,
                  ]}
                  onPress={() => handleTermPress(card.id)}
                >
                  <View style={styles.memoryCardRow}>
                    <Text style={styles.memoryCardText}>{card.text}</Text>
                    {selectedLetter !== '' && (
                      <Text style={styles.memoryCardSelectedLetter}>
                        ({selectedLetter})
                      </Text>
                    )}
                  </View>
                  {pairedDef && (
                    <Text style={styles.memoryCardSubtext} numberOfLines={1}>
                      → {pairedDef.text}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.memoryColumn}>
            <Text style={styles.memoryColumnHeader}>Column B (Definitions)</Text>
            {definitions.map((card, index) => {
              const letter = String.fromCharCode(65 + index);
              const pairedTermId = Object.keys(userChoices).find(k => userChoices[k] === card.id);
              const pairedTerm = terms.find(t => t.id === pairedTermId);
              const isPaired = !!pairedTerm;
              
              return (
                <Pressable
                  key={card.id}
                  style={[
                    styles.memoryCard,
                    isPaired && styles.memoryCardMatched,
                  ]}
                  onPress={() => handleDefinitionPress(card.id)}
                >
                  <Text style={styles.memoryCardLetter}>{letter}</Text>
                  <Text style={styles.memoryCardText}>{card.text}</Text>
                  {isPaired && (
                    <Text style={styles.memoryCardSubtext} numberOfLines={1}>
                      ← {pairedTerm?.text}
                    </Text>
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

  const renderFlashcardGame = () => {
    if (!currentFlashcard) return null;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Card {flashcardIndex + 1} of {flashcardItems.length > 0 ? flashcardItems.length : questions.length}</Text>
        </View>

        <View style={styles.flashcardContainer}>
          {!isFlashcardAnswerVisible ? (
            <View style={styles.flashcardFront}>
              <Ionicons name="help-circle-outline" size={40} color="#D32F2F" />
              <Text style={styles.flashcardQuestion}>{currentFlashcard.question}</Text>
            </View>
          ) : (
            <View style={styles.flashcardBack}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#4CAF50" />
              <Text style={styles.flashcardAnswerText}>{currentFlashcard.answer}</Text>
              {currentFlashcard.explanation ? (
                <Text style={styles.flashcardExplanation}>{currentFlashcard.explanation}</Text>
              ) : null}
            </View>
          )}
        </View>

        {!flashcardChecked ? (
          <View style={styles.flashcardInputContainer}>
            <TextInput
              style={styles.flashcardInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#999"
              value={flashcardInput}
              onChangeText={setFlashcardInput}
              multiline
            />
            <Pressable
              style={[styles.nextButton, !flashcardInput.trim() && styles.nextButtonDisabled]}
              onPress={handleFlashcardCheck}
              disabled={!flashcardInput.trim()}
            >
              <Text style={styles.nextButtonText}>Check Answer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.feedbackCard, flashcardIsCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={[styles.feedbackText, { color: flashcardIsCorrect ? '#2E7D32' : '#C62828' }]}>
              {flashcardIsCorrect ? 'Correct! 🎉' : 'Incorrect ❌'}
            </Text>
            {!flashcardIsCorrect && !isFlashcardAnswerVisible && (
              <Pressable style={styles.nextButton} onPress={() => setIsFlashcardAnswerVisible(true)}>
                <Text style={styles.nextButtonText}>Tap to See Answer</Text>
              </Pressable>
            )}
            {(flashcardIsCorrect || isFlashcardAnswerVisible) && (
              <Pressable style={styles.nextButton} onPress={handleNextFlashcard}>
                <Text style={styles.nextButtonText}>
                  {flashcardIndex + 1 >= (flashcardItems.length > 0 ? flashcardItems.length : questions.length) ? 'Finish Practice' : 'Next Card'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
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

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentFillItem.prompt}</Text>
        </View>

        <TextInput
          style={[
            styles.flashcardInput,
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
          <View style={[styles.feedbackCard, fillIsCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={[styles.feedbackText, { color: fillIsCorrect ? '#2E7D32' : '#C62828' }]}>
              {fillIsCorrect ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌'}
            </Text>
            {!fillIsCorrect && <Text style={styles.feedbackSubtext}>Correct answer: {currentFillItem.answer}</Text>}
            {currentFillItem.explanation && <Text style={styles.feedbackSubtext}>{currentFillItem.explanation}</Text>}
            <Pressable style={styles.nextButton} onPress={nextFillBlank}>
              <Text style={styles.nextButtonText}>
                {fillIndex + 1 >= fillBlankItems.length ? 'Finish Practice' : 'Next Item'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.nextButton, !fillAnswer.trim() && styles.nextButtonDisabled]}
            onPress={checkFillAnswer}
            disabled={!fillAnswer.trim()}
          >
            <Text style={styles.nextButtonText}>Check Answer</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderTriviaGame = () => {
    if (!currentTrivia) return null;

    return (
      <View style={styles.gameContainer}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Question {triviaIndex + 1} of {questions.length}</Text>
          <Text style={styles.scoreText}>Score: {triviaScore}</Text>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentTrivia.question}</Text>
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

        {triviaSelected && (
          <View style={[styles.feedbackCard, triviaSelected === currentTrivia.answer ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={[styles.feedbackText, { color: triviaSelected === currentTrivia.answer ? '#2E7D32' : '#C62828' }]}>
              {triviaSelected === currentTrivia.answer ? 'Correct! 🎉 (+1 pt)' : 'Incorrect ❌'}
            </Text>
            {currentTrivia.explanation && <Text style={styles.feedbackSubtext}>{currentTrivia.explanation}</Text>}
            <Pressable style={styles.nextButton} onPress={nextTrivia}>
              <Text style={styles.nextButtonText}>
                {triviaIndex + 1 >= questions.length ? 'Finish Practice' : 'Next Question'}
              </Text>
            </Pressable>
          </View>
        )}
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
                onPress={onBack}
            >
            <Text style={styles.cancelBtnText}>Play Again</Text>
          </Pressable>
          <Pressable
            style={styles.saveBtn}
            onPress={() => {
              if (onComplete) onComplete(correctCount, total, userAnswers);
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
            <Text style={styles.subtitle}>Please upload a lesson file first to generate practice questions.</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D32F2F',
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
  topBarTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  contentWrapSmall: { width: '100%' },
  contentWrapLarge: { maxWidth: 900, minWidth: 480, alignSelf: 'center' },
  gameContainer: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressText: { fontSize: 16, fontWeight: '700', color: '#555' },
  scoreText: { fontSize: 16, fontWeight: '700', color: '#D32F2F' },
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
  questionText: { fontSize: 18, fontWeight: '700', color: '#222', lineHeight: 26 },
  optionsContainer: { gap: 12 },
  optionButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { fontSize: 15, fontWeight: '600' },
  feedbackCard: { marginTop: 24, padding: 20, borderRadius: 16, alignItems: 'center' },
  feedbackCorrect: { backgroundColor: '#E8F5E9' },
  feedbackWrong: { backgroundColor: '#FFEBEE' },
  feedbackText: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  feedbackSubtext: { fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
  feedbackMessage: { textAlign: 'center', color: '#2196F3', fontWeight: '700', marginTop: 12, marginBottom: 12 },
  nextButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonDisabled: { backgroundColor: '#CCC' },
  nextButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  flashcardContainer: {
    height: 250,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 24,
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
  flashcardQuestion: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center', marginTop: 16 },
  flashcardAnswerText: { fontSize: 22, fontWeight: '800', color: '#2E7D32', textAlign: 'center', marginTop: 16 },
  flashcardExplanation: { marginTop: 10, color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  flashcardInputContainer: { gap: 12 },
  flashcardInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  memoryMatchInstructions: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  memoryMatchContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 10 },
  memoryColumn: { flex: 1, paddingHorizontal: 10 },
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
  memoryCardSelected: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  memoryCardMatched: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', opacity: 0.85 },
  memoryCardText: { color: '#222', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  memoryCardSubtext: { fontSize: 12, color: '#4CAF50', marginTop: 4, fontWeight: '600' },
  memoryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  memoryCardSelectedLetter: {
    marginLeft: 8,
    color: '#D32F2F',
    fontWeight: '900',
    fontSize: 14,
  },
  memoryCardLetter: {
    fontWeight: '900',
    color: '#D32F2F',
    marginBottom: 4,
    fontSize: 16,
  },
  summaryHeader: { alignItems: 'center', marginBottom: 24, padding: 20 },
  summaryTitle: { fontSize: 24, fontWeight: '800', color: '#222', marginTop: 12 },
  summaryScore: { fontSize: 28, fontWeight: '900', color: '#D32F2F', marginTop: 8 },
  summaryPercentage: { fontSize: 18, fontWeight: '700', color: '#555', marginTop: 4 },
  summarySubtext: { fontSize: 14, color: '#777', marginTop: 8, textAlign: 'center' },
  reviewTitle: { fontSize: 18, fontWeight: '800', color: '#222', marginBottom: 12, paddingHorizontal: 16 },
  reviewList: { paddingHorizontal: 16, marginBottom: 16 },
  reviewItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
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
  reviewQuestionText: { fontSize: 14, fontWeight: '700', color: '#222', flex: 1 },
  reviewAnswers: { marginLeft: 28 },
  reviewUserAnswer: { fontSize: 13, color: '#555', marginBottom: 4 },
  reviewCorrectAnswer: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  reviewExplanation: { fontSize: 13, color: '#2196F3', marginTop: 4, fontStyle: 'italic' },
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
  cancelBtnText: { color: '#444', fontWeight: '700', fontSize: 14 },
  saveBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#D32F2F',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  headerSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  eyebrow: { color: '#D32F2F', fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#222', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
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
  modeTitle: { color: '#122033', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modeDescription: { color: '#5A6B7F', fontSize: 14, lineHeight: 20 },
});