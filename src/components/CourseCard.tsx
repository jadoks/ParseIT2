import Constants from 'expo-constants';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface CourseCardMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  uploadedDate: string;
}

export interface CourseCardAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
}

export interface CourseCardCourse {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  semester: string;
  schoolYear: string;
  materials: CourseCardMaterial[];
  assignments: CourseCardAssignment[];
  section?: string;
  bannerUrl?: string | null;
  bannerStoragePath?: string | null;
  bannerFileName?: string | null;
  bannerMimeType?: string | null;
}

interface CourseCardProps {
  course: CourseCardCourse;
  onPress?: (course: CourseCardCourse) => void;
  onAssignmentPress?: (course: CourseCardCourse) => void;
  onMaterialsPress?: (course: CourseCardCourse) => void;
  onGeneratePress?: (course: CourseCardCourse, assignment: CourseCardAssignment) => void;
  completedActivityScores?: Record<
    string,
    {
      scorePercent?: number | null;
      assessmentScorePercent?: number | null;
      completed?: boolean;
      mastered?: boolean;
      status?: string;
      activityScore?: {
        percent?: number | null;
      } | null;
    }
  >;
}

type RecommendationType = 'review' | 'practice' | 'advanced';

type DropdownState =
  | {
      x: number;
      y: number;
    }
  | null;


function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  const host = possibleHost.split(':')[0];

  if (host) {
    return `http://${host}:5000`;
  }

  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

const DROPDOWN_WIDTH = 170;

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
  completedActivityScores = {},
}) => {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  const [dropdownState, setDropdownState] = useState<DropdownState>(null);
  const [signedBannerUrl, setSignedBannerUrl] = useState<string | null>(null);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);

  const getScorePercent = (assignment: CourseCardAssignment) => {
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
    assignment: CourseCardAssignment
  ): RecommendationType | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 75) return 'practice';
    return null;
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

  const getRelatedMaterials = (assignment?: CourseCardAssignment | null) => {
    if (!assignment?.materialIds?.length) return [];

    return course.materials.filter((material) =>
      assignment.materialIds?.includes(material.id)
    );
  };

  const getRelatedMaterialTitle = (assignment?: CourseCardAssignment | null) => {
    const relatedMaterials = getRelatedMaterials(assignment);

    return (
      relatedMaterials.map((material) => material.title).join(', ') ||
      assignment?.topic ||
      assignment?.title ||
      'No related material yet'
    );
  };

  const getCompletedActivityScorePercent = (assignment: CourseCardAssignment) => {
    const activityScore = completedActivityScores[assignment.id];

    if (!activityScore) return null;

    if (Number.isFinite(Number(activityScore.scorePercent))) {
      return Number(activityScore.scorePercent);
    }

    if (Number.isFinite(Number(activityScore.assessmentScorePercent))) {
      return Number(activityScore.assessmentScorePercent);
    }

    if (Number.isFinite(Number(activityScore.activityScore?.percent))) {
      return Number(activityScore.activityScore?.percent);
    }

    return null;
  };

  const hasMasteredGeneratedActivity = (assignment: CourseCardAssignment) => {
    const activityScore = completedActivityScores[assignment.id];
    const scorePercent = getCompletedActivityScorePercent(assignment);

    return (
      activityScore?.mastered === true ||
      (!!activityScore?.completed && scorePercent !== null && scorePercent >= 75) ||
      (activityScore?.status === 'completed' && scorePercent !== null && scorePercent >= 75)
    );
  };

  const analytics = useMemo(() => {
    const gradedAssignments = course.assignments.filter((a) => a.status === 'graded');

    const averageScore =
      gradedAssignments.length > 0
        ? Math.round(
            gradedAssignments.reduce((sum, item) => {
              return sum + (getScorePercent(item) ?? 0);
            }, 0) / gradedAssignments.length
          )
        : null;

    const supportAssignments = gradedAssignments
      .filter((assignment) => {
        const score = getScorePercent(assignment);
        const type = getRecommendationType(assignment);

        return (
          score !== null &&
          score < 75 &&
          (type === 'review' || type === 'practice') &&
          assignment.materialIds?.length &&
          !hasMasteredGeneratedActivity(assignment)
        );
      })
      .sort((a, b) => {
        const aScore = getScorePercent(a) ?? 999;
        const bScore = getScorePercent(b) ?? 999;
        return aScore - bScore;
      });

    const recommendedAssignment = supportAssignments[0] || null;
    const recommendedRelatedMaterials = getRelatedMaterials(recommendedAssignment);
    const recommendedRelatedMaterialTitle =
      recommendedAssignment ? getRelatedMaterialTitle(recommendedAssignment) : null;

    return {
      recommendedAssignment,
      recommendedRelatedMaterials,
      recommendedRelatedMaterialTitle,
      averageScore,
      supportCount: supportAssignments.length,
    };
  }, [course, completedActivityScores]);

  const recommendedRecommendation = analytics.recommendedAssignment
    ? getRecommendationType(analytics.recommendedAssignment)
    : null;

  const topColor = recommendedRecommendation
    ? getRecommendationColor(recommendedRecommendation)
    : '#2E7D32';

  const horizontalPadding = 16;
  const gap = 16;

  let cols: number;
  if (isLargeTablet) cols = 4;
  else if (isTablet) cols = 3;
  else if (width >= 500) cols = 2;
  else cols = 1;

  const cardWidth =
    cols === 1
      ? width - horizontalPadding * 2
      : Math.max(
          220,
          Math.floor((width - horizontalPadding * 2 - gap * (cols - 1)) / cols)
        );

  const bannerHeight = isSmallScreen ? 120 : 140;

  useEffect(() => {
    let isMounted = true;

    const loadSignedBannerUrl = async () => {
      setBannerLoadFailed(false);
      setSignedBannerUrl(null);

      if (!course.bannerStoragePath) {
        return;
      }

      try {
        const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storagePath: course.bannerStoragePath,
            classId: course.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load class banner.');
        }

        if (isMounted && data?.url) {
          setSignedBannerUrl(data.url);
        }
      } catch (error) {
        if (isMounted) {
          setBannerLoadFailed(true);
        }
      }
    };

    loadSignedBannerUrl();

    return () => {
      isMounted = false;
    };
  }, [course.id, course.bannerStoragePath]);

  const getCourseImage = () => {
    const imageMap: { [key: string]: any } = {
      'CC111 – Introduction to Computing': require('../../assets/parseclass/CC111.jpg'),
      'CC112 – Data Structures and Algorithms': require('../../assets/parseclass/CC112.jpg'),
      'PC121 – Discrete Mathematics': require('../../assets/parseclass/PC121.jpg'),
      'GEC-US – Understanding the Self': require('../../assets/parseclass/GEC-US.jpg'),
      'NSTP1 – Civic Welfare Training Service': require('../../assets/parseclass/NSTP1.jpg'),
      'PATHFIT2 – Exercise-Based Fitness Activities': require('../../assets/parseclass/PATHFIT2.jpg'),
      'Web Development': require('../../assets/parseclass/AP1.jpg'),
      'Programming Logic': require('../../assets/parseclass/AP1.jpg'),
      'Computer Fundamentals': require('../../assets/parseclass/AP1.jpg'),
    };

    if (signedBannerUrl && !bannerLoadFailed) {
      return { uri: signedBannerUrl };
    }

    if (course.bannerUrl && !bannerLoadFailed) {
      return { uri: course.bannerUrl };
    }

    return imageMap[course.name] || require('../../assets/parseclass/AP1.jpg');
  };

  const handleLeave = () => {
    closeDropdown();
    Alert.alert('Leave course', `You clicked leave for ${course.name}.`);
  };

  const openDropdown = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;

    const left = Math.min(
      Math.max(12, pageX - DROPDOWN_WIDTH + 24),
      width - DROPDOWN_WIDTH - 12
    );

    const top = Math.min(pageY + 8, height - 170);

    setDropdownState({
      x: left,
      y: top,
    });
  };

  const closeDropdown = () => {
    setDropdownState(null);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { width: cardWidth, borderBottomColor: topColor }]}
        activeOpacity={0.92}
        onPress={() => {
          closeDropdown();
          onPress?.(course);
        }}
      >
        <View style={{ height: bannerHeight }}>
          <Image
            source={getCourseImage()}
            style={styles.bannerImage}
            resizeMode="cover"
            onError={() => setBannerLoadFailed(true)}
          />
          <View style={styles.overlay} />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>{course.name}</Text>
            <Text style={styles.sectionLabel}>
              {course.code}
              {course.section ? ` • ${course.section}` : ''}
            </Text>
            <Text style={styles.bannerMeta}>
              {course.semester} ({course.schoolYear})
            </Text>
            <Text style={styles.bannerInstructor}>{course.instructor}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {analytics.recommendedAssignment ? (
            <>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Recommended material</Text>
                <Text style={styles.metaValue}>
                  {analytics.recommendedRelatedMaterialTitle}
                </Text>
              </View>

              {getScorePercent(analytics.recommendedAssignment) !== null && (
                <Text style={styles.weakScoreText}>
                  Based on assignment score: {getScorePercent(analytics.recommendedAssignment)}%
                </Text>
              )}
            </>
          ) : (
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Learning status</Text>
              <Text style={styles.metaValue}>No pending support activity</Text>
            </View>
          )}

          <View style={styles.metaBlockRow}>
            <View style={styles.metaBlockHalf}>
              <Text style={styles.metaLabel}>Average</Text>
              <Text style={styles.metaValue}>
                {analytics.averageScore !== null ? `${analytics.averageScore}%` : 'N/A'}
              </Text>
            </View>

            <View style={styles.metaBlockHalf}>
              <Text style={styles.metaLabel}>Materials</Text>
              <Text style={styles.metaValue}>{course.materials.length}</Text>
            </View>
          </View>

          {analytics.recommendedAssignment && recommendedRecommendation ? (
            <View
              style={[
                styles.supportBadge,
                { backgroundColor: `${getRecommendationColor(recommendedRecommendation)}18` },
              ]}
            >
              <Text
                style={[
                  styles.supportBadgeText,
                  { color: getRecommendationColor(recommendedRecommendation) },
                ]}
              >
                {analytics.supportCount > 0
                  ? `${analytics.supportCount} material-based support activit${analytics.supportCount > 1 ? 'ies' : 'y'} available`
                  : getRecommendationLabel(recommendedRecommendation)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={openDropdown}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={22}
              color="#5f6368"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <Modal
        visible={!!dropdownState}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles.dropdownBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View>
                {dropdownState && (
                  <View
                    style={[
                      styles.dropdownMenuFloating,
                      {
                        top: dropdownState.y,
                        left: dropdownState.x,
                        width: DROPDOWN_WIDTH,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.dropdownMenuItem}
                      activeOpacity={0.8}
                      onPress={handleLeave}
                    >
                      <View style={styles.dropdownIconRed}>
                        <MaterialCommunityIcons
                          name="exit-to-app"
                          size={13}
                          color="#fff"
                        />
                      </View>
                      <Text style={[styles.dropdownMenuText, styles.dropdownDangerText]}>
                        Leave Course
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderBottomWidth: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerTextContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  bannerInstructor: {
    color: '#eee',
    fontSize: 13,
    marginTop: 2,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  metaBlock: {
    marginBottom: 10,
  },
  weakScoreText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 10,
  },
  metaBlockRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  metaBlockHalf: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
  },
  supportBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  supportBadgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  masteredBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: '#E8F5E9',
  },
  masteredBadgeText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#2E7D32',
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 6,
    borderRadius: 999,
  },

  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenuFloating: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dropdownMenuText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
  },
  dropdownDangerText: {
    color: '#D32F2F',
  },
  dropdownIconRed: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CourseCard;
