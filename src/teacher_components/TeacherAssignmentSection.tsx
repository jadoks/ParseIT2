import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { Assignment } from './TeacherCourseDetail2';

type Props = {
  assignments: Assignment[];
  onCreate: () => void;
  onOpenMembers: (id: string) => void;
};

const TeacherAssignmentSection = ({
  assignments,
  onCreate,
  onOpenMembers,
}: Props) => {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;

  const renderAssignmentItem = ({ item }: { item: Assignment }) => (
    <TouchableOpacity
      style={styles.assignmentCard}
      activeOpacity={0.85}
      onPress={() => onOpenMembers(item.id)}
    >
      <View style={styles.assignmentHeader}>
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentTitle}>{item.header}</Text>

          {!!item.instruction && (
            <Text style={styles.assignmentTopicText} numberOfLines={2}>
              {item.instruction}
            </Text>
          )}
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Open</Text>
        </View>
      </View>

      <View style={styles.assignmentFooter}>
        <Text style={styles.dueDateText}>Due: {item.dueDate || 'No due date'}</Text>
        <Text style={styles.pointsText}>
          Score: {item.totalScore || '0'} • On Time: {item.pointsOnTime || '0'}
        </Text>
      </View>

      {!!item.fileName && (
        <Text style={styles.relatedPreviewText} numberOfLines={1}>
          File: {item.fileName}
        </Text>
      )}

      <View style={styles.recommendationBadge}>
        <Text style={styles.recommendationText}>
          {item.repositoryDisabledAfterDue ? 'Repository disabled after due' : 'Open submissions'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingHorizontal: wp(isSmallPhone ? '3' : '4') }]}>
      <View style={styles.topActionRow}>
        <TouchableOpacity style={styles.createButton} onPress={onCreate}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.createButtonText}>Create Assignment</Text>
        </TouchableOpacity>
      </View>

      {assignments.length > 0 ? (
        <FlatList
          data={assignments}
          renderItem={renderAssignmentItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingBottom: hp('2') }}
        />
      ) : (
        <Text style={styles.emptyText}>No assignments yet</Text>
      )}
    </View>
  );
};

export default TeacherAssignmentSection;

const styles = StyleSheet.create({
  container: {
    paddingVertical: hp('2'),
    backgroundColor: '#F5F5F5',
    flex: 1,
  },

  topActionRow: {
    marginBottom: hp('1.5'),
    alignItems: 'flex-start',
  },

  createButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  createButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },

  assignmentCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#D32F2F',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  assignmentInfo: {
    flex: 1,
    marginRight: 8,
  },

  assignmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },

  assignmentTopicText: {
    color: '#444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FDECEC',
  },

  statusText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#D32F2F',
  },

  assignmentFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
    paddingTop: 8,
  },

  dueDateText: {
    color: '#D32F2F',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
  },

  pointsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },

  relatedPreviewText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },

  recommendationBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F1',
  },

  recommendationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 20,
    fontSize: 14,
  },
});