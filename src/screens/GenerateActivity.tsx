import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export interface GenerateActivityData {
  courseId: string;
  courseName: string;
  courseCode: string;
  assignmentId: string;
  assignmentTitle: string;
  topic: string;
  score?: number | null;
  recommendationType: 'review' | 'practice' | 'advanced';
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string;
  basedOnMaterials: string[];
}

interface GenerateActivityProps {
  activity: GenerateActivityData | null;
  onBack?: () => void;
}

const GenerateActivity = ({ activity, onBack }: GenerateActivityProps) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shortAnswer, setShortAnswer] = useState('');
  const [completed, setCompleted] = useState(false);

  const quiz = useMemo(() => {
    if (!activity) return null;

    return {
      question: `Which statement best describes "${activity.topic}"?`,
      options: [
        `It is a core concept related to ${activity.courseName}.`,
        'It is only used for graphic design.',
        'It has no connection to the assignment.',
        'It is unrelated to programming or computing.',
      ],
      correctIndex: 0,
    };
  }, [activity]);

  const handleCheckAnswer = () => {
    setShowAnswer(true);
    setCompleted(true);
  };

  if (!activity) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No generated activity found.</Text>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.wrapper}>
        {onBack && (
          <TouchableOpacity style={styles.backTopBtn} onPress={onBack}>
            <Text style={styles.backTopText}>Back</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.pageTitle, { fontSize: isMobile ? 24 : 28 }]}>
          Generated Follow-up Activity
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.courseText}>
            {activity.courseName} • {activity.courseCode}
          </Text>
          <Text style={styles.topicText}>{activity.topic}</Text>
          <Text style={styles.assignmentText}>{activity.assignmentTitle}</Text>

          {activity.score !== null && activity.score !== undefined && (
            <Text style={styles.scoreText}>Previous Score: {activity.score}%</Text>
          )}

          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.badgeText}>{activity.recommendationType.toUpperCase()}</Text>
            </View>
            <View style={styles.diffBadge}>
              <Text style={styles.badgeText}>{activity.difficulty.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <Text style={styles.bodyText}>{activity.instructions}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Concept Review</Text>
          <Text style={styles.bodyText}>
            {activity.topic} is one of the key areas connected to your recent performance. This
            activity is meant to strengthen your understanding and help you improve in future
            assignments.
          </Text>
        </View>

        {quiz && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Check</Text>
            <Text style={styles.questionText}>{quiz.question}</Text>

            {quiz.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrect = showAnswer && index === quiz.correctIndex;
              const isWrong = showAnswer && isSelected && index !== quiz.correctIndex;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                    isCorrect && styles.optionCorrect,
                    isWrong && styles.optionWrong,
                  ]}
                  disabled={showAnswer}
                  onPress={() => setSelectedOption(index)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              );
            })}

            {showAnswer && (
              <Text style={styles.feedbackText}>
                {selectedOption === quiz.correctIndex
                  ? '✅ Correct! Nice work.'
                  : '❌ Not quite. Review the concept and try again.'}
              </Text>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Short Response</Text>
          <Text style={styles.bodyText}>
            Explain in your own words what "{activity.topic}" means and how it connects to this
            course.
          </Text>

          <TextInput
            value={shortAnswer}
            onChangeText={setShortAnswer}
            placeholder="Write your answer here..."
            placeholderTextColor="#999"
            multiline
            style={styles.textInput}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Based on Materials</Text>
          {activity.basedOnMaterials.length > 0 ? (
            activity.basedOnMaterials.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.materialItem}>
                • {item}
              </Text>
            ))
          ) : (
            <Text style={styles.bodyText}>No linked materials found.</Text>
          )}
        </View>

        {!completed ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleCheckAnswer}>
            <Text style={styles.submitText}>Check Answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBtn}>
            <Text style={styles.submitText}>Activity Completed 🎉</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default GenerateActivity;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  wrapper: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  backTopBtn: {
    marginBottom: 14,
    backgroundColor: 'rgba(211, 47, 47, 0.07)',
    width: 70,
    height: 25,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backTopText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 15,
  },
  pageTitle: {
    fontWeight: '800',
    color: '#111',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 16,
  },
  courseText: {
    color: '#777',
    fontSize: 13,
    marginBottom: 6,
  },
  topicText: {
    color: '#111',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  assignmentText: {
    color: '#444',
    fontSize: 14,
    marginBottom: 8,
  },
  scoreText: {
    color: '#D32F2F',
    fontWeight: '700',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    backgroundColor: '#D32F2F',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  diffBadge: {
    backgroundColor: '#555',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  bodyText: {
    color: '#555',
    fontSize: 14,
    lineHeight: 22,
  },
  questionText: {
    color: '#222',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  optionSelected: {
    borderColor: '#D32F2F',
  },
  optionCorrect: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  optionWrong: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  optionText: {
    color: '#222',
    fontSize: 14,
  },
  feedbackText: {
    marginTop: 8,
    fontWeight: '700',
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    minHeight: 110,
    padding: 12,
    marginTop: 12,
    textAlignVertical: 'top',
    color: '#111',
  },
  materialItem: {
    color: '#555',
    fontSize: 14,
    lineHeight: 22,
  },
  submitBtn: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completedBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backText: {
    color: '#D32F2F',
    fontWeight: '700',
  },
});