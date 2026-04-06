import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Assignment } from './TeacherCourseDetail2';

type Props = {
  assignments: Assignment[];
  onCreate: () => void;
  onOpenMembers: (id: string) => void;
};

const TeacherAssignmentSection = ({ assignments, onCreate, onOpenMembers }: Props) => {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity style={styles.createBtn} onPress={onCreate}>
        <Text style={styles.createBtnText}>+ Create Assignment</Text>
      </TouchableOpacity>

      {assignments.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.assignmentCardWide}
          onPress={() => onOpenMembers(item.id)}
        >
          <View style={styles.redLeftAccentAssignment} />
          <View style={styles.assignmentInner}>
            <View style={styles.assignmentTopRow}>
              <Text style={styles.assignmentTitle}>{item.header}</Text>
              <Text style={styles.assignmentPostedDate}>{item.posted}</Text>
            </View>

            <View style={styles.separator} />

            <Text style={styles.instructionText}>{item.instruction}</Text>
            <Text style={styles.dueText}>Due: {item.dueDate}</Text>
            <Text style={styles.pointsText}>Total Score: {item.totalScore}</Text>
            <Text style={styles.pointsOnTimeText}>Points On Time: {item.pointsOnTime}</Text>
            <Text style={styles.repositoryText}>
              Repository: {item.repositoryDisabledAfterDue ? 'Disabled after due' : 'Enabled'}
            </Text>

            {!!item.fileName && (
              <Text style={styles.fileText}>File: {item.fileName}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default TeacherAssignmentSection;

const styles = StyleSheet.create({
  scrollContent: {
    padding: 25,
    alignItems: 'flex-start',
  },
  createBtn: {
    backgroundColor: '#C62828',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  createBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  assignmentCardWide: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: 160,
    width: '48%',
    alignSelf: 'flex-start',
  },
  redLeftAccentAssignment: {
    width: 4,
    backgroundColor: '#C62828',
    height: '100%',
  },
  assignmentInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  assignmentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 0.7,
  },
  assignmentPostedDate: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
    flex: 0.3,
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEEEE',
    width: '100%',
    marginVertical: 12,
  },
  instructionText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    lineHeight: 18,
  },
  dueText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  pointsText: {
    fontSize: 14,
    color: '#444',
    fontWeight: '600',
    marginTop: 8,
  },
  pointsOnTimeText: {
    fontSize: 14,
    color: '#444',
    fontWeight: '600',
    marginTop: 8,
  },
  repositoryText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 8,
  },
  fileText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 8,
  },
});