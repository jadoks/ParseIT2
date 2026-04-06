import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const assignmentSubmissions = useMemo(() => {
    if (!currentAssignment) return [];
    return submissions.filter(
      (item) => item.assignmentId === currentAssignment.id
    );
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
      case 'pending':
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
      <View style={styles.membersHeader}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name="chevron-left" size={35} color="#000" />
        </TouchableOpacity>

        <Text style={styles.membersTitle}>Submissions</Text>

        <TouchableOpacity style={styles.updateInfoTrigger} onPress={onOpenUpdate}>
          <MaterialCommunityIcons name="information" size={24} color="#C62828" />
          <Text style={styles.updateText}>Update</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.analyticsRow}>
        <Text style={styles.completedText}>
          {completedCount} out of {members.length} completed
        </Text>
        <View style={styles.progressCircle}>
          <Text style={styles.percentText}>{completionPercent} %</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {members.map((student) => {
          const submission = getStudentSubmission(student.id);

          return (
            <View key={student.id} style={styles.studentCardWide}>
              <View style={styles.studentRedAccent} />
              <View style={styles.studentInfo}>
                <View style={styles.studentTopRow}>
                  <Text style={styles.studentId}>{student.id}</Text>
                  <View
                    style={[
                      styles.lateDot,
                      { backgroundColor: getDotColor(submission?.status) },
                    ]}
                  />
                </View>

                <Text style={styles.studentName}>{student.name}</Text>

                <Text style={styles.gradeRatio}>
                  {submission?.score ?? 0}/{currentAssignment?.totalScore || 0}
                </Text>

                <Text style={styles.statusText}>
                  {getStatusText(submission?.status)}
                </Text>

                {!!submission?.submittedAt && (
                  <Text style={styles.dateText}>
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
  container: { flex: 1, backgroundColor: '#FFF' },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'space-between',
  },
  membersTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginLeft: 10,
  },
  updateInfoTrigger: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  updateText: { fontSize: 14, fontWeight: '500' },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginVertical: 15,
  },
  completedText: { fontSize: 18, color: '#555' },
  progressCircle: {
    width: 75,
    height: 75,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  scrollContent: {
    padding: 25,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  studentCardWide: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    minHeight: 105,
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 15,
    width: '48%',
    alignSelf: 'flex-start',
  },
  studentRedAccent: {
    width: 4,
    height: '100%',
    backgroundColor: '#C62828',
    alignSelf: 'center',
    borderRadius: 5,
    marginLeft: 3,
  },
  studentInfo: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  studentTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  studentId: { fontSize: 14, color: '#999' },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#444', marginTop: 5 },
  lateDot: { width: 10, height: 10, borderRadius: 5 },
  gradeRatio: { color: '#888', marginTop: 6, fontWeight: '600' },
  statusText: { color: '#666', marginTop: 4, fontSize: 12, fontWeight: '600' },
  dateText: { color: '#999', marginTop: 4, fontSize: 11 },
});