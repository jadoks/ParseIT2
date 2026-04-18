import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
  content?: string;
  fileName?: string;
  fileUrl?: string;
  fileUri?: string;
  fileType?: string;
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
  course?: AssignmentCourse | null;
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

const EMPTY_COURSE: AssignmentCourse = {
  id: '',
  name: 'No Course Selected',
  code: '',
  instructor: '',
  description: 'No course data available.',
  semester: '',
  schoolYear: '',
  section: '',
  materials: [],
  assignments: [],
};

const CourseDetail = ({
  course,
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

  const safeCourse = course ?? EMPTY_COURSE;

  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>(initialTab);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [selectedMaterial, setSelectedMaterial] =
    useState<AssignmentCourse['materials'][number] | null>(null);
  const [newComment, setNewComment] = useState('');

  const autoHandledRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const classPerformance = useMemo(() => {
    const graded = safeCourse.assignments.filter(
      (a) => a.status === 'graded' && a.maxPoints
    );

    if (graded.length === 0) return null;

    const totalPercent = graded.reduce((sum, item) => {
      const percent = getScorePercent(item);
      return sum + (percent ?? 0);
    }, 0);

    return Math.round(totalPercent / graded.length);
  }, [safeCourse.assignments]);

  const getMaterialIconName = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'document-text-outline';
      case 'video':
        return 'videocam-outline';
      case 'document':
        return 'document-outline';
      case 'link':
        return 'link-outline';
      default:
        return 'attach-outline';
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
    return safeCourse.materials.filter((m) => assignment.materialIds?.includes(m.id));
  };

  const getMaterialUrl = (
    material: AssignmentCourse['materials'][number] | null
  ): string | null => {
    if (!material) return null;

    const raw =
      material.fileUri ||
      material.fileUrl ||
      (material as any).uri ||
      null;

    if (!raw || typeof raw !== 'string') return null;

    const trimmed = raw.trim();
    if (!trimmed) return null;

    return trimmed;
  };

  const handleOpenMaterialPreview = (
    material: AssignmentCourse['materials'][number]
  ) => {
    setSelectedMaterial(material);
  };

  const closeMaterialModal = () => {
    setSelectedMaterial(null);
  };

  const handleOpenUploadedFile = async (fileUri?: string | null) => {
    const url = fileUri?.trim();

    if (!url) {
      Alert.alert('No File', 'This material has no file URL yet.');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Open Failed', `Unable to open this file.`);
    }
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

    const targetAssignment = safeCourse.assignments.find(
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
  }, [autoOpenAssignmentId, safeCourse.assignments]);

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
    <TouchableOpacity
      style={styles.materialCard}
      activeOpacity={0.85}
      onPress={() => handleOpenMaterialPreview(item)}
    >
      <View style={styles.materialIcon}>
        <Ionicons name={getMaterialIconName(item.type)} size={24} color="#D32F2F" />
      </View>

      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle}>{item.title}</Text>
        <Text style={styles.materialType}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.uploadedDate}
        </Text>
        {!!item.fileName && (
          <Text style={styles.materialFileName} numberOfLines={1}>
            {item.fileName}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#BBB" />
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

  const selectedMaterialUrl = getMaterialUrl(selectedMaterial);

  if (!course) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyScreenTitle}>No course selected</Text>
        <Text style={styles.emptyScreenText}>
          Open a class from Dashboard or Classes to view its details.
        </Text>

        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.emptyBackButton}>
            <Text style={styles.emptyBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.courseHeader, { paddingHorizontal: wp(isSmallPhone ? '3' : '5') }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        <Text style={[styles.courseCode, { fontSize: isSmallPhone ? 11 : 12 }]}>
          {safeCourse.code}
        </Text>
        <Text style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24 }]}>
          {safeCourse.name}
        </Text>
        <Text style={[styles.instructor, { fontSize: isSmallPhone ? 12 : 14 }]}>
          Instructor: {safeCourse.instructor}
        </Text>
        <Text style={[styles.metaText, { fontSize: isSmallPhone ? 12 : 13 }]}>
          {safeCourse.semester} - {safeCourse.schoolYear}
        </Text>
        <Text style={[styles.metaText, { fontSize: isSmallPhone ? 12 : 13 }]}>
          {safeCourse.section}
        </Text>
        <Text style={[styles.description, { fontSize: isSmallPhone ? 12 : 13 }]}>
          {safeCourse.description}
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
          <View style={styles.tabContent}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={activeTab === 'materials' ? '#D32F2F' : '#999'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'materials' && styles.tabTextActive,
                { fontSize: isSmallPhone ? 12 : 13 },
              ]}
            >
              Materials ({safeCourse.materials.length})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('assignments')}
          style={[
            styles.tab,
            activeTab === 'assignments' && styles.tabActive,
            { paddingVertical: isSmallPhone ? hp('1.2') : hp('2') },
          ]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={activeTab === 'assignments' ? '#D32F2F' : '#999'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'assignments' && styles.tabTextActive,
                { fontSize: isSmallPhone ? 12 : 13 },
              ]}
            >
              Assignments ({safeCourse.assignments.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.contentContainer, { paddingHorizontal: wp(isSmallPhone ? '3' : '4') }]}>
        {activeTab === 'materials' ? (
          safeCourse.materials.length > 0 ? (
            <FlatList
              data={safeCourse.materials}
              renderItem={renderMaterialItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No materials available yet</Text>
          )
        ) : safeCourse.assignments.length > 0 ? (
          <FlatList
            data={safeCourse.assignments}
            renderItem={renderAssignmentItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        ) : (
          <Text style={styles.emptyText}>No assignments yet</Text>
        )}

        <Modal
          visible={!!selectedMaterial}
          transparent
          animationType="fade"
          onRequestClose={closeMaterialModal}
        >
          <TouchableWithoutFeedback onPress={closeMaterialModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.materialDropdownModal,
                    {
                      top: isSmallPhone ? 70 : 80,
                      right: isSmallPhone ? 14 : 20,
                      width: isSmallPhone ? Math.min(width - 28, 320) : 340,
                    },
                  ]}
                >
                  {selectedMaterial && (
                    <>
                      <View style={styles.joinDropdownHeader}>
                        <View style={styles.joinDropdownIconWrap}>
                          <Ionicons
                            name={getMaterialIconName(selectedMaterial.type)}
                            size={18}
                            color="#D32F2F"
                          />
                        </View>

                        <View style={styles.joinDropdownHeaderText}>
                          <Text style={styles.joinDropdownTitle}>
                            {selectedMaterial.title}
                          </Text>
                          <Text style={styles.joinDropdownSubtitle}>
                            Open this file in your browser or device app.
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.inputLabel}>Uploaded</Text>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>
                          {selectedMaterial.uploadedDate || 'Unknown date'}
                        </Text>
                      </View>

                      <Text style={styles.inputLabel}>File Name</Text>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>
                          {selectedMaterial.fileName || 'No uploaded file'}
                        </Text>
                      </View>

                      {!!selectedMaterial.content && (
                        <>
                          <Text style={styles.inputLabel}>Description</Text>
                          <View style={styles.infoBox}>
                            <Text style={styles.infoBoxText}>
                              {selectedMaterial.content}
                            </Text>
                          </View>
                        </>
                      )}

                      <View style={styles.joinDropdownActions}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={closeMaterialModal}
                        >
                          <Text style={styles.cancelButtonText}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.confirmButton,
                            !selectedMaterialUrl && styles.confirmButtonDisabled,
                          ]}
                          disabled={!selectedMaterialUrl}
                          onPress={() => handleOpenUploadedFile(selectedMaterialUrl)}
                        >
                          <Text style={styles.confirmButtonText}>Open File</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={!!selectedAssignment}
          animationType="slide"
          transparent
          onRequestClose={closeAssignmentModal}
        >
          <View style={styles.modalOverlayBottom}>
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
                        <Ionicons name="close" size={24} color="#333" />
                      </TouchableOpacity>
                      <Text style={styles.detailTitle}>{selectedAssignment.title}</Text>
                      <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.detailContent}>
                      <View style={styles.infoCard}>
                        <Text style={styles.detailCourseName}>
                          {safeCourse.name} • {safeCourse.code}
                        </Text>

                        <Text style={styles.detailMetaText}>
                          {safeCourse.semester} - {safeCourse.schoolYear}
                        </Text>
                        <Text style={styles.detailMetaText}>{safeCourse.section}</Text>

                        {!!selectedAssignment.topic && (
                          <Text style={styles.detailTopicText}>
                            Topic: {selectedAssignment.topic}
                          </Text>
                        )}

                        <Text style={styles.detailDescription}>
                          {safeCourse.description || 'No description provided.'}
                        </Text>

                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Instructor:</Text>
                          <Text style={styles.infoValue}>{safeCourse.instructor}</Text>
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
                              styles.uploadButtonWide,
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
                            <TouchableOpacity
                              key={material.id}
                              style={styles.relatedMaterialItem}
                              activeOpacity={0.85}
                              onPress={() => handleOpenMaterialPreview(material)}
                            >
                              <Text style={styles.relatedMaterialTitle}>{material.title}</Text>
                              <Text style={styles.relatedMaterialMeta}>
                                {material.type} • {material.uploadedDate}
                              </Text>
                              {!!material.fileName && (
                                <Text style={styles.relatedMaterialFileName}>
                                  {material.fileName}
                                </Text>
                              )}
                            </TouchableOpacity>
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
                                <Ionicons name="document-text-outline" size={20} color="#D32F2F" />
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
                                  <Ionicons name="close" size={20} color="#D32F2F" />
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
                                  style={styles.uploadButtonWide}
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
                                      styles.uploadButtonWide,
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

  emptyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
  },
  emptyScreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  emptyScreenText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyBackButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBackButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
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
  tabContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
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
    borderRadius: 14,
    padding: wp('3'),
    marginBottom: hp('1.5'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  materialIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFF1F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3'),
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
  materialFileName: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
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
    fontSize: 12,
    fontWeight: '700',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 20,
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  materialDropdownModal: {
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
  infoBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#DADDE2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
    justifyContent: 'center',
  },
  infoBoxText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
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

  modalWrapper: {
    backgroundColor: '#F8F8F8',
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  detailContainer: {
    paddingBottom: 40,
  },
  detailHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginHorizontal: 12,
  },

  detailContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  detailCourseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  detailMetaText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailTopicText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  infoLabel: {
    width: 80,
    fontWeight: '700',
    color: '#333',
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    color: '#555',
    fontSize: 13,
  },

  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },

  relatedMaterialItem: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FCFCFC',
  },
  relatedMaterialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  relatedMaterialMeta: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  relatedMaterialFileName: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
    fontWeight: '600',
  },

  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  fileDetails: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  uploadActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },

  commentItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  instructorComment: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    backgroundColor: '#FFF5F5',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  teacherBadge: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#D32F2F',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  commentContent: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  commentTime: {
    marginTop: 6,
    fontSize: 11,
    color: '#888',
  },

  commentInputContainer: {
    marginTop: 10,
  },
  commentInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#111',
  },
  sendButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 13,
  },
  uploadButtonWide: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 14,
  },
  uploadButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default CourseDetail;