import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
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
  materials: DashboardMaterial[];
  assignments: DashboardAssignment[];
}

interface DashboardProps {
  announcements?: Announcement[];
  courses?: DashboardCourse[];
  onOpenCourse?: (course: DashboardCourse) => void;
  onOpenAssignments?: (course: DashboardCourse) => void;
  onOpenMaterials?: (course: DashboardCourse) => void;
  onOpenGeneratedActivity?: (course: DashboardCourse, assignment: DashboardAssignment) => void;
}

type RecommendationType = 'review' | 'practice' | 'advanced';

const Dashboard = ({
  announcements = [],
  courses = [],
  onOpenCourse,
  onOpenAssignments,
  onOpenMaterials,
  onOpenGeneratedActivity,
}: DashboardProps) => {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  const pagePadding = isMobile ? 14 : isTablet ? 24 : 32;
  const sectionSpacing = isMobile ? 16 : 20;
  const titleSize = isMobile ? 22 : isTablet ? 24 : 28;
  const bannerHeight = isMobile ? 110 : isTablet ? 125 : 140;
  const contentMaxWidth = isLargeScreen ? 1280 : 1100;

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

  const getRecommendationType = (assignment: DashboardAssignment): RecommendationType | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 80) return 'practice';
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

  const derivedCourses = useMemo(() => {
    return courses.map((course) => {
      const gradedAssignments = course.assignments.filter((a) => a.status === 'graded');
      const weakestGraded =
        gradedAssignments.length > 0
          ? [...gradedAssignments].sort((a, b) => {
              const aScore = getScorePercent(a) ?? 999;
              const bScore = getScorePercent(b) ?? 999;
              return aScore - bScore;
            })[0]
          : null;

      const pendingGenerated = gradedAssignments.filter((a) => {
        const type = getRecommendationType(a);
        return type === 'review' || type === 'practice';
      });

      const averageScore =
        gradedAssignments.length > 0
          ? Math.round(
              gradedAssignments.reduce((sum, item) => sum + (getScorePercent(item) ?? 0), 0) /
                gradedAssignments.length
            )
          : null;

      return {
        course,
        weakestAssignment: weakestGraded,
        pendingGeneratedCount: pendingGenerated.length,
        averageScore,
      };
    });
  }, [courses]);

  const recommendedAssignments = useMemo(() => {
    return derivedCourses
      .map((item) => {
        if (!item.weakestAssignment) return null;
        const recommendation = getRecommendationType(item.weakestAssignment);
        if (!recommendation) return null;

        return {
          course: item.course,
          assignment: item.weakestAssignment,
          recommendation,
          score: getScorePercent(item.weakestAssignment),
        };
      })
      .filter(Boolean) as Array<{
      course: DashboardCourse;
      assignment: DashboardAssignment;
      recommendation: RecommendationType;
      score: number | null;
    }>;
  }, [derivedCourses]);

  const reviewTopics = useMemo(() => {
    return recommendedAssignments
      .filter((item) => item.recommendation !== 'advanced')
      .map((item) => ({
        id: `${item.course.id}-${item.assignment.id}`,
        topic: item.assignment.topic || item.assignment.title,
        level: item.recommendation === 'review' ? 'danger' : 'warning',
      }));
  }, [recommendedAssignments]);

  const nextBest = useMemo(() => {
    if (recommendedAssignments.length === 0) return null;
    return [...recommendedAssignments].sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0];
  }, [recommendedAssignments]);

  return (
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
        <Text style={[styles.pageTitle, { fontSize: titleSize }]}>Announcements</Text>

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
          Recommended for You
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
            Personalized Suggestions
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              { fontSize: isMobile ? 13 : 14 },
            ]}
          >
            These are based on your graded assignments and weaker topics.
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
                        onPress={() => onOpenGeneratedActivity?.(item.course, item.assignment)}
                      >
                        <Text style={styles.smallActionBtnText}>Generate</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: '#444' }]}
                        onPress={() => onOpenAssignments?.(item.course)}
                      >
                        <Text style={styles.smallActionBtnText}>Assignments</Text>
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
          Your Courses
        </Text>

        <View
          style={[
            styles.courseGrid,
            isTablet && styles.courseGridTablet,
            isLargeScreen && styles.courseGridLarge,
          ]}
        >
          {derivedCourses.map((item) => {
            const recommendation =
              item.weakestAssignment ? getRecommendationType(item.weakestAssignment) : null;
            const color = recommendation ? getRecommendationColor(recommendation) : '#2E7D32';

            return (
              <View
                key={item.course.id}
                style={[
                  styles.courseCard,
                  {
                    width: isMobile ? '100%' : isLargeScreen ? '32%' : '48.5%',
                    borderTopColor: color,
                  },
                ]}
              >
                <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenCourse?.(item.course)}>
                  <Text style={styles.courseCardTitle}>{item.course.name}</Text>
                  <Text style={styles.courseInstructor}>{item.course.instructor}</Text>

                  <View style={styles.courseMetaBlock}>
                    <Text style={styles.courseMetaLabel}>Course code</Text>
                    <Text style={styles.courseMetaValue}>{item.course.code}</Text>
                  </View>

                  <View style={styles.courseMetaBlock}>
                    <Text style={styles.courseMetaLabel}>Weakest topic</Text>
                    <Text style={styles.courseMetaValue}>
                      {item.weakestAssignment?.topic || 'No graded topic yet'}
                    </Text>
                  </View>

                  <View style={styles.courseMetaBlock}>
                    <Text style={styles.courseMetaLabel}>Average graded score</Text>
                    <Text style={styles.courseMetaValue}>
                      {item.averageScore !== null ? `${item.averageScore}%` : 'No graded data yet'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.courseBadge,
                      { backgroundColor: item.pendingGeneratedCount > 0 ? color : '#2E7D32' },
                    ]}
                  >
                    <Text style={styles.courseBadgeText}>
                      {item.pendingGeneratedCount > 0
                        ? `${item.pendingGeneratedCount} support activit${
                            item.pendingGeneratedCount > 1 ? 'ies' : 'y'
                          } available`
                        : 'No pending support activity'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardButtonRow}>
                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: '#D32F2F' }]}
                    onPress={() => onOpenCourse?.(item.course)}
                  >
                    <Text style={styles.cardActionBtnText}>Open Course</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: '#555' }]}
                    onPress={() => onOpenAssignments?.(item.course)}
                  >
                    <Text style={styles.cardActionBtnText}>Assignments</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: '#888' }]}
                    onPress={() => onOpenMaterials?.(item.course)}
                  >
                    <Text style={styles.cardActionBtnText}>Materials</Text>
                  </TouchableOpacity>
                </View>
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
          Topics to Review
        </Text>

        <View style={styles.topicRow}>
          {reviewTopics.length === 0 ? (
            <Text style={styles.emptyStateText}>No review topics yet.</Text>
          ) : (
            reviewTopics.map((topic) => (
              <View
                key={topic.id}
                style={[
                  topic.level === 'danger' ? styles.topicChipDanger : styles.topicChipWarning,
                  {
                    paddingHorizontal: isMobile ? 12 : 14,
                    paddingVertical: isMobile ? 8 : 10,
                  },
                ]}
              >
                <Text
                  style={[
                    topic.level === 'danger' ? styles.topicChipTextLight : styles.topicChipTextDark,
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
          Next Best Lesson
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
              <Text style={[styles.lessonSubtitle, { fontSize: isMobile ? 13 : 14 }]}>
                Recommended next step in {nextBest.course.name}. Open materials related to this topic.
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
          Practice Based on Your Progress
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
                onPress={() => onOpenGeneratedActivity?.(item.course, item.assignment)}
              >
                <Text style={[styles.practiceTitle, { fontSize: isMobile ? 14 : 15 }]}>
                  {item.assignment.topic || item.assignment.title}
                </Text>
                <Text style={[styles.practiceSubtitle, { fontSize: isMobile ? 12 : 13 }]}>
                  {getRecommendationLabel(item.recommendation)} • {item.course.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
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
  pageTitle: {
    fontWeight: 'bold',
    paddingBottom: 10,
    textAlign: 'left',
    color: '#111',
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
    marginBottom: 12,
  },
  courseMetaBlock: {
    marginBottom: 10,
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
  cardButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  cardActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  cardActionBtnText: {
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
});

export default Dashboard;