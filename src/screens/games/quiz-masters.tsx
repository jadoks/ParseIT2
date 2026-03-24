import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  onBack: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

const QUIZ_DATA: QuizQuestion[] = [
  {
    question: 'What does HTML stand for?',
    options: [
      'Hyper Text Markup Language',
      'High Tech Modern Language',
      'Home Tool Markup Language',
    ],
    answer: 'Hyper Text Markup Language',
  },
  {
    question: 'Which language is mainly used for styling web pages?',
    options: ['Python', 'CSS', 'C++'],
    answer: 'CSS',
  },
  {
    question: 'Which company created React?',
    options: ['Google', 'Meta', 'Microsoft'],
    answer: 'Meta',
  },
  {
    question: 'Which symbol is commonly used for IDs in CSS?',
    options: ['#', '.', '&'],
    answer: '#',
  },
  {
    question: 'What does JS stand for?',
    options: ['JavaStyle', 'JavaScript', 'JustScript'],
    answer: 'JavaScript',
  },
];

export default function QuizMasters({ onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQuestion = QUIZ_DATA[currentIndex];
  const isLast = currentIndex === QUIZ_DATA.length - 1;

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);

    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (selected === null) return;

    if (isLast) {
      setFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelected(null);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
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

      <Text style={styles.title}>Quiz Masters</Text>
      <Text style={styles.subtitle}>Answer the trivia questions.</Text>

      {!finished ? (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.progressText}>
              Question {currentIndex + 1} of {QUIZ_DATA.length}
            </Text>
            <Text style={styles.scoreText}>Score: {score}</Text>
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          <View style={styles.optionList}>
            {currentQuestion.options.map((option) => {
              const isSelected = selected === option;
              const isCorrect = option === currentQuestion.answer;

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionSelected,
                    selected !== null && isCorrect && styles.optionCorrect,
                    selected === option &&
                      selected !== currentQuestion.answer &&
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
              selected === null && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={selected === null}
          >
            <Text style={styles.nextButtonText}>
              {isLast ? 'Finish Quiz' : 'Next Question'}
            </Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Quiz Complete!</Text>
          <Text style={styles.resultText}>
            You got {score} out of {QUIZ_DATA.length}
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
    backgroundColor: '#F7F9FF',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
  },
  questionCard: {
    backgroundColor: '#FFF',
    padding: 22,
    borderRadius: 18,
    marginBottom: 18,
    elevation: 2,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
  },
  optionList: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
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
    marginTop: 24,
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
  resultText: {
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