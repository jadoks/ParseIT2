import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export interface AssignmentComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInstructor: boolean;
}

export interface AssignmentFileUpload {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedDate: string;
}

export interface AssignmentMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  uploadedDate: string;
}

export interface AssignmentItem {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
  description?: string;
  comments?: AssignmentComment[];
  files?: AssignmentFileUpload[];
}

export interface AssignmentCourse {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  materials: AssignmentMaterial[];
  assignments: AssignmentItem[];
}

interface FlattenedAssignment extends AssignmentItem {
  courseId: string;
  courseName: string;
  courseCode: string;
  instructor: string;
}

interface AssignmentsProps {
  courses: AssignmentCourse[];
  selectedCourseId?: string | null;
  assignmentComments: Record<string, AssignmentComment[]>;
  assignmentFiles: Record<string, AssignmentFileUpload[]>;
  onAddComment: (assignmentId: string, content: string) => void;
  onAddFile: (assignmentId: string, file: AssignmentFileUpload) => void;
  onRemoveFile: (assignmentId: string, fileId: string) => void;
  onOpenGeneratedActivity?: (course: AssignmentCourse, assignment: AssignmentItem) => void;
}

type FilterType = 'all' | 'pending' | 'submitted' | 'graded';
type RecommendationType = 'review' | 'practice' | 'advanced' | null;

const Assignments = ({
  courses,
  selectedCourseId = null,
  assignmentComments,
  assignmentFiles,
  onAddComment,
  onAddFile,
  onRemoveFile,
  onOpenGeneratedActivity,
}: AssignmentsProps) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<FlattenedAssignment | null>(null);
  const [newComment, setNewComment] = useState('');

  const sourceCourses = useMemo(() => {
    if (!selectedCourseId) return courses;
    return courses.filter((course) => course.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const allAssignments = useMemo<FlattenedAssignment[]>(() => {
    return sourceCourses.flatMap((course) =>
      course.assignments.map((assignment) => ({
        ...assignment,
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        instructor: course.instructor,
        description: assignment.description ?? course.description,
      }))
    );
  }, [sourceCourses]);

  const filteredAssignments =
    filter === 'all' ? allAssignments : allAssignments.filter((a) => a.status === filter);

  const selectedCourse = useMemo(() => {
    if (!selectedCourseId) return null;
    return courses.find((course) => course.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const titleText = selectedCourse ? `${selectedCourse.name} Assignments` : 'All Assignments';

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getScorePercent = (assignment: FlattenedAssignment) => {
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

  const getRecommendationType = (assignment: FlattenedAssignment): RecommendationType => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 75) return 'practice';
    return 'advanced';
  };

  const getRecommendationLabel = (assignment: FlattenedAssignment) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return 'Review Activity';
    if (recommendation === 'practice') return 'Practice Quiz';
    if (recommendation === 'advanced') return 'Advanced Challenge';
    return null;
  };

  const getRecommendationColor = (assignment: FlattenedAssignment) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return '#D32F2F';
    if (recommendation === 'practice') return '#F57C00';
    if (recommendation === 'advanced') return '#2E7D32';
    return '#999';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFE082';
      case 'submitted':
        return '#BBDEFB';
      case 'graded':
        return '#A5D6A7';
      default:
        return '#DDD';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#7A5600';
      case 'submitted':
        return '#0D47A1';
      case 'graded':
        return '#1B5E20';
      default:
        return '#555';
    }
  };

  const getRelatedMaterials = (assignment: FlattenedAssignment) => {
    const course = courses.find((c) => c.id === assignment.courseId);
    if (!course || !assignment.materialIds?.length) return [];
    return course.materials.filter((m) => assignment.materialIds?.includes(m.id));
  };

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;
    onAddComment(selectedAssignment.id, newComment);
    setNewComment('');
  };

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;

    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        onAddFile(selectedAssignment.id, {
          id: `f${Date.now()}`,
          fileName: file.name || 'file',
          fileSize: '1.2 MB',
          uploadedDate: new Date().toLocaleString(),
        });
      }
    } catch (err) {
      console.warn('DocumentPicker error', err);
      Alert.alert('Upload failed', 'Could not open file picker.');
    }
  };

  const handleRemoveAttachment = (assignmentId: string, fileId: string) => {
    onRemoveFile(assignmentId, fileId);
  };

  const closeModal = () => {
    setSelectedAssignment(null);
    setNewComment('');
  };

  const handleSubmitAssignment = () => {
    if (!selectedAssignment) return;

    const files = assignmentFiles[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert('No files', 'Please upload at least one file before submitting.');
      return;
    }

    Alert.alert('Success', `Assignment submitted with ${files.length} file(s).`);
    closeModal();
  };

  const countLabel = useMemo(() => {
    return `${filteredAssignments.length} ${
      filter === 'all' ? 'assignment' : filter
    }${filteredAssignments.length !== 1 ? 's' : ''}`;
  }, [filteredAssignments.length, filter]);

  const renderAssignmentItem = ({ item }: { item: FlattenedAssignment }) => {
    const daysUntil = getDaysUntilDue(item.dueDate);
    const isOverdue = daysUntil < 0;
    const percent = getScorePercent(item);
    const recommendationLabel = getRecommendationLabel(item);

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        activeOpacity={0.85}
        onPress={() => setSelectedAssignment(item)}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.courseName}>
              {item.courseName} • {item.courseCode}
            </Text>
            {!!item.topic && <Text style={styles.topicText}>Topic: {item.topic}</Text>}
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusTextColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.assignmentFooter}>
          <Text style={[styles.dueDateText, isOverdue && styles.overdueText]}>
            Due: {item.dueDate}
          </Text>

          {percent !== null ? (
            <Text style={styles.pointsText}>
              Score: {item.points}/{item.maxPoints} ({percent}%)
            </Text>
          ) : item.points !== undefined && item.maxPoints ? (
            <Text style={styles.pointsText}>
              Points: {item.points}/{item.maxPoints}
            </Text>
          ) : null}
        </View>

        {recommendationLabel && (
          <View
            style={[
              styles.recommendationBadge,
              { backgroundColor: `${getRecommendationColor(item)}18` },
            ]}
          >
            <Text
              style={[
                styles.recommendationText,
                { color: getRecommendationColor(item) },
              ]}
            >
              {recommendationLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingHorizontal: isLargeScreen ? 28 : 16,
        paddingVertical: isLargeScreen ? 24 : 16,
      }}
    >
      <Text style={styles.screenTitle}>{titleText}</Text>

      <View style={styles.filterContainer}>
        {(['all', 'pending', 'submitted', 'graded'] as FilterType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>{countLabel}</Text>

      <FlatList
        data={filteredAssignments}
        renderItem={renderAssignmentItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No assignments available.</Text>}
      />

      <Modal
        visible={selectedAssignment !== null}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalWrapper,
              { width: isLargeScreen ? '72%' : '100%' },
            ]}
          >
            <ScrollView contentContainerStyle={styles.detailContainer}>
              {selectedAssignment && (
                <>
                  <View style={styles.detailHeader}>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.detailTitle}>{selectedAssignment.title}</Text>
                    <View style={{ width: 30 }} />
                  </View>

                  <View style={styles.detailContent}>
                    <View style={styles.infoCard}>
                      <Text style={styles.courseName}>
                        {selectedAssignment.courseName} • {selectedAssignment.courseCode}
                      </Text>
                      {!!selectedAssignment.topic && (
                        <Text style={styles.topicText}>Topic: {selectedAssignment.topic}</Text>
                      )}
                      <Text style={styles.description}>
                        {selectedAssignment.description || 'No description provided.'}
                      </Text>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Instructor:</Text>
                        <Text style={styles.infoValue}>{selectedAssignment.instructor}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Due Date:</Text>
                        <Text style={styles.infoValue}>{selectedAssignment.dueDate}</Text>
                      </View>

                      {selectedAssignment.maxPoints !== undefined && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Points:</Text>
                          <Text style={styles.infoValue}>
                            {selectedAssignment.points}/{selectedAssignment.maxPoints}
                          </Text>
                        </View>
                      )}

                      {getScorePercent(selectedAssignment) !== null && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Score:</Text>
                          <Text
                            style={[
                              styles.infoValue,
                              { color: getRecommendationColor(selectedAssignment) },
                            ]}
                          >
                            {getScorePercent(selectedAssignment)}%
                          </Text>
                        </View>
                      )}

                      {getRecommendationLabel(selectedAssignment) && (
                        <View
                          style={[
                            styles.recommendationBadge,
                            {
                              backgroundColor: `${getRecommendationColor(selectedAssignment)}18`,
                              alignSelf: 'flex-start',
                              marginTop: 10,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.recommendationText,
                              { color: getRecommendationColor(selectedAssignment) },
                            ]}
                          >
                            {getRecommendationLabel(selectedAssignment)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {selectedAssignment.status === 'graded' && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎯 Follow-Up Activity</Text>

                        <TouchableOpacity
                          onPress={() => {
                            const sourceCourse = courses.find(
                              (course) => course.id === selectedAssignment.courseId
                            );
                            if (!sourceCourse) return;

                            closeModal();
                            onOpenGeneratedActivity?.(sourceCourse, selectedAssignment);
                          }}
                          style={[
                            styles.uploadButton,
                            {
                              backgroundColor: getRecommendationColor(selectedAssignment),
                            },
                          ]}
                        >
                          <Text style={styles.uploadButtonText}>
                            Generate Follow-Up Activity
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📚 Related Materials</Text>
                      {getRelatedMaterials(selectedAssignment).length > 0 ? (
                        getRelatedMaterials(selectedAssignment).map((material) => (
                          <View key={material.id} style={styles.relatedMaterialItem}>
                            <Text style={styles.relatedMaterialTitle}>{material.title}</Text>
                            <Text style={styles.relatedMaterialMeta}>
                              {material.type} • {material.uploadedDate}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No linked materials.</Text>
                      )}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📎 Files</Text>

                      {(assignmentFiles[selectedAssignment.id] || []).length > 0 ? (
                        <View>
                          {(assignmentFiles[selectedAssignment.id] || []).map((file) => (
                            <View key={file.id} style={styles.fileItem}>
                              <Text style={{ fontSize: 20 }}>📄</Text>
                              <View style={styles.fileInfo}>
                                <Text style={styles.fileName}>{file.fileName}</Text>
                                <Text style={styles.fileDetails}>
                                  {file.fileSize} • {file.uploadedDate}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() =>
                                  handleRemoveAttachment(selectedAssignment.id, file.id)
                                }
                              >
                                <Text style={styles.removeButton}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No files uploaded yet</Text>
                      )}

                      {(() => {
                        const currentFiles = assignmentFiles[selectedAssignment.id] || [];
                        const hasFiles = currentFiles.length > 0;

                        return (
                          <View style={styles.uploadActionsRow}>
                            {!hasFiles ? (
                              <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={handleFileUpload}
                              >
                                <Text style={styles.uploadButtonText}>+ Upload File</Text>
                              </TouchableOpacity>
                            ) : (
                              <>
                                <TouchableOpacity
                                  onPress={handleFileUpload}
                                  style={styles.secondaryButton}
                                >
                                  <Text style={styles.secondaryButtonText}>
                                    + Add Another File
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={handleSubmitAssignment}
                                  style={[
                                    styles.uploadButton,
                                    { backgroundColor: '#308C5D' },
                                  ]}
                                >
                                  <Text style={styles.uploadButtonText}>SUBMIT</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        );
                      })()}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>💬 Comments</Text>

                      {(assignmentComments[selectedAssignment.id] || []).length > 0 ? (
                        <View>
                          {(assignmentComments[selectedAssignment.id] || []).map((comment) => (
                            <View
                              key={comment.id}
                              style={[
                                styles.commentItem,
                                comment.isInstructor && styles.instructorComment,
                              ]}
                            >
                              <View style={styles.commentHeader}>
                                <Text style={styles.commentAuthor}>{comment.author}</Text>
                                {comment.isInstructor && (
                                  <Text style={styles.instructorBadge}>Teacher</Text>
                                )}
                              </View>
                              <Text style={styles.commentContent}>{comment.content}</Text>
                              <Text style={styles.commentTime}>{comment.timestamp}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No comments yet</Text>
                      )}

                      <View style={styles.commentInputContainer}>
                        <TextInput
                          style={styles.commentInput}
                          placeholder="Add a comment..."
                          placeholderTextColor="#999"
                          value={newComment}
                          onChangeText={setNewComment}
                          multiline
                        />
                        <TouchableOpacity
                          style={[
                            styles.sendButton,
                            !newComment.trim() && styles.sendButtonDisabled,
                          ]}
                          disabled={!newComment.trim()}
                          onPress={handleAddComment}
                        >
                          <Text style={styles.sendButtonText}>Send</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 14,
  },

  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#EFEFEF',
  },
  filterTabActive: {
    backgroundColor: '#D32F2F',
  },
  filterTabText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTabTextActive: {
    color: '#fff',
  },

  countText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 14,
    fontWeight: '600',
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
  courseName: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  topicText: {
    color: '#444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontWeight: '700',
    textTransform: 'capitalize',
    fontSize: 12,
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
  overdueText: {
    color: '#B71C1C',
  },
  pointsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  recommendationBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  recommendationText: {
    fontWeight: '700',
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailContainer: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  detailContent: {},
  infoCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  description: {
    color: '#666',
    marginVertical: 8,
    lineHeight: 20,
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#666',
    fontSize: 13,
  },
  infoValue: {
    fontWeight: '700',
    color: '#000',
    fontSize: 13,
    marginLeft: 10,
  },

  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },

  relatedMaterialItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  relatedMaterialTitle: {
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  relatedMaterialMeta: {
    color: '#777',
    fontSize: 12,
    textTransform: 'capitalize',
  },

  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 8,
  },
  fileName: {
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    fontSize: 13,
  },
  fileDetails: {
    color: '#888',
    fontSize: 12,
  },
  removeButton: {
    color: '#D32F2F',
    fontWeight: 'bold',
    paddingLeft: 8,
  },
  uploadActionsRow: {
    gap: 10,
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#444',
    fontWeight: '700',
    fontSize: 13,
  },

  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 8,
    fontSize: 13,
  },

  commentItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  instructorComment: {
    backgroundColor: '#FFF9C4',
    borderLeftColor: '#FBC02D',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: '700',
    color: '#000',
    fontSize: 13,
  },
  instructorBadge: {
    fontWeight: '600',
    color: '#1f1f1f',
    backgroundColor: '#fbc12d99',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
  },
  commentContent: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginBottom: 6,
  },
  commentTime: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  commentInputContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  commentInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    fontSize: 13,
    color: '#000',
    marginBottom: 8,
  },
  sendButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default Assignments;