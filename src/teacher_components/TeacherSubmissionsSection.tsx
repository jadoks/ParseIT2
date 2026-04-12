import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Assignment, Member, Submission } from './TeacherCourseDetail2';

type Props = {
  members: Member[];
  currentAssignment?: Assignment;
  submissions: Submission[];
  onBack: () => void;
  onOpenUpdate: () => void;
};

const TeacherSubmissionsSection = ({
  members,
  currentAssignment,
  submissions,
  onBack,
  onOpenUpdate,
}: Props) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  // ✅ CONSISTENT TOP SPACE (same as CourseDetail)
  const mobileTopSpace = isMobile ? insets.top + 0 : 0;

  const pagePadding = isMobile ? 14 : isTablet ? 20 : 24;
  const cardWidth = isMobile ? '100%' : isLargeScreen ? '48.8%' : '48.5%';

  const assignmentSubmissions = useMemo(() => {
    if (!currentAssignment) return [];
    return submissions.filter((item) => item.assignmentId === currentAssignment.id);
  }, [submissions, currentAssignment]);

  const completedCount = assignmentSubmissions.filter(
    (item) =>
      item.status === 'submitted' ||
      item.status === 'graded' ||
      item.status === 'late'
  ).length;

  const completionPercent =
    members.length > 0 ? Math.round((completedCount / members.length) * 100) : 0;

  const getStudentSubmission = (studentId: string) => {
    return assignmentSubmissions.find((item) => item.studentId === studentId);
  };

  const getDotColor = (status?: Submission['status']) => {
    switch (status) {
      case 'graded':
        return '#4CAF50';
      case 'submitted':
        return '#2196F3';
      case 'late':
        return '#F44336';
      default:
        return '#BDBDBD';
    }
  };

  const getStatusText = (status?: Submission['status']) => {
    switch (status) {
      case 'graded':
        return 'Graded';
      case 'submitted':
        return 'Submitted';
      case 'late':
        return 'Late';
      case 'pending':
        return 'Pending';
      default:
        return 'No submission';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ ADDED TOP SPACE */}
      {isMobile ? <View style={{ height: mobileTopSpace }} /> : null}

      <View
        style={[
          styles.membersHeader,
          {
            paddingHorizontal: pagePadding,
            paddingTop: isMobile ? 16 : 20,
            paddingBottom: isMobile ? 12 : 16,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={isMobile ? 30 : 35}
            color="#000"
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.membersTitle,
            { fontSize: isMobile ? 24 : isTablet ? 28 : 32 },
          ]}
          numberOfLines={1}
        >
          Submissions
        </Text>

        <TouchableOpacity style={styles.updateInfoTrigger} onPress={onOpenUpdate}>
          <MaterialCommunityIcons name="information" size={22} color="#D32F2F" />
          <Text style={styles.updateText}>Update</Text>
        </TouchableOpacity>
      </View>

      {/* rest of your code unchanged */}

      <View
        style={[
          styles.analyticsRow,
          {
            paddingHorizontal: pagePadding,
            marginTop: 2,
            marginBottom: isMobile ? 14 : 18,
          },
        ]}
      >
        <Text
          style={[
            styles.completedText,
            { fontSize: isMobile ? 15 : 18 },
          ]}
        >
          {completedCount} out of {members.length} completed
        </Text>

        <View
          style={[
            styles.progressCircle,
            {
              width: isMobile ? 64 : 75,
              height: isMobile ? 64 : 75,
              borderRadius: isMobile ? 32 : 40,
              borderWidth: isMobile ? 8 : 10,
            },
          ]}
        >
          <Text
            style={[
              styles.percentText,
              { fontSize: isMobile ? 14 : 16 },
            ]}
          >
            {completionPercent}%
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: pagePadding,
            paddingBottom: 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {members.map((student) => {
          const submission = getStudentSubmission(student.id);

          return (
            <View
              key={student.id}
              style={[
                styles.studentCardWide,
                {
                  width: cardWidth,
                  minHeight: isMobile ? 108 : 115,
                },
              ]}
            >
              <View style={styles.studentRedAccent} />

              <View
                style={[
                  styles.studentInfo,
                  {
                    paddingHorizontal: isMobile ? 14 : 18,
                    paddingVertical: isMobile ? 14 : 16,
                  },
                ]}
              >
                <View style={styles.studentTopRow}>
                  <Text
                    style={[
                      styles.studentId,
                      { fontSize: isMobile ? 12 : 14 },
                    ]}
                  >
                    {student.id}
                  </Text>

                  <View
                    style={[
                      styles.lateDot,
                      { backgroundColor: getDotColor(submission?.status) },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.studentName,
                    { fontSize: isMobile ? 16 : 18 },
                  ]}
                  numberOfLines={1}
                >
                  {student.name}
                </Text>

                <Text style={styles.gradeRatio}>
                  {submission?.score ?? 0}/{currentAssignment?.totalScore || 0}
                </Text>

                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        submission?.status === 'graded'
                          ? '#4CAF50'
                          : submission?.status === 'submitted'
                          ? '#2196F3'
                          : submission?.status === 'late'
                          ? '#F44336'
                          : '#666',
                    },
                  ]}
                >
                  {getStatusText(submission?.status)}
                </Text>

                {!!submission?.submittedAt && (
                  <Text style={styles.dateText} numberOfLines={1}>
                    Submitted: {submission.submittedAt}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeacherSubmissionsSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backBtn: {
    marginRight: 8,
    padding: 2,
  },

  membersTitle: {
    fontWeight: '700',
    color: '#111',
    flex: 1,
    marginLeft: 6,
  },

  updateInfoTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 10,
  },

  updateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },

  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  completedText: {
    color: '#555',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },

  progressCircle: {
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },

  percentText: {
    fontWeight: '700',
    color: '#4CAF50',
  },

  scrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },

  studentCardWide: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ECECEC',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
    marginBottom: 2,
  },

  studentRedAccent: {
    width: 4,
    backgroundColor: '#D32F2F',
  },

  studentInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  studentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  studentId: {
    color: '#999',
    fontWeight: '500',
  },

  studentName: {
    fontWeight: '700',
    color: '#222',
    marginTop: 5,
  },

  lateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  gradeRatio: {
    color: '#666',
    marginTop: 6,
    fontWeight: '600',
    fontSize: 13,
  },

  statusText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },

  dateText: {
    color: '#999',
    marginTop: 4,
    fontSize: 11,
  },
});