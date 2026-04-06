import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

import {
  AssignmentComment,
  AssignmentCourse,
  AssignmentFileUpload,
  AssignmentItem,
} from './Assignments';

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  uploadedDate: string;
}

export interface AssignmentFile {
  id: string;
  name: string;
  uploadedAt: string;
  uri?: string;
}

export interface CourseAssignmentComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInstructor: boolean;
}

export interface CourseAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
  files?: AssignmentFile[];
  comments?: CourseAssignmentComment[];
}

export interface CourseDetailData {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  semester: string;
  schoolYear: string;
  section: string;
  materials: Material[];
  assignments: CourseAssignment[];
}

interface CourseDetailProps {
  course?: AssignmentCourse;
  onBack?: () => void;
  initialTab?: 'materials' | 'assignments';
  autoOpenAssignmentId?: string | null;
  onConsumedAutoOpenAssignment?: () => void;
  onGenerateActivity?: (assignment: AssignmentItem) => void;

  assignmentComments: Record<string, AssignmentComment[]>;
  assignmentFiles: Record<string, AssignmentFileUpload[]>;
  onAddComment: (assignmentId: string, content: string) => void;
  onAddFile: (assignmentId: string, file: AssignmentFileUpload) => void;
  onRemoveFile: (assignmentId: string, fileId: string) => void;
}

const MOCK_COURSE: AssignmentCourse = {
  id: '1',
  name: 'Web Development',
  code: 'CS-101',
  instructor: 'Prof. John Smith',
  description:
    'Learn the fundamentals of web development including HTML, CSS, JavaScript, and introductory React concepts.',
  semester: '2nd Semester',
  schoolYear: '2025-2026',
  section: '3A - Python',
  materials: [
    { id: 'm1', title: 'HTML Basics Tutorial', type: 'video', uploadedDate: '2026-02-01' },
    { id: 'm2', title: 'CSS Styling Guide', type: 'pdf', uploadedDate: '2026-02-03' },
    { id: 'm3', title: 'JavaScript Fundamentals', type: 'video', uploadedDate: '2026-02-05' },
    { id: 'm4', title: 'React Components Introduction', type: 'document', uploadedDate: '2026-02-07' },
    { id: 'm5', title: 'Project Guidelines', type: 'document', uploadedDate: '2026-02-10' },
  ],
  assignments: [
    {
      id: 'a1',
      title: 'React Fundamentals Quiz',
      dueDate: '2026-02-15',
      status: 'graded',
      points: 8,
      maxPoints: 20,
      topic: 'React Fundamentals',
      materialIds: ['m4'],
      files: [
        {
          id: 'f-a1-1',
          fileName: 'React_Fundamentals_Quiz_submission.pdf',
          fileSize: '1.2 MB',
          uploadedDate: '2026-02-15 08:30 AM',
        },
      ],
      comments: [],
    },
  ],
};

const CourseDetail = ({
  course = MOCK_COURSE,
  initialTab = 'materials',
  onBack,
  autoOpenAssignmentId = null,
  onConsumedAutoOpenAssignment,
  onGenerateActivity,
  assignmentComments,
  assignmentFiles,
  onAddComment,
  onAddFile,
  onRemoveFile,
}: CourseDetailProps) => {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isLargeScreen = width >= 768;

  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>(initialTab);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [newComment, setNewComment] = useState('');

  const autoHandledRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const classPerformance = useMemo(() => {
    const graded = course.assignments.filter((a) => a.status === 'graded' && a.maxPoints);
    if (graded.length === 0) return null;

    const totalPercent = graded.reduce((sum, item) => {
      const percent = getScorePercent(item);
      return sum + (percent ?? 0);
    }, 0);

    return Math.round(totalPercent / graded.length);
  }, [course.assignments]);

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'video':
        return '🎥';
      case 'document':
        return '📝';
      case 'link':
        return '🔗';
      default:
        return '📎';
    }
  };

  function getScorePercent(assignment: AssignmentItem) {
    if (
      assignment.status !== 'graded' ||
      assignment.points === undefined ||
      assignment.maxPoints === undefined ||
      assignment.maxPoints === 0
    ) {
      return null;
    }

    return Math.round((assignment.points / assignment.maxPoints) * 100);
  }

  const getRecommendationType = (
    assignment: AssignmentItem
  ): 'review' | 'practice' | 'advanced' | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 75) return 'practice';
    return 'advanced';
  };

  const getRecommendationLabel = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return 'Review Activity';
    if (recommendation === 'practice') return 'Practice Quiz';
    if (recommendation === 'advanced') return 'Advanced Challenge';
    return null;
  };

  const getRecommendationColor = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return '#D32F2F';
    if (recommendation === 'practice') return '#F57C00';
    if (recommendation === 'advanced') return '#2E7D32';
    return '#999';
  };

  const getStatusColor = (status: AssignmentItem['status']) => {
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

  const getStatusTextColor = (status: AssignmentItem['status']) => {
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

  const getRelatedMaterials = (assignment: AssignmentItem) => {
    if (!assignment.materialIds?.length) return [];
    return course.materials.filter((m) => assignment.materialIds?.includes(m.id));
  };

  const handleGenerateActivity = (assignment: AssignmentItem, silent = false) => {
    const recommendation = getRecommendationType(assignment);

    if (!recommendation) {
      if (!silent) {
        Alert.alert('Not available', 'Only graded assignments can generate a follow-up activity.');
      }
      return;
    }

    closeAssignmentModal();
    onGenerateActivity?.(assignment);

    if (!silent) {
      const recommendationLabel =
        recommendation === 'review'
          ? 'Review Activity'
          : recommendation === 'practice'
          ? 'Practice Quiz'
          : 'Advanced Challenge';

      Alert.alert('Activity Generated', `${recommendationLabel} is ready.`);
    }
  };

  useEffect(() => {
    if (!autoOpenAssignmentId) return;
    if (autoHandledRef.current === autoOpenAssignmentId) return;

    const targetAssignment = course.assignments.find(
      (assignment) => assignment.id === autoOpenAssignmentId
    );

    if (!targetAssignment) {
      onConsumedAutoOpenAssignment?.();
      return;
    }

    autoHandledRef.current = autoOpenAssignmentId;
    setActiveTab('assignments');
    setSelectedAssignment(targetAssignment);

    setTimeout(() => {
      handleGenerateActivity(targetAssignment, true);
      onConsumedAutoOpenAssignment?.();
    }, 150);
  }, [autoOpenAssignmentId, course.assignments]);

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

  const closeAssignmentModal = () => {
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
    closeAssignmentModal();
  };

  const renderMaterialItem = ({ item }: { item: AssignmentCourse['materials'][number] }) => (
    <TouchableOpacity style={styles.materialCard} activeOpacity={0.7}>
      <View style={styles.materialIcon}>
        <Text style={styles.iconText}>{getMaterialIcon(item.type)}</Text>
      </View>
      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle}>{item.title}</Text>
        <Text style={styles.materialType}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.uploadedDate}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderAssignmentItem = ({ item }: { item: AssignmentItem }) => {
    const percent = getScorePercent(item);
    const recommendationLabel = getRecommendationLabel(item);
    const relatedMaterials = getRelatedMaterials(item);

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        activeOpacity={0.85}
        onPress={() => setSelectedAssignment(item)}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            {!!item.topic && <Text style={styles.assignmentTopicText}>Topic: {item.topic}</Text>}
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
          <Text style={styles.dueDateText}>Due: {item.dueDate}</Text>

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

        {relatedMaterials.length > 0 && (
          <Text style={styles.relatedPreviewText}>
            Based on: {relatedMaterials.map((m) => m.title).join(', ')}
          </Text>
        )}

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
    <ScrollView style={styles.container}>
      <View style={[styles.courseHeader, { paddingHorizontal: wp(isSmallPhone ? '3' : '5') }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        <Text style={[styles.courseCode, { fontSize: isSmallPhone ? 11 : 12 }]}>{course.code}</Text>
        <Text style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24 }]}>{course.name}</Text>
        <Text style={[styles.instructor, { fontSize: isSmallPhone ? 12 : 14 }]}>
          Instructor: {course.instructor}
        </Text>
        <Text style={[styles.metaText, { fontSize: isSmallPhone ? 12 : 13 }]}>
          {course.semester} - {course.schoolYear}
        </Text>
        <Text style={[styles.metaText, { fontSize: isSmallPhone ? 12 : 13 }]}>
          {course.section}
        </Text>
        <Text style={[styles.description, { fontSize: isSmallPhone ? 12 : 13 }]}>
          {course.description}
        </Text>

        {classPerformance !== null && (
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Class Progress Snapshot</Text>
            <Text style={styles.performanceValue}>Average Graded Score: {classPerformance}%</Text>
          </View>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('materials')}
          style={[
            styles.tab,
            activeTab === 'materials' && styles.tabActive,
            { paddingVertical: isSmallPhone ? hp('1.2') : hp('2') },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'materials' && styles.tabTextActive,
              { fontSize: isSmallPhone ? 12 : 13 },
            ]}
          >
            📚 Materials ({course.materials.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('assignments')}
          style={[
            styles.tab,
            activeTab === 'assignments' && styles.tabActive,
            { paddingVertical: isSmallPhone ? hp('1.2') : hp('2') },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'assignments' && styles.tabTextActive,
              { fontSize: isSmallPhone ? 12 : 13 },
            ]}
          >
            ✓ Assignments ({course.assignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.contentContainer, { paddingHorizontal: wp(isSmallPhone ? '3' : '4') }]}>
        {activeTab === 'materials' ? (
          course.materials.length > 0 ? (
            <FlatList
              data={course.materials}
              renderItem={renderMaterialItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No materials available yet</Text>
          )
        ) : course.assignments.length > 0 ? (
          <FlatList
            data={course.assignments}
            renderItem={renderAssignmentItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        ) : (
          <Text style={styles.emptyText}>No assignments yet</Text>
        )}

        <Modal
          visible={!!selectedAssignment}
          animationType="slide"
          transparent
          onRequestClose={closeAssignmentModal}
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
                      <TouchableOpacity onPress={closeAssignmentModal}>
                        <Text style={styles.closeButton}>✕</Text>
                      </TouchableOpacity>
                      <Text style={styles.detailTitle}>{selectedAssignment.title}</Text>
                      <View style={{ width: 30 }} />
                    </View>

                    <View style={styles.detailContent}>
                      <View style={styles.infoCard}>
                        <Text style={styles.detailCourseName}>
                          {course.name} • {course.code}
                        </Text>

                        <Text style={styles.detailMetaText}>
                          {course.semester} - {course.schoolYear}
                        </Text>
                        <Text style={styles.detailMetaText}>{course.section}</Text>

                        {!!selectedAssignment.topic && (
                          <Text style={styles.detailTopicText}>
                            Topic: {selectedAssignment.topic}
                          </Text>
                        )}

                        <Text style={styles.detailDescription}>
                          {course.description || 'No description provided.'}
                        </Text>

                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Instructor:</Text>
                          <Text style={styles.infoValue}>{course.instructor}</Text>
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
                            onPress={() => handleGenerateActivity(selectedAssignment)}
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
                          const uploadedFiles = assignmentFiles[selectedAssignment.id] || [];
                          const hasFiles = uploadedFiles.length > 0;

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
                                    <Text style={styles.teacherBadge}>Teacher</Text>
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
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  courseHeader: {
    backgroundColor: '#D32F2F',
    paddingVertical: hp('2'),
    position: 'relative',
  },
  backButton: {
    marginBottom: hp('1'),
    paddingVertical: hp('0.5'),
  },
  courseCode: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: hp('0.5'),
  },
  courseName: {
    fontWeight: '700',
    color: '#FFF',
    marginBottom: hp('1'),
  },
  instructor: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: hp('0.6'),
    fontWeight: '500',
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.88)',
    marginBottom: hp('0.6'),
    fontWeight: '500',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginTop: hp('0.3'),
  },
  performanceCard: {
    marginTop: hp('1.5'),
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: 12,
  },
  performanceTitle: {
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  performanceValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingHorizontal: wp('2'),
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#D32F2F',
  },
  tabText: {
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#D32F2F',
  },

  contentContainer: {
    paddingVertical: hp('2'),
  },

  materialCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: wp('3'),
    marginBottom: hp('1.5'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  materialIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3'),
  },
  iconText: {
    fontSize: 24,
  },
  materialInfo: {
    flex: 1,
  },
  materialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  materialType: {
    fontSize: 12,
    color: '#999',
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
  detailCourseName: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  detailMetaText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  detailTopicText: {
    color: '#444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  detailDescription: {
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
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: hp('3'),
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
  teacherBadge: {
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

export default CourseDetail;
