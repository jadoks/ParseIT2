import React, { useMemo, useState } from 'react';
import {
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
  onJoinClass?: (classCode: string) => void;
}

type RecommendationType = 'review' | 'practice' | 'advanced';

const Dashboard = ({
  announcements = [],
  courses = [],
  onOpenCourse,
  onOpenAssignments,
  onOpenMaterials,
  onOpenGeneratedActivity,
  onJoinClass,
}: DashboardProps) => {
  const { width } = useWindowDimensions();
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [classCode, setClassCode] = useState('');

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  const pagePadding = isMobile ? 14 : isTablet ? 24 : 32;
  const sectionSpacing = isMobile ? 16 : 20;
  const titleSize = isMobile ? 22 : isTablet ? 24 : 28;
  const bannerHeight = isMobile ? 110 : isTablet ? 125 : 140;
  const contentMaxWidth = isLargeScreen ? 1280 : 1100;

  const handleJoinClass = () => {
    const trimmedCode = classCode.trim();

    if (!trimmedCode) return;

    onJoinClass?.(trimmedCode);
    setClassCode('');
    setJoinModalVisible(false);
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
    return 'advanced';
  };

  const getRecommendationColor = (type: RecommendationType) => {
    if (type === 'review') return '#D32F2F';
    if (type === 'practice') return '#F57C00';
    return '#2E7D32';
  };

  const getRecommendationLabel = (type: RecommendationType) => {
    if (type === 'review') return 'Review Activity';
    if (type === 'practice') return 'Practice Quiz';
    return 'Advanced Challenge';
  };

  const getNextDueAssignment = (assignments: DashboardAssignment[]) => {
    const today = new Date();

    const upcoming = assignments
      .filter((assignment) => {
        const due = new Date(assignment.dueDate);
        return !Number.isNaN(due.getTime()) && due >= today;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return upcoming[0] || null;
  };

  const derivedCourses = useMemo(() => {
    return courses.map((course) => {
      const gradedAssignments = course.assignments.filter((a) => a.status === 'graded');

      const weakAssignments = gradedAssignments.filter((a) => {
        const score = getScorePercent(a);
        return score !== null && score < 75;
      });

      const pendingGenerated = weakAssignments.filter((a) => {
        const type = getRecommendationType(a);
        return type === 'review' || type === 'practice';
      });

      const averageScore =
        gradedAssignments.length > 0
          ? Math.round(
              gradedAssignments.reduce(
                (sum, item) => sum + (getScorePercent(item) ?? 0),
                0
              ) / gradedAssignments.length
            )
          : null;

      const weakTopics = weakAssignments.map(
        (assignment) => assignment.topic || assignment.title
      );
      const nextDueAssignment = getNextDueAssignment(course.assignments);

      return {
        course,
        weakAssignments,
        weakTopics,
        weakTopicsCount: weakTopics.length,
        pendingGeneratedCount: pendingGenerated.length,
        averageScore,
        totalAssignments: course.assignments.length,
        gradedAssignmentsCount: gradedAssignments.length,
        nextDueAssignment,
      };
    });
  }, [courses]);

  const recommendedAssignments = useMemo(() => {
    return derivedCourses.flatMap((item) =>
      item.weakAssignments
        .map((assignment) => {
          const recommendation = getRecommendationType(assignment);
          if (!recommendation || recommendation === 'advanced') return null;

          return {
            course: item.course,
            assignment,
            recommendation,
            score: getScorePercent(assignment),
          };
        })
        .filter(Boolean) as Array<{
        course: DashboardCourse;
        assignment: DashboardAssignment;
        recommendation: RecommendationType;
        score: number | null;
      }>
    );
  }, [derivedCourses]);

  const reviewTopics = useMemo(() => {
    return recommendedAssignments.map((item) => ({
      id: `${item.course.id}-${item.assignment.id}`,
      topic: item.assignment.topic || item.assignment.title,
      level: item.recommendation === 'review' ? 'danger' : 'warning',
    }));
  }, [recommendedAssignments]);

  const nextBest = useMemo(() => {
    if (recommendedAssignments.length === 0) return null;
    return [...recommendedAssignments].sort(
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
            <Text style={[styles.pageTitle, { fontSize: titleSize, paddingBottom: 0 }]}>
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
                <Text style={[styles.bannerDay, { fontSize: isMobile ? 13 : 14 }]}>
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
            <Text style={[styles.sectionTitle, { fontSize: isMobile ? 17 : 18 }]}>
              Support Activities for Weak Topics
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { fontSize: isMobile ? 13 : 14 },
              ]}
            >
              Open an assignment directly or generate a follow-up activity for any graded topic
              below 75%.
            </Text>

            <View style={styles.recommendationList}>
              {recommendedAssignments.length === 0 ? (
                <Text style={styles.emptyStateText}>No recommendations available yet.</Text>
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
                        Weak topic: {item.assignment.topic || item.assignment.title}
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
                          style={[styles.smallActionBtn, { backgroundColor: '#D32F2F' }]}
                          onPress={() =>
                            onOpenGeneratedActivity?.(item.course, item.assignment)
                          }
                        >
                          <Text style={styles.smallActionBtnText}>Generate Activity</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.smallActionBtn, { backgroundColor: '#444' }]}
                          onPress={() => onOpenAssignments?.(item.course)}
                        >
                          <Text style={styles.smallActionBtnText}>Open Assignment</Text>
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
            Course Progress Overview
          </Text>

          <View
            style={[
              styles.courseGrid,
              isTablet && styles.courseGridTablet,
              isLargeScreen && styles.courseGridLarge,
            ]}
          >
            {derivedCourses.map((item) => {
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
                    <Text style={styles.courseInstructor}>{item.course.instructor}</Text>
                    <Text style={styles.courseSubMeta}>
                      {item.course.semester} ({item.course.schoolYear})
                    </Text>
                    <Text style={styles.courseSubMeta}>{item.course.section}</Text>

                    <View style={styles.courseMetaBlock}>
                      <Text style={styles.courseMetaLabel}>Course code</Text>
                      <Text style={styles.courseMetaValue}>{item.course.code}</Text>
                    </View>

                    <View style={styles.courseMetaGrid}>
                      <View style={styles.courseMiniStat}>
                        <Text style={styles.courseMetaLabel}>Assignments</Text>
                        <Text style={styles.courseMetaValue}>{item.totalAssignments}</Text>
                      </View>

                      <View style={styles.courseMiniStat}>
                        <Text style={styles.courseMetaLabel}>Graded</Text>
                        <Text style={styles.courseMetaValue}>
                          {item.gradedAssignmentsCount}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.courseMetaGrid}>
                      <View style={styles.courseMiniStat}>
                        <Text style={styles.courseMetaLabel}>Weak Topics</Text>
                        <Text style={styles.courseMetaValue}>{item.weakTopicsCount}</Text>
                      </View>

                      <View style={styles.courseMiniStat}>
                        <Text style={styles.courseMetaLabel}>Average Score</Text>
                        <Text style={styles.courseMetaValue}>
                          {item.averageScore !== null ? `${item.averageScore}%` : 'N/A'}
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

                    <View style={styles.courseMetaBlock}>
                      <Text style={styles.courseMetaLabel}>Weak Topic List</Text>
                      <Text style={styles.courseMetaValue}>
                        {item.weakTopicsCount > 0
                          ? item.weakTopics.join(', ')
                          : 'None'}
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

          <Text
            style={[
              styles.pageTitle,
              {
                fontSize: titleSize,
                marginTop: sectionSpacing,
              },
            ]}
          >
            Weak Topics
          </Text>

          <View style={styles.topicRow}>
            {reviewTopics.length === 0 ? (
              <Text style={styles.emptyStateText}>No review topics yet.</Text>
            ) : (
              reviewTopics.map((topic) => (
                <View
                  key={topic.id}
                  style={[
                    topic.level === 'danger'
                      ? styles.topicChipDanger
                      : styles.topicChipWarning,
                    {
                      paddingHorizontal: isMobile ? 12 : 14,
                      paddingVertical: isMobile ? 8 : 10,
                    },
                  ]}
                >
                  <Text
                    style={[
                      topic.level === 'danger'
                        ? styles.topicChipTextLight
                        : styles.topicChipTextDark,
                      { fontSize: isMobile ? 13 : 14 },
                    ]}
                  >
                    {topic.topic}
                  </Text>
                </View>
              ))
            )}
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
                <Text style={[styles.lessonTitle, { fontSize: isMobile ? 15 : 16 }]}>
                  {nextBest.assignment.topic || nextBest.assignment.title}
                </Text>
                <Text
                  style={[styles.lessonSubtitle, { fontSize: isMobile ? 13 : 14 }]}
                >
                  Recommended next step in {nextBest.course.name}. Open materials related
                  to this topic.
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.emptyStateText}>No next lesson recommendation yet.</Text>
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
            Generated Practice Suggestions
          </Text>

          <View
            style={[
              styles.practiceGrid,
              isTablet && styles.practiceGridTablet,
              isLargeScreen && styles.practiceGridLarge,
            ]}
          >
            {recommendedAssignments.length === 0 ? (
              <Text style={styles.emptyStateText}>No practice cards yet.</Text>
            ) : (
              recommendedAssignments.map((item) => (
                <TouchableOpacity
                  key={`practice-${item.course.id}-${item.assignment.id}`}
                  style={[
                    styles.practiceCard,
                    {
                      padding: isMobile ? 14 : 16,
                      width: isMobile ? '100%' : isLargeScreen ? '49%' : '48.5%',
                    },
                  ]}
                  onPress={() =>
                    onOpenGeneratedActivity?.(item.course, item.assignment)
                  }
                >
                  <Text style={[styles.practiceTitle, { fontSize: isMobile ? 14 : 15 }]}>
                    {item.assignment.topic || item.assignment.title}
                  </Text>
                  <Text
                    style={[styles.practiceSubtitle, { fontSize: isMobile ? 12 : 13 }]}
                  >
                    {getRecommendationLabel(item.recommendation)} • {item.course.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setJoinModalVisible(false)}>
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
                  onChangeText={setClassCode}
                  placeholder="Enter class code"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.classCodeInput}
                />

                <View style={styles.joinDropdownActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
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
                      !classCode.trim() && styles.confirmButtonDisabled,
                    ]}
                    onPress={handleJoinClass}
                    disabled={!classCode.trim()}
                  >
                    <Text style={styles.confirmButtonText}>Join Now</Text>
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
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  topicChipDanger: {
    backgroundColor: '#D32F2F',
    borderRadius: 999,
  },
  topicChipWarning: {
    backgroundColor: '#FFE0B2',
    borderRadius: 999,
  },
  topicChipTextLight: {
    color: '#FFF',
    fontWeight: '700',
  },
  topicChipTextDark: {
    color: '#333',
    fontWeight: '700',
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
  practiceGrid: {
    gap: 12,
  },
  practiceGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  practiceGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  practiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  practiceTitle: {
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  practiceSubtitle: {
    color: '#666',
  },
  emptyStateText: {
    color: '#777',
    fontSize: 14,
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