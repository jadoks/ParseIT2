import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

export type ActivityItemType =
  | 'multiple_choice'
  | 'true_false'
  | 'identification';

export interface GeneratedQuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedActivityItem {
  id?: string;
  type: ActivityItemType;
  question: string;
  options?: string[];
  correctIndex?: number;
  answer?: string | boolean;
  correctAnswer?: boolean;
  acceptableAnswers?: string[];
  explanation?: string;
  points?: number;
}

export interface MaterialExtractionStatus {
  id?: string;
  title?: string;
  fileName?: string | null;
  fileType?: string | null;
  status?: string;
}

export interface GenerateActivityData {
  id?: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  assignmentId: string;
  assignmentTitle: string;
  topic: string;
  score?: number | null;
  recommendationType: 'review' | 'practice' | 'advanced';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  learningObjectives?: string[];
  instructions: string;
  steps?: string[];
  basedOnMaterials: string[];
  materialExtractionStatus?: MaterialExtractionStatus[];
  quiz?: GeneratedQuizData | null;
  activityItems?: GeneratedActivityItem[];
  assessmentItems?: GeneratedActivityItem[];
  shortAnswerPrompt?: string;
  tutorTip?: string;
}

interface GenerateActivityProps {
  activity: GenerateActivityData | null;
  onBack?: () => void;
  currentStudentId?: string;
  apiBaseUrl?: string;
  onCompleted?: (activity: GenerateActivityData) => Promise<void> | void;
}

interface IdentificationEvaluation {
  isCorrect: boolean;
  confidence: number;
  feedback: string;
  method?: 'exact' | 'fuzzy' | 'ai' | 'unanswered' | 'error';
}

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const isValidQuiz = (
  quiz?: GeneratedQuizData | null
): quiz is GeneratedQuizData => {
  return (
    !!quiz &&
    typeof quiz.question === 'string' &&
    quiz.question.trim().length > 0 &&
    Array.isArray(quiz.options) &&
    quiz.options.length >= 4 &&
    typeof quiz.correctIndex === 'number' &&
    quiz.correctIndex >= 0 &&
    quiz.correctIndex < quiz.options.length
  );
};

const isValidActivityItem = (item?: GeneratedActivityItem | null) => {
  if (!item || typeof item.question !== 'string' || !item.question.trim()) {
    return false;
  }

  if (item.type === 'multiple_choice') {
    return (
      Array.isArray(item.options) &&
      item.options.length >= 2 &&
      typeof item.correctIndex === 'number' &&
      item.correctIndex >= 0 &&
      item.correctIndex < item.options.length
    );
  }

  if (item.type === 'true_false') {
    return typeof item.answer === 'boolean' || typeof item.correctAnswer === 'boolean';
  }

  if (item.type === 'identification') {
    return (
      typeof item.answer === 'string' ||
      (Array.isArray(item.acceptableAnswers) && item.acceptableAnswers.length > 0)
    );
  }

  return false;
};

const getCorrectAnswerText = (item: GeneratedActivityItem) => {
  if (item.type === 'multiple_choice' && typeof item.correctIndex === 'number') {
    return item.options?.[item.correctIndex] || '';
  }

  if (item.type === 'true_false') {
    const answer =
      typeof item.answer === 'boolean' ? item.answer : item.correctAnswer;
    return answer ? 'True' : 'False';
  }

  if (item.type === 'identification') {
    return String(item.answer || item.acceptableAnswers?.[0] || '');
  }

  return '';
};

const GenerateActivity = ({
  activity,
  onBack,
  currentStudentId,
  apiBaseUrl,
  onCompleted,
}: GenerateActivityProps) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [itemSelections, setItemSelections] = useState<Record<number, number | boolean>>({});
  const [itemTextAnswers, setItemTextAnswers] = useState<Record<number, string>>({});
  const [identificationEvaluations, setIdentificationEvaluations] = useState<
    Record<number, IdentificationEvaluation>
  >({});

  const activityItems = useMemo(() => {
    if (!activity) return [];

    const sourceItems = Array.isArray(activity.activityItems)
      ? activity.activityItems
      : Array.isArray(activity.assessmentItems)
      ? activity.assessmentItems
      : [];

    const validItems = sourceItems.filter(isValidActivityItem);

    if (validItems.length > 0) {
      return validItems;
    }

    const quiz = activity.quiz;

    if (isValidQuiz(quiz)) {
      return [
        {
          type: 'multiple_choice' as const,
          question: quiz.question,
          options: quiz.options,
          correctIndex: quiz.correctIndex,
          explanation: quiz.explanation,
          points: 1,
        },
      ];
    }

    return [];
  }, [activity]);

  const multipleChoiceItems = useMemo(
    () => activityItems.filter((item) => item.type === 'multiple_choice'),
    [activityItems]
  );

  const trueFalseItems = useMemo(
    () => activityItems.filter((item) => item.type === 'true_false'),
    [activityItems]
  );

  const identificationItems = useMemo(
    () => activityItems.filter((item) => item.type === 'identification'),
    [activityItems]
  );

  const itemGlobalIndexMap = useMemo(() => {
    const map = new Map<GeneratedActivityItem, number>();
    activityItems.forEach((item, index) => map.set(item, index));
    return map;
  }, [activityItems]);

  useEffect(() => {
    let isMounted = true;

    const loadCompletionStatus = async () => {
      if (!activity || !currentStudentId || !apiBaseUrl) {
        if (isMounted) setCompleted(false);
        return;
      }

      try {
        const response = await apiFetch(`${apiBaseUrl}/student-activities/status?studentId=${encodeURIComponent(currentStudentId)}&assignmentId=${encodeURIComponent(activity.assignmentId)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load activity status.');
        }

        if (isMounted) {
          setCompleted(!!data?.data?.completed);
        }
      } catch {
        if (isMounted) setCompleted(false);
      }
    };

    setShowAnswer(false);
    setCompleted(false);
    setItemSelections({});
    setItemTextAnswers({});
    setIdentificationEvaluations({});

    void loadCompletionStatus();

    return () => {
      isMounted = false;
    };
  }, [activity, apiBaseUrl, currentStudentId]);

  const hasSimpleIdentificationMatch = (
    studentAnswer: string,
    acceptableAnswers: string[]
  ) => {
    const normalizedStudentAnswer = normalizeText(studentAnswer);
    if (!normalizedStudentAnswer) return false;

    return acceptableAnswers.some((acceptableAnswer) => {
      const normalizedAcceptable = normalizeText(acceptableAnswer);
      if (!normalizedAcceptable) return false;

      return (
        normalizedStudentAnswer === normalizedAcceptable ||
        normalizedStudentAnswer.includes(normalizedAcceptable) ||
        normalizedAcceptable.includes(normalizedStudentAnswer)
      );
    });
  };

  const getItemResult = (item: GeneratedActivityItem, globalIndex: number) => {
    if (item.type === 'multiple_choice') {
      const selected = itemSelections[globalIndex];

      if (typeof selected !== 'number' || typeof item.correctIndex !== 'number') {
        return null;
      }

      return selected === item.correctIndex;
    }

    if (item.type === 'true_false') {
      const selected = itemSelections[globalIndex];
      const correctAnswer =
        typeof item.answer === 'boolean' ? item.answer : item.correctAnswer;

      if (typeof selected !== 'boolean' || typeof correctAnswer !== 'boolean') {
        return null;
      }

      return selected === correctAnswer;
    }

    if (item.type === 'identification') {
      const studentAnswer = itemTextAnswers[globalIndex] || '';
      if (!studentAnswer.trim()) return null;

      const acceptableAnswers = Array.isArray(item.acceptableAnswers)
        ? item.acceptableAnswers
        : typeof item.answer === 'string'
        ? [item.answer]
        : [];

      if (hasSimpleIdentificationMatch(studentAnswer, acceptableAnswers)) {
        return true;
      }

      const aiEvaluation = identificationEvaluations[globalIndex];
      if (aiEvaluation) {
        return aiEvaluation.isCorrect;
      }

      return null;
    }

    return null;
  };

  const evaluateIdentificationAnswer = async (
    item: GeneratedActivityItem,
    globalIndex: number
  ): Promise<IdentificationEvaluation> => {
    const studentAnswer = itemTextAnswers[globalIndex] || '';

    if (!studentAnswer.trim()) {
      return {
        isCorrect: false,
        confidence: 0,
        feedback: 'No answer was provided.',
        method: 'unanswered',
      };
    }

    const acceptableAnswers = Array.isArray(item.acceptableAnswers)
      ? item.acceptableAnswers
      : typeof item.answer === 'string'
      ? [item.answer]
      : [];

    if (hasSimpleIdentificationMatch(studentAnswer, acceptableAnswers)) {
      return {
        isCorrect: true,
        confidence: 1,
        feedback: 'Accepted because your answer directly matches the expected concept.',
        method: 'exact',
      };
    }

    if (!apiBaseUrl || !activity) {
      return {
        isCorrect: false,
        confidence: 0,
        feedback: 'Unable to semantically check this answer because the AI grading endpoint is unavailable.',
        method: 'error',
      };
    }

    try {
      const response = await apiFetch(`${apiBaseUrl}/student-activities/check-identification-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAnswer,
          correctAnswers: acceptableAnswers,
          question: item.question,
          explanation: item.explanation || '',
          topic: activity.topic,
          basedOnMaterials: activity.basedOnMaterials,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'AI semantic grading failed.');
      }

      return {
        isCorrect: !!data?.data?.isCorrect,
        confidence: typeof data?.data?.confidence === 'number' ? data.data.confidence : 0,
        feedback:
          data?.data?.feedback ||
          (data?.data?.isCorrect
            ? 'Accepted because your answer has the same meaning.'
            : 'Review the expected concept from the related material.'),
        method: 'ai',
      };
    } catch (error) {
      console.error('IDENTIFICATION AI CHECK ERROR =>', error);

      return {
        isCorrect: false,
        confidence: 0,
        feedback: 'AI semantic grading was unavailable. Please review the expected answer.',
        method: 'error',
      };
    }
  };

  const getIdentificationFeedback = (globalIndex: number) => {
    return identificationEvaluations[globalIndex]?.feedback || null;
  };

  const getActivityScore = () => {
    if (activityItems.length === 0) return null;

    const correctCount = activityItems.reduce((count, item, index) => {
      return getItemResult(item, index) === true ? count + 1 : count;
    }, 0);

    return {
      correct: correctCount,
      total: activityItems.length,
      percent: Math.round((correctCount / activityItems.length) * 100),
    };
  };

  const getAnsweredCount = () => {
    return activityItems.reduce((count, item, index) => {
      if (item.type === 'multiple_choice') {
        return typeof itemSelections[index] === 'number' ? count + 1 : count;
      }

      if (item.type === 'true_false') {
        return typeof itemSelections[index] === 'boolean' ? count + 1 : count;
      }

      if (item.type === 'identification') {
        return itemTextAnswers[index]?.trim() ? count + 1 : count;
      }

      return count;
    }, 0);
  };

  const handleCheckAnswer = async () => {
    if (!activity || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const nextIdentificationEvaluations: Record<number, IdentificationEvaluation> = {};

      for (let index = 0; index < activityItems.length; index += 1) {
        const item = activityItems[index];

        if (item.type === 'identification') {
          nextIdentificationEvaluations[index] = await evaluateIdentificationAnswer(item, index);
        }
      }

      setIdentificationEvaluations(nextIdentificationEvaluations);
      setShowAnswer(true);

      const getFinalItemResult = (item: GeneratedActivityItem, index: number) => {
        if (item.type === 'identification') {
          const studentAnswer = itemTextAnswers[index] || '';

          if (!studentAnswer.trim()) return null;

          const acceptableAnswers = Array.isArray(item.acceptableAnswers)
            ? item.acceptableAnswers
            : typeof item.answer === 'string'
            ? [item.answer]
            : [];

          if (hasSimpleIdentificationMatch(studentAnswer, acceptableAnswers)) {
            return true;
          }

          return nextIdentificationEvaluations[index]?.isCorrect ?? false;
        }

        return getItemResult(item, index);
      };

      const calculateFinalSectionScore = (items: GeneratedActivityItem[]) => {
        if (items.length === 0) {
          return { correct: 0, total: 0, percent: 0 };
        }

        const correct = items.reduce((count, item) => {
          const globalIndex = itemGlobalIndexMap.get(item) ?? -1;
          return getFinalItemResult(item, globalIndex) === true ? count + 1 : count;
        }, 0);

        return {
          correct,
          total: items.length,
          percent: Math.round((correct / items.length) * 100),
        };
      };

      const correctCount = activityItems.reduce((count, item, index) => {
        return getFinalItemResult(item, index) === true ? count + 1 : count;
      }, 0);

      const activityScore =
        activityItems.length > 0
          ? {
              correct: correctCount,
              total: activityItems.length,
              percent: Math.round((correctCount / activityItems.length) * 100),
            }
          : null;

      const activityResults = activityItems.map((item, index) => ({
        index,
        id: item.id || `item-${index + 1}`,
        type: item.type,
        question: item.question,
        selected:
          item.type === 'identification'
            ? itemTextAnswers[index] || ''
            : itemSelections[index] ?? null,
        correct: getFinalItemResult(item, index),
        correctAnswer: getCorrectAnswerText(item),
        explanation: item.explanation || null,
        semanticEvaluation:
          item.type === 'identification'
            ? nextIdentificationEvaluations[index] || null
            : null,
        points: item.points || 1,
      }));

      const sectionScores = {
        multipleChoice: calculateFinalSectionScore(multipleChoiceItems),
        trueOrFalse: calculateFinalSectionScore(trueFalseItems),
        identification: calculateFinalSectionScore(identificationItems),
      };

      if (currentStudentId && apiBaseUrl) {
        const response = await apiFetch(`${apiBaseUrl}/student-activities/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: currentStudentId,
            courseId: activity.courseId,
            assignmentId: activity.assignmentId,
            courseName: activity.courseName,
            courseCode: activity.courseCode,
            assignmentTitle: activity.assignmentTitle,
            topic: activity.topic,
            recommendationType: activity.recommendationType,
            difficulty: activity.difficulty,
            score: activity.score ?? null,
            instructions: activity.instructions,
            basedOnMaterials: activity.basedOnMaterials,
            assessmentItems: activityItems,
            activityItems,
            activityResults,
            activityScore,
            sectionScores,
            assessmentAnswers: {
              selections: itemSelections,
              textAnswers: itemTextAnswers,
              identificationEvaluations: nextIdentificationEvaluations,
            },
            assessmentScorePercent: activityScore?.percent ?? null,
            tutorTip: activity.tutorTip || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to complete activity.');
        }
      }

      setCompleted(true);
      await onCompleted?.(activity);
    } catch (error) {
      console.error('COMPLETE ACTIVITY ERROR =>', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionScore = (items: GeneratedActivityItem[]) => {
    if (items.length === 0) {
      return { correct: 0, total: 0, percent: 0 };
    }

    const correct = items.reduce((count, item) => {
      const globalIndex = itemGlobalIndexMap.get(item) ?? -1;
      return getItemResult(item, globalIndex) === true ? count + 1 : count;
    }, 0);

    return {
      correct,
      total: items.length,
      percent: Math.round((correct / items.length) * 100),
    };
  };

  const renderMultipleChoiceSection = () => {
    if (!multipleChoiceItems.length) return null;

    return (
      <View style={styles.quizSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Multiple Choice</Text>
          <Text style={styles.sectionMeta}>{multipleChoiceItems.length} questions</Text>
        </View>

        {multipleChoiceItems.map((item, localIndex) => {
          const globalIndex = itemGlobalIndexMap.get(item) ?? localIndex;
          const itemResult = showAnswer ? getItemResult(item, globalIndex) : null;

          return (
            <View key={`mc-${globalIndex}`} style={styles.questionBlock}>
              <Text style={styles.questionText}>{localIndex + 1}. {item.question}</Text>

              {(item.options || []).map((option, optionIndex) => {
                const selected = itemSelections[globalIndex] === optionIndex;
                const isCorrect =
                  showAnswer &&
                  typeof item.correctIndex === 'number' &&
                  optionIndex === item.correctIndex;
                const isWrong =
                  showAnswer &&
                  selected &&
                  typeof item.correctIndex === 'number' &&
                  optionIndex !== item.correctIndex;

                return (
                  <TouchableOpacity
                    key={`${globalIndex}-${optionIndex}`}
                    style={[
                      styles.option,
                      selected && styles.optionSelected,
                      isCorrect && styles.optionCorrect,
                      isWrong && styles.optionWrong,
                    ]}
                    disabled={showAnswer || completed}
                    onPress={() =>
                      setItemSelections((prev) => ({
                        ...prev,
                        [globalIndex]: optionIndex,
                      }))
                    }
                  >
                    <Text style={styles.optionText}>{String.fromCharCode(65 + optionIndex)}. {option}</Text>
                  </TouchableOpacity>
                );
              })}

              {showAnswer && (
                <AnswerFeedback
                  result={itemResult}
                  answer={getCorrectAnswerText(item)}
                  explanation={item.explanation}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderTrueFalseSection = () => {
    if (!trueFalseItems.length) return null;

    return (
      <View style={styles.quizSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>True or False</Text>
          <Text style={styles.sectionMeta}>{trueFalseItems.length} questions</Text>
        </View>

        {trueFalseItems.map((item, localIndex) => {
          const globalIndex = itemGlobalIndexMap.get(item) ?? localIndex;
          const itemResult = showAnswer ? getItemResult(item, globalIndex) : null;
          const correctAnswer =
            typeof item.answer === 'boolean' ? item.answer : item.correctAnswer;

          return (
            <View key={`tf-${globalIndex}`} style={styles.questionBlock}>
              <Text style={styles.questionText}>{localIndex + 1}. {item.question}</Text>

              <View style={styles.trueFalseRow}>
                {[true, false].map((value) => {
                  const selected = itemSelections[globalIndex] === value;
                  const isCorrect = showAnswer && correctAnswer === value;
                  const isWrong = showAnswer && selected && correctAnswer !== value;

                  return (
                    <TouchableOpacity
                      key={String(value)}
                      style={[
                        styles.trueFalseBtn,
                        selected && styles.optionSelected,
                        isCorrect && styles.optionCorrect,
                        isWrong && styles.optionWrong,
                      ]}
                      disabled={showAnswer || completed}
                      onPress={() =>
                        setItemSelections((prev) => ({
                          ...prev,
                          [globalIndex]: value,
                        }))
                      }
                    >
                      <Text style={styles.optionText}>{value ? 'True' : 'False'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {showAnswer && (
                <AnswerFeedback
                  result={itemResult}
                  answer={getCorrectAnswerText(item)}
                  explanation={item.explanation}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderIdentificationSection = () => {
    if (!identificationItems.length) return null;

    return (
      <View style={styles.quizSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Identification</Text>
          <Text style={styles.sectionMeta}>{identificationItems.length} questions</Text>
        </View>

        {identificationItems.map((item, localIndex) => {
          const globalIndex = itemGlobalIndexMap.get(item) ?? localIndex;
          const itemResult = showAnswer ? getItemResult(item, globalIndex) : null;

          return (
            <View key={`id-${globalIndex}`} style={styles.questionBlock}>
              <Text style={styles.questionText}>{localIndex + 1}. {item.question}</Text>

              <TextInput
                value={itemTextAnswers[globalIndex] || ''}
                onChangeText={(value) =>
                  setItemTextAnswers((prev) => ({
                    ...prev,
                    [globalIndex]: value,
                  }))
                }
                placeholder="Type your answer..."
                placeholderTextColor="#777"
                editable={!showAnswer && !completed}
                style={[
                  styles.textInput,
                  showAnswer && itemResult === true && styles.inputCorrect,
                  showAnswer && itemResult === false && styles.inputWrong,
                ]}
              />

              {showAnswer && (
                <AnswerFeedback
                  result={itemResult}
                  answer={getCorrectAnswerText(item)}
                  explanation={item.explanation}
                  semanticFeedback={getIdentificationFeedback(globalIndex)}
                />
              )}
            </View>
          );
        })}
      </View>
    );
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

  const readableMaterials = activity.materialExtractionStatus?.filter(
    (item) => item.status === 'readable'
  );

  const activityScore = showAnswer ? getActivityScore() : null;
  const answeredCount = getAnsweredCount();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.wrapper}>
        {onBack && (
          <TouchableOpacity style={styles.backMaterial} onPress={onBack}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.pageTitle, { fontSize: isMobile ? 24 : 28 }]}>Generated Follow-up Activity</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.courseText}>{activity.courseName} • {activity.courseCode}</Text>
          <Text style={styles.topicText}>{activity.topic}</Text>
          <Text style={styles.assignmentText}>{activity.assignmentTitle}</Text>

          {activity.score !== null && activity.score !== undefined && (
            <Text style={styles.scoreText}>Previous Score: {activity.score}%</Text>
          )}

          {!!activity.estimatedMinutes && (
            <Text style={styles.estimateText}>Estimated time: {activity.estimatedMinutes} minutes</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why this activity was generated</Text>
          <Text style={styles.bodyText}>
            This follow-up activity was generated from the teacher-selected related material file content because your previous score shows you need more support with this lesson.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <Text style={styles.bodyText}>{activity.instructions}</Text>
        </View>

        {Array.isArray(activity.learningObjectives) && activity.learningObjectives.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Learning objectives</Text>
            {activity.learningObjectives.map((objective, index) => (
              <Text key={`${objective}-${index}`} style={styles.materialItem}>• {objective}</Text>
            ))}
          </View>
        )}

        {Array.isArray(activity.steps) && activity.steps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Guided steps</Text>
            {activity.steps.map((step, index) => (
              <Text key={`${step}-${index}`} style={styles.materialItem}>{index + 1}. {step}</Text>
            ))}
          </View>
        )}

        {activity.basedOnMaterials.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Based on related material content</Text>
            {activity.basedOnMaterials.map((material, index) => (
              <Text key={`${material}-${index}`} style={styles.materialItem}>• {material}</Text>
            ))}

            {readableMaterials && readableMaterials.length > 0 && (
              <Text style={styles.readableText}>
                {readableMaterials.length} related material file{readableMaterials.length > 1 ? 's were' : ' was'} read successfully.
              </Text>
            )}
          </View>
        )}

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Quiz Progress</Text>
          <Text style={styles.bodyText}>
            Answered {answeredCount}/{activityItems.length} questions
          </Text>

          {activityScore && (
            <View style={styles.scoreBox}>
              <Text style={styles.scoreBoxText}>
                Final Score: {activityScore.correct}/{activityScore.total} ({activityScore.percent}%)
              </Text>
            </View>
          )}
        </View>

        {activityItems.length > 0 ? (
          <>
            {renderMultipleChoiceSection()}
            {renderTrueFalseSection()}
            {renderIdentificationSection()}
          </>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No material-based activity was generated</Text>
            <Text style={styles.errorText}>
              The backend did not return valid activity items from the related material file content. Please regenerate the activity after confirming the related material file is readable.
            </Text>
          </View>
        )}

        {!!activity.tutorTip && (
          <View style={styles.tipCard}>
            <Text style={styles.cardTitle}>AI Tutor Tip</Text>
            <Text style={styles.bodyText}>{activity.tutorTip}</Text>
          </View>
        )}

        {!completed ? (
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={() => {
              void handleCheckAnswer();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitText}>Checking answers...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Check Answer & Save Score</Text>
            )}
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

const AnswerFeedback = ({
  result,
  answer,
  explanation,
  semanticFeedback,
}: {
  result: boolean | null;
  answer: string;
  explanation?: string;
  semanticFeedback?: string | null;
}) => {
  return (
    <View
      style={[
        styles.explanationBox,
        result === true && styles.correctExplanationBox,
        result === false && styles.wrongExplanationBox,
      ]}
    >
      <Text style={styles.explanationTitle}>
        {result === true
          ? 'Correct!'
          : result === false
          ? 'Review this:'
          : 'Suggested answer:'}
      </Text>

      {!!answer && (
        <Text style={styles.bodyText}>Correct answer: {answer}</Text>
      )}

      {!!semanticFeedback && (
        <Text style={styles.bodyText}>{semanticFeedback}</Text>
      )}

      {!!explanation && (
        <Text style={styles.bodyText}>{explanation}</Text>
      )}
    </View>
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

  estimateText: {
    color: '#555',
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },

  progressTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },

  quizSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
  },

  sectionMeta: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '800',
    backgroundColor: '#FFF1F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },

  questionBlock: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
    marginTop: 14,
  },

  tipCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0A3',
  },

  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3B4B4',
  },

  errorTitle: {
    color: '#B71C1C',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },

  errorText: {
    color: '#8A1C1C',
    fontSize: 14,
    lineHeight: 21,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },

  bodyText: {
    color: '#555',
    fontSize: 14,
    lineHeight: 21,
  },

  materialItem: {
    color: '#555',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 3,
  },

  readableText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 10,
  },

  questionText: {
    marginBottom: 12,
    color: '#222',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },

  option: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },

  optionSelected: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF7F7',
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
    color: '#111',
  },

  trueFalseRow: {
    flexDirection: 'row',
    gap: 10,
  },

  trueFalseBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  explanationBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F6F7F9',
  },

  correctExplanationBox: {
    backgroundColor: '#E8F5E9',
  },

  wrongExplanationBox: {
    backgroundColor: '#FFEBEE',
  },

  explanationTitle: {
    fontWeight: '800',
    marginBottom: 4,
    color: '#111',
  },

  scoreBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F6F7F9',
    alignItems: 'center',
  },

  scoreBoxText: {
    color: '#111',
    fontWeight: '800',
  },

  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    minHeight: 48,
    padding: 12,
    marginTop: 8,
    color: '#111',
    backgroundColor: '#FFF',
  },

  inputCorrect: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },

  inputWrong: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
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

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    color: '#222',
    fontWeight: '700',
  },
});