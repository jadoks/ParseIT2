import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

/* =========================
   TYPES
========================= */

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
  fileUrl?: string;
  fileType?: string;
  storagePath?: string;
  bucketPath?: string;
  submissionId?: string;
  submittedAt?: string;
  isSubmitted?: boolean;
  source?: 'student' | 'teacher';
}

export interface AssignmentMaterial {
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
  fileName?: string | null;
  fileUrl?: string | null;
  fileUri?: string | null;
  fileType?: string | null;
  storagePath?: string | null;
  bucketPath?: string | null;
  comments?: AssignmentComment[];
  files?: AssignmentFileUpload[];
}

export interface AssignmentCourse {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  semester: string;
  schoolYear: string;
  section: string;
  materials: AssignmentMaterial[];
  assignments: AssignmentItem[];
}



type CurrentStudent = {
  studentId: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function getApiBaseUrl() {
  if (Platform.OS === 'web') return 'http://localhost:5000';

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  const host = possibleHost.split(':')[0];
  if (host) return `http://${host}:5000`;
  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

const getDisplayFileSize = (bytes?: number | null) => {
  if (!bytes || !Number.isFinite(bytes)) return 'Uploaded file';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

async function readPickedFileBase64(asset: any): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (asset?.base64) return asset.base64;

    if (asset?.file) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            resolve(result.includes(',') ? result.split(',')[1] : result);
          } else {
            reject(new Error('Failed to read selected file.'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read selected file.'));
        reader.readAsDataURL(asset.file as File);
      });
    }
  }

  if (asset?.uri) {
    return await FileSystem.readAsStringAsync(asset.uri, {
      encoding: 'base64' as any,
    });
  }

  return null;
}

interface FlattenedAssignment extends AssignmentItem {
  courseId: string;
  courseName: string;
  courseCode: string;
  instructor: string;
  semester: string;
  schoolYear: string;
  section: string;
  courseDescription: string;
  materials: AssignmentMaterial[];
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
  onUpdateAssignmentStatus?: (assignmentId: string, status: AssignmentItem['status']) => void;
  onRefreshSubmissions?: () => Promise<void> | void;
  currentStudent?: CurrentStudent;
  isGeneratingActivity?: boolean;
  completedActivityScores?: Record<
    string,
    {
      scorePercent: number | null;
      completed: boolean;
      mastered: boolean;
    }
  >;
}


type FilterType = 'all' | 'pending' | 'submitted' | 'graded';

const Assignments = ({
  courses,
  selectedCourseId = null,
  assignmentComments,
  assignmentFiles,
  onAddComment,
  onAddFile,
  onRemoveFile,
  onOpenGeneratedActivity,
  onUpdateAssignmentStatus,
  onRefreshSubmissions,
  currentStudent,
  isGeneratingActivity = false,
  completedActivityScores = {},
}: AssignmentsProps) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<FlattenedAssignment | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const sourceCourses = useMemo(() => {
    if (!selectedCourseId) return courses;
    return courses.filter((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const allAssignments = useMemo<FlattenedAssignment[]>(() => {
    return sourceCourses.flatMap((course) =>
      course.assignments.map((assignment) => ({
        ...assignment,
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        instructor: course.instructor,
        semester: course.semester,
        schoolYear: course.schoolYear,
        section: course.section,
        courseDescription: course.description,
        materials: course.materials,
      }))
    );
  }, [sourceCourses]);

  const filteredAssignments =
    filter === 'all' ? allAssignments : allAssignments.filter((a) => a.status === filter);

  const getScorePercent = (assignment: AssignmentItem) => {
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
    assignment: AssignmentItem
  ): 'review' | 'practice' | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 75) return 'practice';
    return null;
  };

  const getRecommendationLabel = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return 'Review Activity';
    if (recommendation === 'practice') return 'Practice Quiz';
    return null;
  };

  const getRecommendationColor = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return '#D32F2F';
    if (recommendation === 'practice') return '#F57C00';
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

  const getRelatedMaterials = (assignment: FlattenedAssignment) => {
    if (!assignment.materialIds?.length) return [];
    return assignment.materials.filter((m) => assignment.materialIds?.includes(m.id));
  };

  const hasMasteredGeneratedActivity = (assignment: AssignmentItem) => {
    const activityScore = completedActivityScores[assignment.id];
    return (
      !!activityScore?.completed &&
      activityScore.scorePercent !== null &&
      activityScore.scorePercent >= 75
    );
  };

  const canGenerateActivity = (assignment: FlattenedAssignment) => {
    return (
      !!getRecommendationType(assignment) &&
      getRelatedMaterials(assignment).length > 0 &&
      !hasMasteredGeneratedActivity(assignment)
    );
  };

  const handleOpenGeneratedActivity = (assignment: FlattenedAssignment) => {
    if (isGeneratingActivity) return;

    const relatedMaterials = getRelatedMaterials(assignment);

    if (!relatedMaterials.length) {
      Alert.alert(
        'Related materials required',
        'The teacher must select related materials first. The AI follow-up activity is generated from those materials, not from the assignment title.'
      );
      return;
    }

    const course = courses.find((c) => c.id === assignment.courseId);
    if (course && onOpenGeneratedActivity) {
      onOpenGeneratedActivity(course, {
        ...assignment,
        relatedMaterials,
        materialIds: relatedMaterials.map((material) => material.id),
      } as any);
    }
  };

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;
    onAddComment(selectedAssignment.id, newComment);
    setNewComment('');
  };

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    if (!selectedAssignment.courseId) {
      Alert.alert('No class', 'This assignment is not connected to a class.');
      return;
    }

    try {
      setIsUploadingFile(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        base64: Platform.OS === 'web',
      });

      if (!res.canceled && res.assets?.length) {
        const file = res.assets[0];
        const fileBase64 = await readPickedFileBase64(file);

        if (!fileBase64) {
          throw new Error('Unable to read selected file.');
        }

        const uploadResponse = await fetch(`${API_BASE_URL}/upload-class-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedAssignment.courseId,
            fileBase64,
            fileName: file.name || 'submission-file',
            fileType: file.mimeType || 'application/octet-stream',
            kind: 'submission',
          }),
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData?.error || 'Failed to upload file.');
        }

        onAddFile(selectedAssignment.id, {
          id: `f${Date.now()}`,
          fileName: uploadData?.data?.fileName || file.name || 'file',
          fileSize: getDisplayFileSize(file.size),
          uploadedDate: new Date().toLocaleString(),
          fileUrl: uploadData?.data?.fileUrl,
          fileType: uploadData?.data?.fileType || file.mimeType,
          storagePath: uploadData?.data?.storagePath,
          bucketPath: uploadData?.data?.bucketPath,
          isSubmitted: false,
          source: 'student',
        });
      }
    } catch (err: any) {
      console.warn('DocumentPicker/upload error', err);
      Alert.alert('Upload failed', err?.message || 'Could not upload the selected file.');
    } finally {
      setIsUploadingFile(false);
    }
  };


  const normalizeSubmissionLink = (value: string) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleAddLinkSubmission = () => {
    if (!selectedAssignment) return;

    const linkUrl = normalizeSubmissionLink(submissionLink);
    if (!linkUrl) {
      Alert.alert('Missing link', 'Please paste a submission link first.');
      return;
    }

    onAddFile(selectedAssignment.id, {
      id: `link-${Date.now()}`,
      fileName: 'Submitted link',
      fileSize: 'Link submission',
      uploadedDate: new Date().toLocaleString(),
      fileUrl: linkUrl,
      fileType: 'text/uri-list',
      isSubmitted: false,
      source: 'student',
    });

    setSubmissionLink('');
  };

  const isAssignmentSubmitted = (assignment?: AssignmentItem | null) => {
    return assignment?.status === 'submitted' || assignment?.status === 'graded';
  };

  const isAssignmentGraded = (assignment?: AssignmentItem | null) => {
    return assignment?.status === 'graded';
  };

  const getSubmittedFiles = (assignment?: AssignmentItem | null) => {
    if (!assignment) return [];

    return (assignmentFiles[assignment.id] || []).filter(
      (file) => file.source !== 'teacher'
    );
  };

  const getTeacherAssignmentFiles = (assignment?: AssignmentItem | null) => {
    if (!assignment) return [];

    const mappedFiles = (assignment.files || []).map((file: any, index) => ({
      id: file.id || `teacher-file-${assignment.id}-${index}`,
      fileName: file.fileName || file.name || 'Assignment attachment',
      fileSize: file.fileSize || 'Teacher file',
      uploadedDate: file.uploadedDate || file.uploadedAt || 'Attached by teacher',
      fileUrl: file.fileUrl || file.fileUri || file.uri || file.downloadUrl || null,
      fileType: file.fileType,
      source: 'teacher' as const,
    }));

    const topLevelUrl = getAssignmentFileUrl(assignment);
    if (topLevelUrl) {
      const alreadyIncluded = mappedFiles.some((file) => file.fileUrl === topLevelUrl);
      if (!alreadyIncluded) {
        mappedFiles.unshift({
          id: `teacher-file-${assignment.id}-main`,
          fileName: getAssignmentFileName(assignment),
          fileSize: 'Teacher file',
          uploadedDate: 'Attached by teacher',
          fileUrl: topLevelUrl,
          fileType: (assignment as any)?.fileType || (assignment as any)?.attachmentType,
          source: 'teacher' as const,
        });
      }
    }

    return mappedFiles;
  };

  const getAssignmentFileUrl = (assignment?: AssignmentItem | null) => {
    const raw =
      assignment?.fileUrl ||
      assignment?.fileUri ||
      (assignment as any)?.downloadUrl ||
      (assignment as any)?.attachmentUrl ||
      null;

    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed || null;
  };

  const getAssignmentFileName = (assignment?: AssignmentItem | null) => {
    return (
      assignment?.fileName ||
      (assignment as any)?.name ||
      (assignment as any)?.attachmentName ||
      'Assignment attachment'
    );
  };

  const handleOpenUploadedFile = async (
    fileUri?: string | null,
    emptyMessage = 'This file has no URL yet.'
  ) => {
    const url = fileUri?.trim();

    if (!url) {
      Alert.alert('No File', emptyMessage);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported && Platform.OS !== 'web') throw new Error('Unsupported file URL.');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Open Failed', 'Unable to open this file.');
    }
  };

  const syncSelectedAssignmentStatus = (status: AssignmentItem['status']) => {
    if (!selectedAssignment) return;
    setSelectedAssignment((prev) => (prev ? { ...prev, status } : prev));
    onUpdateAssignmentStatus?.(selectedAssignment.id, status);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;

    if (isAssignmentSubmitted(selectedAssignment)) {
      return;
    }

    if (!currentStudent?.studentId) {
      Alert.alert('Missing student', 'Student account information is missing. Please sign in again.');
      return;
    }

    const files = assignmentFiles[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert('No files', 'Please upload at least one file before submitting.');
      return;
    }

    const file = files[0];
    if (!file.fileUrl) {
      Alert.alert('Upload still needed', 'Please re-upload the file before submitting.');
      return;
    }

    try {
      setIsSubmittingAssignment(true);
      const studentName = `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim();

      const response = await fetch(`${API_BASE_URL}/create-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedAssignment.courseId,
          assignmentId: selectedAssignment.id,
          studentUid: currentStudent.authUid || null,
          studentId: currentStudent.studentId,
          studentName,
          status: 'submitted',
          score: null,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType || 'application/octet-stream',
          storagePath: file.storagePath || null,
          bucketPath: file.bucketPath || null,
          feedback: null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit assignment.');
      }

      syncSelectedAssignmentStatus('submitted');
      await onRefreshSubmissions?.();
      Alert.alert('Submitted', 'Your assignment was submitted successfully.');
    } catch (error: any) {
      Alert.alert('Submit Failed', error?.message || 'Unable to submit assignment.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleUnsubmitAssignment = async () => {
    if (!selectedAssignment) return;

    if (selectedAssignment.status === 'graded') {
      Alert.alert('Already graded', 'This assignment has already been graded and cannot be unsubmitted.');
      return;
    }

    if (!currentStudent?.studentId) {
      Alert.alert('Missing student', 'Student account information is missing. Please sign in again.');
      return;
    }

    try {
      setIsSubmittingAssignment(true);

      const response = await fetch(`${API_BASE_URL}/unsubmit-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedAssignment.courseId,
          assignmentId: selectedAssignment.id,
          studentId: currentStudent.studentId,
          studentUid: currentStudent.authUid || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to unsubmit assignment.');
      }

      syncSelectedAssignmentStatus('pending');
      await onRefreshSubmissions?.();
      Alert.alert('Unsubmitted', 'Your file is still attached. You can edit it and submit again.');
    } catch (error: any) {
      Alert.alert('Unsubmit Failed', error?.message || 'Unable to unsubmit assignment.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const closeModal = () => {
    setSelectedAssignment(null);
    setNewComment('');
  };

  const renderAssignmentItem = ({ item }: { item: FlattenedAssignment }) => {
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
            <Text style={styles.courseName}>
              {item.courseName} • {item.courseCode}
            </Text>
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: isLargeScreen ? 24 : 16,
      }}
    >
      <Text style={styles.title}>Assignments</Text>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'submitted', 'graded'] as FilterType[]).map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === item && styles.filterChipTextActive,
              ]}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAssignments}
        renderItem={renderAssignmentItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No assignments found.</Text>}
      />

      <Modal visible={!!selectedAssignment} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalWrapper, { width: isLargeScreen ? '72%' : '100%' }]}>
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
                      <Text style={styles.detailCourseName}>
                        {selectedAssignment.courseName} • {selectedAssignment.courseCode}
                      </Text>

                      <Text style={styles.detailMetaText}>
                        {selectedAssignment.semester} - {selectedAssignment.schoolYear}
                      </Text>
                      <Text style={styles.detailMetaText}>{selectedAssignment.section}</Text>

                      {!!selectedAssignment.topic && (
                        <Text style={styles.detailTopicText}>
                          Topic: {selectedAssignment.topic}
                        </Text>
                      )}

                      <Text style={styles.detailDescription}>
                        {selectedAssignment.description ||
                          selectedAssignment.courseDescription ||
                          'No description provided.'}
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

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📄 Assignment File</Text>

                      {getTeacherAssignmentFiles(selectedAssignment).length > 0 ? (
                        <View>
                          {getTeacherAssignmentFiles(selectedAssignment).map((file) => (
                            <View key={file.id} style={styles.attachmentFileCard}>
                              <Text style={{ fontSize: 22 }}>📎</Text>
                              <View style={styles.fileInfo}>
                                <Text style={styles.fileName}>{file.fileName}</Text>
                                <Text style={styles.fileDetails}>Uploaded by your teacher for this assignment</Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.fileOpenButton, !file.fileUrl && styles.fileOpenButtonDisabled]}
                                disabled={!file.fileUrl}
                                activeOpacity={0.85}
                                onPress={() => handleOpenUploadedFile(file.fileUrl, 'This assignment has no attached file yet.')}
                              >
                                <Text style={styles.fileOpenButtonText}>Open</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No assignment file attached.</Text>
                      )}
                    </View>

                    {getRecommendationType(selectedAssignment) && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎯 Follow-Up Activity</Text>

                        {!canGenerateActivity(selectedAssignment) && (
                          <Text style={styles.materialWarningText}>
                            The teacher must link related materials first. AI will generate this activity from those related materials only.
                          </Text>
                        )}

                        <TouchableOpacity
                          onPress={() => handleOpenGeneratedActivity(selectedAssignment)}
                          disabled={!canGenerateActivity(selectedAssignment) || isGeneratingActivity}
                          style={[
                            styles.uploadButton,
                            {
                              backgroundColor: canGenerateActivity(selectedAssignment)
                                ? getRecommendationColor(selectedAssignment)
                                : '#CCC',
                              opacity: isGeneratingActivity ? 0.75 : 1,
                            },
                          ]}
                        >
                          {isGeneratingActivity ? (
                            <View style={styles.loadingButtonContent}>
                              <ActivityIndicator size="small" color="#FFFFFF" />
                              <Text style={styles.uploadButtonText}>Generating...</Text>
                            </View>
                          ) : (
                            <Text style={styles.uploadButtonText}>Generate Follow-Up Activity</Text>
                          )}
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
                            {!!material.fileName && (
                              <Text style={styles.relatedMaterialFileName}>{material.fileName}</Text>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No linked materials.</Text>
                      )}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📤 Your Uploads</Text>

                      {getSubmittedFiles(selectedAssignment).length > 0 ? (
                        <View>
                          {getSubmittedFiles(selectedAssignment).map((file) => (
                            <View key={file.id} style={styles.fileItem}>
                              <Text style={{ fontSize: 20 }}>{file.fileType === 'text/uri-list' ? '🔗' : '📄'}</Text>
                              <View style={styles.fileInfo}>
                                <Text style={styles.fileName}>{file.fileName}</Text>
                                <Text style={styles.fileDetails}>
                                  {file.fileSize} • {file.uploadedDate}
                                </Text>
                              </View>

                              <View style={styles.fileActionsRow}>
                                <TouchableOpacity
                                  style={[styles.fileOpenButton, !file.fileUrl && styles.fileOpenButtonDisabled]}
                                  disabled={!file.fileUrl}
                                  activeOpacity={0.85}
                                  onPress={() => handleOpenUploadedFile(file.fileUrl, 'This submitted file has no URL yet.')}
                                >
                                  <Text style={styles.fileOpenButtonText}>Open</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  disabled={isAssignmentSubmitted(selectedAssignment)}
                                  onPress={() => onRemoveFile(selectedAssignment.id, file.id)}
                                >
                                  <Text style={[styles.removeButton, isAssignmentSubmitted(selectedAssignment) && styles.disabledRemoveButton]}>✕</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No student submission added yet</Text>
                      )}

                      {(() => {
                        const uploadedFiles = getSubmittedFiles(selectedAssignment);
                        const hasFiles = uploadedFiles.length > 0;
                        const isSubmitted = isAssignmentSubmitted(selectedAssignment);
                        const isGraded = isAssignmentGraded(selectedAssignment);
                        const canEditFiles = !isSubmitted && !isGraded;

                        if (isGraded) {
                          return (
                            <View style={styles.uploadActionsRow}>
                              <View style={styles.lockedSubmissionBox}>
                                <Text style={styles.lockedSubmissionTitle}>✅ Assignment already graded</Text>
                                <Text style={styles.lockedSubmissionText}>
                                  Your submission is locked. You can no longer upload, remove, submit, or unsubmit files.
                                </Text>
                              </View>
                            </View>
                          );
                        }

                        if (isSubmitted) {
                          return (
                            <View style={styles.uploadActionsRow}>
                              <View style={styles.lockedSubmissionBox}>
                                <Text style={styles.lockedSubmissionTitle}>📨 Already submitted</Text>
                                <Text style={styles.lockedSubmissionText}>
                                  Your teacher has received this assignment. Unsubmit only if you need to change your file before grading.
                                </Text>
                              </View>

                              <TouchableOpacity
                                onPress={handleUnsubmitAssignment}
                                disabled={isSubmittingAssignment}
                                style={[
                                  styles.uploadButton,
                                  { backgroundColor: '#D32F2F' },
                                  isSubmittingAssignment && styles.sendButtonDisabled,
                                ]}
                              >
                                <Text style={styles.uploadButtonText}>
                                  {isSubmittingAssignment ? 'UNSUBMITTING...' : 'UNSUBMIT'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }

                        return (
                          <View style={styles.uploadActionsRow}>
                            {canEditFiles && (
                              <View style={styles.linkSubmitBox}>
                                <TextInput
                                  style={styles.linkInput}
                                  value={submissionLink}
                                  onChangeText={setSubmissionLink}
                                  placeholder="Paste submission link here"
                                  placeholderTextColor="#999"
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  keyboardType="url"
                                />

                                <TouchableOpacity
                                  style={styles.secondaryButton}
                                  onPress={handleAddLinkSubmission}
                                  activeOpacity={0.85}
                                >
                                  <Text style={styles.secondaryButtonText}>+ Add Link</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {!hasFiles ? (
                              <TouchableOpacity
                                style={[styles.uploadButton, isUploadingFile && styles.sendButtonDisabled]}
                                disabled={isUploadingFile}
                                onPress={handleFileUpload}
                              >
                                <Text style={styles.uploadButtonText}>
                                  {isUploadingFile ? 'Uploading...' : '+ Upload File'}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <>
                                {canEditFiles && (
                                  <TouchableOpacity
                                    onPress={handleFileUpload}
                                    disabled={isUploadingFile}
                                    style={[styles.secondaryButton, isUploadingFile && styles.sendButtonDisabled]}
                                  >
                                    <Text style={styles.secondaryButtonText}>
                                      {isUploadingFile ? 'Uploading...' : '+ Add Another File'}
                                    </Text>
                                  </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                  onPress={handleSubmitAssignment}
                                  disabled={isSubmittingAssignment}
                                  style={[
                                    styles.uploadButton,
                                    { backgroundColor: '#308C5D' },
                                    isSubmittingAssignment && styles.sendButtonDisabled,
                                  ]}
                                >
                                  <Text style={styles.uploadButtonText}>
                                    {isSubmittingAssignment ? 'SUBMITTING...' : 'SUBMIT'}
                                  </Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#EFEFEF',
    borderRadius: 999,
  },
  filterChipActive: {
    backgroundColor: '#D32F2F',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  filterChipTextActive: {
    color: '#FFF',
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
  courseName: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
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
  relatedMaterialFileName: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  materialWarningText: {
    color: '#B26A00',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 8,
  },

  attachmentFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    padding: 12,
    marginBottom: 8,
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
  disabledRemoveButton: {
  opacity: 0.45,
},
  fileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  fileOpenButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileOpenButtonDisabled: {
    backgroundColor: '#D9A0A0',
  },
  fileOpenButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
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
  linkSubmitBox: {
    gap: 8,
    marginTop: 8,
  },
  linkInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#000',
  },
  lockedSubmissionBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  lockedSubmissionTitle: {
    color: '#111',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  lockedSubmissionText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
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
    marginVertical: 20,
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

export default Assignments;