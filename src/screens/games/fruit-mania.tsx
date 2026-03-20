import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  onBack: () => void;
}

interface QuestionItem {
  question: string;
  options: number[];
  answer: number;
}

const QUESTIONS: QuestionItem[] = [
  { question: '🍎 3 + 🍎 2 = ?', options: [4, 5, 6], answer: 5 },
  { question: '🍌 7 - 🍌 4 = ?', options: [3, 2, 4], answer: 3 },
  { question: '🍇 2 x 🍇 3 = ?', options: [5, 6, 8], answer: 6 },
  { question: '🍓 8 ÷ 🍓 2 = ?', options: [6, 4, 3], answer: 4 },
  { question: '🍍 5 + 🍍 1 = ?', options: [7, 5, 6], answer: 6 },
];

export default function FruitMania({ onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;

  const progressText = useMemo(
    () => `${index + 1} / ${QUESTIONS.length}`,
    [index]
  );

  const handleSelect = (value: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(value);
    if (value === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    if (isLast) {
      setShowResult(true);
      return;
    }

    setIndex((prev) => prev + 1);
    setSelectedAnswer(null);
  };

  const handleRestart = () => {
    setIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Pressable style={styles.resetButton} onPress={handleRestart}>
          <Text style={styles.resetText}>Restart</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>FruitMania</Text>
      <Text style={styles.subtitle}>Solve the fruit math puzzles.</Text>

      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Question</Text>
          <Text style={styles.infoValue}>{progressText}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text style={styles.infoValue}>{score}</Text>
        </View>
      </View>

      {!showResult ? (
        <>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          <View style={styles.optionsWrap}>
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.answer;

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionSelected,
                    selectedAnswer !== null && isCorrect && styles.optionCorrect,
                    selectedAnswer === option &&
                      selectedAnswer !== currentQuestion.answer &&
                      styles.optionWrong,
                  ]}
                  onPress={() => handleSelect(option)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.nextButton,
              selectedAnswer === null && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.nextButtonText}>
              {isLast ? 'Finish' : 'Next'}
            </Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Great job!</Text>
          <Text style={styles.resultScore}>
            Your score: {score} / {QUESTIONS.length}
          </Text>

          <Pressable style={styles.playAgainButton} onPress={handleRestart}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF9F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    backgroundColor: '#EEE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backText: {
    fontWeight: '700',
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#222',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 6,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: '#777',
  },
  infoValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D32F2F',
    marginTop: 4,
  },
  questionCard: {
    backgroundColor: '#FFF',
    padding: 22,
    borderRadius: 18,
    marginBottom: 20,
    elevation: 2,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#222',
  },
  optionsWrap: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EEE',
  },
  optionSelected: {
    borderColor: '#D32F2F',
  },
  optionCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  optionWrong: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
  },
  optionText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#222',
  },
  nextButton: {
    marginTop: 20,
    backgroundColor: '#D32F2F',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#222',
    marginBottom: 10,
  },
  resultScore: {
    fontSize: 20,
    color: '#D32F2F',
    fontWeight: '700',
    marginBottom: 20,
  },
  playAgainButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  playAgainText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
});