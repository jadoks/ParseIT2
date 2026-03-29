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
          <TouchableOpacity style={styles.backMaterial} onPress={onBack}>
            
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
          <TouchableOpacity style={styles.backMaterial} onPress={onBack}>
            
            <Text style={styles.backText}>Back</Text>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <Text style={styles.bodyText}>{activity.instructions}</Text>
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
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Short Response</Text>

          <TextInput
            value={shortAnswer}
            onChangeText={setShortAnswer}
            placeholder="Write your answer..."
            multiline
            style={styles.textInput}
          />
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

  
  backMaterial: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },


  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
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
    marginBottom: 16,
  },

  courseText: {
    color: '#777',
    fontSize: 13,
  },

  topicText: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 6,
  },

  assignmentText: {
    color: '#444',
    fontSize: 14,
  },

  scoreText: {
    color: '#D32F2F',
    fontWeight: '700',
    marginTop: 8,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },

  bodyText: {
    color: '#555',
    fontSize: 14,
  },

  questionText: {
    marginBottom: 12,
  },

  option: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
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
    fontSize: 14,
  },

  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    minHeight: 100,
    padding: 12,
  },

  submitBtn: {
    backgroundColor: '#D32F2F',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  completedBtn: {
    backgroundColor: '#2E7D32',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  submitText: {
    color: '#FFF',
    fontWeight: '700',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    marginBottom: 12,
  },
});