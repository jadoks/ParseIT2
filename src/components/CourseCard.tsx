import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
  materials: CourseCardMaterial[];
  assignments: CourseCardAssignment[];
  section?: string;
}

interface CourseCardProps {
  course: CourseCardCourse;
  onPress?: (course: CourseCardCourse) => void;
  onAssignmentPress?: (course: CourseCardCourse) => void;
  onMaterialsPress?: (course: CourseCardCourse) => void;
  onGeneratePress?: (course: CourseCardCourse, assignment: CourseCardAssignment) => void;
}

type RecommendationType = 'review' | 'practice' | 'advanced';

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
  onAssignmentPress,
  onMaterialsPress,
  onGeneratePress,
}) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  const [dropdownVisible, setDropdownVisible] = useState(false);

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

  const analytics = useMemo(() => {
    const gradedAssignments = course.assignments.filter((a) => a.status === 'graded');

    const weakestAssignment =
      gradedAssignments.length > 0
        ? [...gradedAssignments].sort((a, b) => {
            const aScore = getScorePercent(a) ?? 999;
            const bScore = getScorePercent(b) ?? 999;
            return aScore - bScore;
          })[0]
        : null;

    const averageScore =
      gradedAssignments.length > 0
        ? Math.round(
            gradedAssignments.reduce((sum, item) => {
              return sum + (getScorePercent(item) ?? 0);
            }, 0) / gradedAssignments.length
          )
        : null;

    const supportAssignments = gradedAssignments.filter((a) => {
      const type = getRecommendationType(a);
      return type === 'review' || type === 'practice';
    });

    return {
      weakestAssignment,
      averageScore,
      supportCount: supportAssignments.length,
    };
  }, [course]);

  const weakestRecommendation = analytics.weakestAssignment
    ? getRecommendationType(analytics.weakestAssignment)
    : null;

  const topColor = weakestRecommendation
    ? getRecommendationColor(weakestRecommendation)
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

  const getCourseImage = () => {
    const imageMap: { [key: string]: any } = {
      'CC111 – Introduction to Computing': require('../../assets/parseclass/CC111.jpg'),
      'CC112 – Data Structures and Algorithms': require('../../assets/parseclass/CC112.jpg'),
      'PC121 – Discrete Mathematics': require('../../assets/parseclass/PC121.jpg'),
      'GEC-US – Understanding the Self': require('../../assets/parseclass/GEC-US.jpg'),
      'NSTP1 – Civic Welfare Training Service': require('../../assets/parseclass/NSTP1.jpg'),
      'PATHFIT2 – Exercise-Based Fitness Activities': require('../../assets/parseclass/PATHFIT2.jpg'),
      'Web Development 101': require('../../assets/parseclass/AP1.jpg'),
      'Programming Logic': require('../../assets/parseclass/AP1.jpg'),
      'Computer Fundamentals': require('../../assets/parseclass/AP1.jpg'),
    };

    return imageMap[course.name] || require('../../assets/parseclass/AP1.jpg');
  };

  const handleGenerate = () => {
    if (!analytics.weakestAssignment) {
      Alert.alert('Not available', 'No graded assignment found for this course yet.');
      return;
    }

    onGeneratePress?.(course, analytics.weakestAssignment);
  };

  const handleLeave = () => {
    setDropdownVisible(false);
    Alert.alert('Leave course', `You clicked leave for ${course.name}.`);
  };

  return (
    <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
      <View>
        <TouchableOpacity
          style={[styles.card, { width: cardWidth, borderBottomColor: topColor }]}
          activeOpacity={0.92}
          onPress={() => onPress?.(course)}
        >
          <View style={{ height: bannerHeight }}>
            <Image
              source={getCourseImage()}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>{course.name}</Text>
              <Text style={styles.sectionLabel}>
                {course.code}
                {course.section ? ` • ${course.section}` : ''}
              </Text>
              <Text style={styles.bannerInstructor}>{course.instructor}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Weakest topic</Text>
              <Text style={styles.metaValue}>
                {analytics.weakestAssignment?.topic || 'No graded topic yet'}
              </Text>
            </View>

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

            {analytics.weakestAssignment && weakestRecommendation && (
              <View
                style={[
                  styles.supportBadge,
                  { backgroundColor: `${getRecommendationColor(weakestRecommendation)}18` },
                ]}
              >
                <Text
                  style={[
                    styles.supportBadgeText,
                    { color: getRecommendationColor(weakestRecommendation) },
                  ]}
                >
                  {analytics.supportCount > 0
                    ? `${analytics.supportCount} support activit${
                        analytics.supportCount > 1 ? 'ies' : 'y'
                      } available`
                    : getRecommendationLabel(weakestRecommendation)}
                </Text>
              </View>
            )}

            
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      

              

              <View style={{ position: 'relative', marginLeft: 8 }}>
                <TouchableOpacity onPress={() => setDropdownVisible(!dropdownVisible)}>
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={22}
                    color="#5f6368"
                  />
                </TouchableOpacity>

                {dropdownVisible && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity style={styles.menuItem} onPress={handleLeave}>
                      <MaterialCommunityIcons
                        name="exit-to-app"
                        size={16}
                        color="#E53935"
                      />
                      <Text style={styles.menuText}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
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
  cardButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  cardActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },
  cardActionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: -50,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 2,
    minWidth: 50,
    elevation: 6,
    borderColor: '#E53935',
    borderWidth: 1.5,
    zIndex: 999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  menuText: {
    color: '#E53935',
    fontWeight: '600',
  },
});

export default CourseCard;