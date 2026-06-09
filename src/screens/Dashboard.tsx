import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { buildStudentAnalytics } from '../analytics/analyticsService';
import { RiskLevel, TrendDirection } from '../analytics/types';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { Announcement } from '../components/AnnouncementModal';

export interface DashboardMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  uploadedDate: string;
}

export interface DashboardAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
}

export interface DashboardCourse {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  semester: string;
  schoolYear: string;
  section: string;
  materials: DashboardMaterial[];
  assignments: DashboardAssignment[];
}

interface DashboardProps {
  announcements?: Announcement[];
  courses?: DashboardCourse[];
  onOpenCourse?: (course: DashboardCourse) => void;
  onOpenAssignments?: (course: DashboardCourse) => void;
  onOpenMaterials?: (course: DashboardCourse) => void;
  onOpenGeneratedActivity?: (
    course: DashboardCourse,
    assignment: DashboardAssignment
  ) => void;
  onJoinClass?: (classCode: string) => void | Promise<void> | Promise<any> | any;
  isGeneratingActivity?: boolean;
  completedActivityScores?: Record<
    string,
    {
      scorePercent: number | null;
      completed: boolean;
      mastered: boolean;
    }
  >;
}

type RecommendationType = 'review' | 'practice';

const Dashboard = ({
  announcements = [],
  courses = [],
  onOpenCourse,
  onOpenAssignments,
  onOpenMaterials,
  onOpenGeneratedActivity,
  onJoinClass,
  isGeneratingActivity = false,
  completedActivityScores = {},
}: DashboardProps) => {
  const { width } = useWindowDimensions();
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [joinFeedbackVisible, setJoinFeedbackVisible] = useState(false);
  const [joinFeedbackType, setJoinFeedbackType] = useState<'success' | 'error'>('success');
  const [joinFeedbackMessage, setJoinFeedbackMessage] = useState('');
  const [isJoiningClass, setIsJoiningClass] = useState(false);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  const pagePadding = isMobile ? 14 : isTablet ? 24 : 32;
  const sectionSpacing = isMobile ? 16 : 20;
  const titleSize = isMobile ? 22 : isTablet ? 24 : 28;
  const bannerHeight = isMobile ? 110 : isTablet ? 125 : 140;
  const contentMaxWidth = isLargeScreen ? 1280 : 1100;

  const showJoinFeedback = (
    message: string,
    type: 'success' | 'error' = 'success'
  ) => {
    setJoinFeedbackMessage(message);
    setJoinFeedbackType(type);
    setJoinFeedbackVisible(true);

    setTimeout(() => {
      setJoinFeedbackVisible(false);
    }, 2800);
  };

  const handleJoinClass = async () => {
    if (isJoiningClass) return;

    const trimmedCode = classCode.trim().toUpperCase();

    if (!trimmedCode) {
      showJoinFeedback('Please enter a class code.', 'error');
      return;
    }

    if (!onJoinClass) {
      showJoinFeedback('Join class action is not available.', 'error');
      return;
    }

    try {
      setIsJoiningClass(true);

      const result: any = await onJoinClass(trimmedCode);

      if (result && result.success === false) {
        throw new Error(
          result.error ||
            result.message ||
            'Failed to join class. Please check the class code.'
        );
      }

      setClassCode('');
      setJoinModalVisible(false);
      showJoinFeedback(
        result?.message || 'Class joined successfully.',
        'success'
      );
    } catch (error: any) {
      showJoinFeedback(
        error?.message || 'Failed to join class. Please check the class code.',
        'error'
      );
    } finally {
      setIsJoiningClass(false);
    }
  };

  const getScorePercent = (assignment: DashboardAssignment) => {
    if (
      assignment.status !== 'graded' ||
      assignment.points === undefined ||
      assignment.maxPoints === undefined ||
      assignment.maxPoints === 0
    ) {
      return null;
    }

    return Math.round((assignment.points / assignment.maxPoints) * 100);
  };

  const getRecommendationType = (
    assignment: DashboardAssignment
  ): RecommendationType | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 75) return 'practice';
    return null;
  };

  const getRecommendationColor = (type: RecommendationType) => {
    if (type === 'review') return '#D32F2F';
    return '#F57C00';
  };

  const getRecommendationLabel = (type: RecommendationType) => {
    if (type === 'review') return 'Review Activity';
    return 'Practice Quiz';
  };

  const getRelatedMaterials = (
    course: DashboardCourse,
    assignment: DashboardAssignment
  ) => {
    if (!Array.isArray(assignment.materialIds) || assignment.materialIds.length === 0) {
      return [];
    }

    return course.materials.filter((material) =>
      assignment.materialIds?.includes(material.id)
    );
  };

  const hasRelatedMaterials = (assignment: DashboardAssignment) => {
    return Array.isArray(assignment.materialIds) && assignment.materialIds.length > 0;
  };

  // UPDATED: Check strictly if the activity is completed, regardless of score
  const hasCompletedGeneratedActivity = (assignment: DashboardAssignment) => {
    const activityScore = completedActivityScores[assignment.id];
    return !!activityScore?.completed;
  };

  const canGenerateActivity = (assignment: DashboardAssignment) => {
    return (
      getRecommendationType(assignment) !== null &&
      hasRelatedMaterials(assignment) &&
      !hasCompletedGeneratedActivity(assignment) // Hide if already completed
    );
  };

  const getNextDueAssignment = (assignments: DashboardAssignment[]) => {
    const today = new Date();

    const upcoming = assignments
      .filter((assignment) => {
        if (assignment.status === 'submitted' || assignment.status === 'graded') {
          return false;
        }

        const due = new Date(assignment.dueDate);
        return !Number.isNaN(due.getTime()) && due >= today;
      })
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    return upcoming[0] || null;
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'High':
        return '#D32F2F';
      case 'Moderate':
        return '#F57C00';
      default:
        return '#2E7D32';
    }
  };

  const getTrendColor = (direction: TrendDirection | string) => {
    switch (direction) {
      case 'up':
        return '#2E7D32';
      case 'down':
        return '#D32F2F';
      default:
        return '#666';
    }
  };

  const studentAnalytics = useMemo(() => {
    return buildStudentAnalytics(courses);
  }, [courses]);

  const derivedCourses = useMemo(() => {
    return courses.map((course) => {
      const gradedAssignments = course.assignments.filter(
        (assignment) => assignment.status === 'graded'
      );

      const weakAssignments = gradedAssignments.filter((assignment) => {
        const score = getScorePercent(assignment);
        return score !== null && score < 75;
      });

      const pendingGenerated = weakAssignments.filter((assignment) =>
        canGenerateActivity(assignment)
      );

      const averageScore =
        gradedAssignments.length > 0
          ? Math.round(
              gradedAssignments.reduce(
                (sum, item) => sum + (getScorePercent(item) ?? 0),
                0
              ) / gradedAssignments.length
            )
          : null;

      const nextDueAssignment = getNextDueAssignment(course.assignments);

      return {
        course,
        weakAssignments,
        pendingGeneratedCount: pendingGenerated.length,
        averageScore,
        totalAssignments: course.assignments.length,
        gradedAssignmentsCount: gradedAssignments.length,
        nextDueAssignment,
      };
    });
  }, [courses, completedActivityScores]); // Added completedActivityScores to dependencies

  const visibleCourses = useMemo(() => {
    return showAllCourses ? derivedCourses : derivedCourses.slice(0, 6);
  }, [derivedCourses, showAllCourses]);

  const hiddenCourseCount = Math.max(derivedCourses.length - 6, 0);

  const recommendedAssignments = useMemo(() => {
    return derivedCourses.flatMap((item) =>
      item.weakAssignments
        // UPDATED: Filter out assignments where the generated activity is already completed
        .filter((assignment) => canGenerateActivity(assignment))
        .map((assignment) => {
          const recommendation = getRecommendationType(assignment);
          if (!recommendation) return null;

          const relatedMaterials = getRelatedMaterials(item.course, assignment);

          return {
            course: item.course,
            assignment,
            recommendation,
            score: getScorePercent(assignment),
            canGenerate: true, // Always true since we filtered by canGenerateActivity
            relatedMaterials,
            materialTitle:
              relatedMaterials.map((material) => material.title).join(", ") ||
              assignment.topic ||
              assignment.title,
          };
        })
        .filter(Boolean) as Array<{
        course: DashboardCourse;
        assignment: DashboardAssignment;
        recommendation: RecommendationType;
        score: number | null;
        canGenerate: boolean;
        relatedMaterials: DashboardMaterial[];
        materialTitle: string;
      }>
    );
  }, [derivedCourses, completedActivityScores]); // Added completedActivityScores to dependencies

  const nextBest = useMemo(() => {
    const actionable = recommendedAssignments.filter((item) => item.canGenerate);
    if (actionable.length === 0) return null;
    return [...actionable].sort(
      (a, b) => (a.score ?? 100) - (b.score ?? 100)
    )[0];
  }, [recommendedAssignments]);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal: pagePadding,
            paddingTop: isLargeScreen ? 28 : 16,
            paddingBottom: 30,
          },
        ]}
      >
        <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>
          <View style={styles.topHeaderRow}>
            <Text
              style={[
                styles.pageTitle,
                { fontSize: titleSize, paddingBottom: 0 },
              ]}
            >
              Announcements
            </Text>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[
                styles.joinClassButton,
                {
                  paddingHorizontal: isMobile ? 12 : 14,
                  paddingVertical: isMobile ? 10 : 11,
                },
              ]}
              onPress={() => setJoinModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.joinClassButtonText}>Join Class</Text>
            </TouchableOpacity>
          </View>

          {announcements.length > 0 ? (
            <AnnouncementBanner announcements={announcements} />
          ) : (
            <View style={[styles.banner, { height: bannerHeight }]}>
              <View style={styles.bannerContent}>
                <Text
                  style={[styles.bannerDay, { fontSize: isMobile ? 13 : 14 }]}
                >
                  No announcements yet
                </Text>
                <Text
                  style={[
                    styles.bannerLocation,
                    { fontSize: isMobile ? 16 : isTablet ? 18 : 20 },
                  ]}
                >
                  Stay tuned for updates from your courses
                </Text>
              </View>
            </View>
          )}

          <Text
            style={[
              styles.pageTitle,
              {
                fontSize: titleSize,
                marginTop: sectionSpacing,
              },
            ]}
          >
            Student Performance Snapshot
          </Text>

          <View
            style={[
              styles.snapshotGrid,
              isTablet && styles.snapshotGridTablet,
              isLargeScreen && styles.snapshotGridLarge,
            ]}
          >
            <View
              style={[
                styles.snapshotCard,
                {
                  flexBasis: isMobile ? '48%' : isLargeScreen ? '15.8%' : '32%',
                  borderTopColor: '#2E7D32',
                },
              ]}
            >
              <Text style={styles.snapshotLabel}>Overall Average</Text>
              <Text style={styles.snapshotValue}>
                {studentAnalytics.overallAverage > 0
                  ? `${studentAnalytics.overallAverage}%`
                  : 'N/A'}
              </Text>
            </View>

            <View
              style={[
                styles.snapshotCard,
                {
                  flexBasis: isMobile ? '48%' : isLargeScreen ? '15.8%' : '32%',
                  borderTopColor: getRiskColor(studentAnalytics.overallRisk),
                },
              ]}
            >
              <Text style={styles.snapshotLabel}>Overall Risk</Text>
              <Text
                style={[
                  styles.snapshotValue,
                  { color: getRiskColor(studentAnalytics.overallRisk) },
                ]}
              >
                {studentAnalytics.overallRisk}
              </Text>
            </View>

            <View
              style={[
                styles.snapshotCard,
                {
                  flexBasis: isMobile ? '48%' : isLargeScreen ? '15.8%' : '32%',
                  borderTopColor: '#F57C00',
                },
              ]}
            >
              <Text style={styles.snapshotLabel}>Pending Assignments</Text>
              <Text style={styles.snapshotValue}>
                {studentAnalytics.totalPendingAssignments}
              </Text>
            </View>

            <View
              style={[
                styles.snapshotCard,
                {
                  flexBasis: isMobile ? '48%' : isLargeScreen ? '15.8%' : '32%',
                  borderTopColor: '#1565C0',
                },
              ]}
            >
              <Text style={styles.snapshotLabel}>Strongest Subject</Text>
              <Text style={styles.snapshotValueSmall}>
                {studentAnalytics.strongestSubject}
              </Text>
            </View>

            <View
              style={[
                styles.snapshotCard,
                {
                  flexBasis: isMobile ? '48%' : isLargeScreen ? '15.8%' : '32%',
                  borderTopColor: '#D32F2F',
                },
              ]}
            >
              <Text style={styles.snapshotLabel}>Weakest Subject</Text>
              <Text style={styles.snapshotValueSmall}>
                {studentAnalytics.weakestSubject}
              </Text>
            </View>

            <View
              style={[
                styles.snapshotCard,
                {
                  flexBasis: isMobile ? '48%' : isLargeScreen ? '15.8%' : '32%',
                  borderTopColor: getTrendColor(
                    studentAnalytics.overallTrend > 2
                      ? 'up'
                      : studentAnalytics.overallTrend < -2
                      ? 'down'
                      : 'stable'
                  ),
                },
              ]}
            >
              <Text style={styles.snapshotLabel}>Current Trend</Text>
              <Text
                style={[
                  styles.snapshotValue,
                  {
                    color: getTrendColor(
                      studentAnalytics.overallTrend > 2
                        ? 'up'
                        : studentAnalytics.overallTrend < -2
                        ? 'down'
                        : 'stable'
                    ),
                  },
                ]}
              >
                {studentAnalytics.overallTrend > 2
                  ? `↑ +${studentAnalytics.overallTrend}`
                  : studentAnalytics.overallTrend < -2
                  ? `↓ ${studentAnalytics.overallTrend}`
                  : `→ ${studentAnalytics.overallTrend}`}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.pageTitle,
              {
                fontSize: titleSize,
                marginTop: sectionSpacing,
              },
            ]}
          >
            Suggested Learning Actions
          </Text>

          <View
            style={[
              styles.sectionCard,
              {
                padding: isMobile ? 16 : 20,
                borderRadius: isMobile ? 18 : 20,
              },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { fontSize: isMobile ? 17 : 18 }]}
            >
              Support Activities for Weak Topics
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { fontSize: isMobile ? 13 : 14 },
              ]}
            >
              Generate Activity is available only for graded assignments below 75% that already have related materials selected by the teacher and have not been completed yet.
            </Text>

            <View style={styles.recommendationList}>
              {recommendedAssignments.length === 0 ? (
                <Text style={styles.emptyStateText}>
                  No recommendations available yet.
                </Text>
              ) : (
                recommendedAssignments.map((item) => {
                  const color = getRecommendationColor(item.recommendation);

                  return (
                    <View
                      key={`${item.course.id}-${item.assignment.id}`}
                      style={[
                        styles.recommendationItem,
                        {
                          padding: isMobile ? 12 : 14,
                          borderLeftColor: color,
                          borderLeftWidth: 4,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.recommendationTitle,
                          { fontSize: isMobile ? 14 : 15 },
                        ]}
                      >
                        {item.course.name}
                      </Text>

                      <Text
                        style={[
                          styles.recommendationMeta,
                          { fontSize: isMobile ? 12 : 13, marginTop: 4 },
                        ]}
                      >
                        Related material: {item.materialTitle}
                      </Text>

                      <Text
                        style={[
                          styles.recommendationMeta,
                          { fontSize: isMobile ? 12 : 13, marginTop: 2, color },
                        ]}
                      >
                        {getRecommendationLabel(item.recommendation)}
                        {item.score !== null ? ` • Score: ${item.score}%` : ''}
                      </Text>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[
                            styles.smallActionBtn,
                            { backgroundColor: '#D32F2F' },
                          ]}
                          disabled={isGeneratingActivity}
                          onPress={() => {
                            if (isGeneratingActivity) return;
                            onOpenGeneratedActivity?.(item.course, item.assignment);
                          }}
                        >
                          {isGeneratingActivity ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.smallActionBtnText}>
                              Generate Activity
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.smallActionBtn,
                            { backgroundColor: '#444' },
                          ]}
                          onPress={() => onOpenAssignments?.(item.course)}
                        >
                          <Text style={styles.smallActionBtnText}>
                            Open Assignment
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          <Text
            style={[
              styles.pageTitle,
              {
                fontSize: titleSize,
                marginTop: sectionSpacing,
              },
            ]}
          >
            Next Recommended Lesson
          </Text>

          {nextBest ? (
            <TouchableOpacity
              style={[
                styles.lessonCard,
                {
                  padding: isMobile ? 14 : 16,
                  borderRadius: isMobile ? 16 : 18,
                },
              ]}
              onPress={() => onOpenMaterials?.(nextBest.course)}
            >
              <View style={styles.lessonBadge}>
                <Text style={styles.lessonBadgeText}>Next</Text>
              </View>

              <View style={styles.lessonContent}>
                <Text
                  style={[styles.lessonTitle, { fontSize: isMobile ? 15 : 16 }]}
                >
                  {nextBest.materialTitle}
                </Text>
                <Text
                  style={[
                    styles.lessonSubtitle,
                    { fontSize: isMobile ? 13 : 14 },
                  ]}
                >
                  Recommended next lesson material in {nextBest.course.name}. This is based on the related material selected by your teacher for the assignment where your score was below 75%.
                </Text>

                <Text
                  style={[
                    styles.lessonSubtitle,
                    { fontSize: isMobile ? 12 : 13, marginTop: 6, color: '#D32F2F', fontWeight: '700' },
                  ]}
                >
                  From assignment score: {nextBest.score ?? 'N/A'}%
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.emptyStateText}>
              No next lesson recommendation yet.
            </Text>
          )}

          <View
            style={[
              styles.sectionHeaderRow,
              { marginTop: sectionSpacing }
            ]}
          >
            <Text
              style={[
                styles.pageTitle,
                { fontSize: titleSize, flex: 1, paddingBottom: 0 }
              ]}
            >
              Course Progress Overview
            </Text>

            {hiddenCourseCount > 0 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => setShowAllCourses(prev => !prev)}
              >
                <Text style={styles.seeAllButtonText}>
                  {showAllCourses ? 'Show Less' : `See All (${derivedCourses.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.courseGrid,
              isTablet && styles.courseGridTablet,
              isLargeScreen && styles.courseGridLarge,
            ]}
          >
            {visibleCourses.map((item) => {
              const weakCourseColor =
                item.weakAssignments.length > 0
                  ? getRecommendationColor(
                      getRecommendationType(item.weakAssignments[0]) || 'practice'
                    )
                  : '#2E7D32';

              return (
                <View
                  key={item.course.id}
                  style={[
                    styles.courseCard,
                    {
                      width: isMobile ? '100%' : isLargeScreen ? '32%' : '48.5%',
                      borderTopColor: weakCourseColor,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => onOpenCourse?.(item.course)}
                  >
                    <Text style={styles.courseCardTitle}>{item.course.name}</Text>
                    <Text style={styles.courseInstructor}>
                      {item.course.instructor}
                    </Text>
                    <Text style={styles.courseSubMeta}>
                      {item.course.semester} ({item.course.schoolYear})
                    </Text>
                    <Text style={styles.courseSubMeta}>{item.course.section}</Text>

                    <View style={styles.courseMetaGrid}>
                      <View style={styles.courseMiniStat}>
                        <Text style={styles.courseMetaLabel}>Assignments</Text>
                        <Text style={styles.courseMetaValue}>
                          {item.totalAssignments}
                        </Text>
                      </View>

                      <View style={styles.courseMiniStat}>
                        <Text style={styles.courseMetaLabel}>Average</Text>
                        <Text style={styles.courseMetaValue}>
                          {item.averageScore !== null
                            ? `${item.averageScore}%`
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.courseMetaBlock}>
                      <Text style={styles.courseMetaLabel}>Next Due</Text>
                      <Text style={styles.courseMetaValue}>
                        {item.nextDueAssignment
                          ? item.nextDueAssignment.title
                          : 'No upcoming assignment'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.courseBadge,
                        {
                          backgroundColor:
                            item.pendingGeneratedCount > 0
                              ? weakCourseColor
                              : '#2E7D32',
                        },
                      ]}
                    >
                      <Text style={styles.courseBadgeText}>
                        {item.pendingGeneratedCount > 0
                          ? `${item.pendingGeneratedCount} support activit${
                              item.pendingGeneratedCount > 1 ? 'ies' : 'y'
                            } available`
                          : 'Course is doing well'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {joinFeedbackVisible ? (
        <View pointerEvents="none" style={styles.joinFeedbackContainer}>
          <View
            style={[
              styles.joinFeedbackBox,
              joinFeedbackType === 'success'
                ? styles.joinFeedbackSuccess
                : styles.joinFeedbackError,
            ]}
          >
            <Ionicons
              name={
                joinFeedbackType === 'success'
                  ? 'checkmark-circle'
                  : 'alert-circle'
              }
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.joinFeedbackText}>{joinFeedbackMessage}</Text>
          </View>
        </View>
      ) : null}

      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (!isJoiningClass) {
              setJoinModalVisible(false);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.joinDropdownModal,
                  {
                    top: isMobile ? 70 : 80,
                    right: isMobile ? 14 : pagePadding,
                    width: isMobile ? Math.min(width - 28, 320) : 340,
                  },
                ]}
              >
                <View style={styles.joinDropdownHeader}>
                  <View style={styles.joinDropdownIconWrap}>
                    <Ionicons name="school-outline" size={18} color="#D32F2F" />
                  </View>

                  <View style={styles.joinDropdownHeaderText}>
                    <Text style={styles.joinDropdownTitle}>Join Class</Text>
                    <Text style={styles.joinDropdownSubtitle}>
                      Enter your class code to join a course.
                    </Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Class Code</Text>
                <TextInput
                  value={classCode}
                  onChangeText={(value) => setClassCode(value.toUpperCase())}
                  placeholder="Enter class code"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.classCodeInput}
                />

                <View style={styles.joinDropdownActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, isJoiningClass && styles.joinDisabledButton]}
                    disabled={isJoiningClass}
                    onPress={() => {
                      setClassCode('');
                      setJoinModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      (!classCode.trim() || isJoiningClass) && styles.confirmButtonDisabled,
                    ]}
                    onPress={handleJoinClass}
                    disabled={!classCode.trim() || isJoiningClass}
                  >
                    {isJoiningClass ? (
                      <View style={styles.joinLoadingContent}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.confirmButtonText}>Joining...</Text>
                      </View>
                    ) : (
                      <Text style={styles.confirmButtonText}>Join Now</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    width: '100%',
  },
  contentWrap: {
    width: '100%',
    alignSelf: 'center',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  pageTitle: {
    fontWeight: 'bold',
    paddingBottom: 10,
    textAlign: 'left',
    color: '#111',
  },

  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  snapshotGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  snapshotGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  snapshotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderTopWidth: 5,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  snapshotLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
    fontWeight: '600',
  },
  snapshotValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  snapshotValueSmall: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  seeAllButton: {
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F3C6C6',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  seeAllButtonText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '800',
  },

  joinClassButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  joinClassButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: '#E53935',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bannerDay: {
    color: '#FFF',
  },
  bannerLocation: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  sectionCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F3C6C6',
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#B71C1C',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#555',
    lineHeight: 20,
    marginBottom: 14,
  },
  recommendationList: {
    gap: 10,
  },
  recommendationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0D9D9',
  },
  recommendationTitle: {
    fontWeight: '700',
    color: '#222',
  },
  recommendationMeta: {
    color: '#666',
  },
  materialHintText: {
    marginTop: 8,
    color: '#B26A00',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  disabledActionBtn: {
    backgroundColor: '#BDBDBD',
  },
  smallActionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },

  courseGrid: {
    gap: 12,
  },
  courseGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  courseGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderTopWidth: 5,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  courseCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  courseInstructor: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  courseSubMeta: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
    fontWeight: '500',
  },
  courseMetaBlock: {
    marginBottom: 10,
    marginTop: 8,
  },
  courseMetaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  courseMiniStat: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 10,
  },
  courseMetaLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  courseMetaValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
  },
  courseBadge: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  courseBadgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },

  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 5,
    borderLeftColor: '#D32F2F',
    borderWidth: 1,
    borderColor: '#F1D0D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  lessonBadge: {
    backgroundColor: '#D32F2F',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
    marginTop: 2,
  },
  lessonBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  lessonSubtitle: {
    color: '#666',
    lineHeight: 20,
  },

  emptyStateText: {
    color: '#777',
    fontSize: 14,
  },

  joinFeedbackContainer: {
    position: 'absolute',
    top: 18,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  joinFeedbackBox: {
    maxWidth: 420,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
  },
  joinFeedbackSuccess: {
    backgroundColor: '#2E7D32',
  },
  joinFeedbackError: {
    backgroundColor: '#D32F2F',
  },
  joinFeedbackText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  joinDropdownModal: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  joinDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  joinDropdownHeaderText: {
    flex: 1,
  },
  joinDropdownIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  joinDropdownSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  classCodeInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DADDE2',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  joinDropdownActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  joinDisabledButton: {
    opacity: 0.65,
  },
  joinLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
  },
  confirmButtonDisabled: {
    backgroundColor: '#F0A7A7',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default Dashboard;