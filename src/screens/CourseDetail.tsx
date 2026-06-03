import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useRef, useState } from "react";
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
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  AssignmentComment,
  AssignmentCourse,
  AssignmentFileUpload,
  AssignmentItem,
} from "./Assignments";

type CurrentStudent = {
  studentId: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function getApiBaseUrl() {
  if (Platform.OS === "web") return "http://localhost:5000";
  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";
  const host = possibleHost.split(":")[0];
  if (host) return `http://${host}:5000`;
  return "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();
const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

const getDisplayFileSize = (bytes?: number | null) => {
  if (!bytes || !Number.isFinite(bytes)) return "Uploaded file";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

async function readPickedFileBase64(asset: any): Promise<string | null> {
  if (Platform.OS === "web") {
    if (asset?.base64) return asset.base64;
    if (asset?.file) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            resolve(result.includes(",") ? result.split(",")[1] : result);
          } else {
            reject(new Error("Failed to read selected file."));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read selected file."));
        reader.readAsDataURL(asset.file as File);
      });
    }
  }
  if (asset?.uri) {
    return await FileSystem.readAsStringAsync(asset.uri, {
      encoding: "base64" as any,
    });
  }
  return null;
}

export interface Material {
  id: string;
  title: string;
  type: "pdf" | "video" | "document" | "link";
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
  fileSize?: string;
  uri?: string;
  fileUrl?: string;
  fileType?: string;
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
  status: "pending" | "submitted" | "graded";
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
  fileName?: string | null;
  fileUrl?: string | null;
  fileUri?: string | null;
  fileType?: string | null;
  storagePath?: string | null;
  bucketPath?: string | null;
  files?: AssignmentFile[];
  comments?: CourseAssignmentComment[];
  assignmentType?: 'regular' | 'game_based'; // 👈 ADDED
  gameType?: string;                         // 👈 ADDED
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
  initialTab?: "materials" | "assignments";
  autoOpenAssignmentId?: string | null;
  onConsumedAutoOpenAssignment?: () => void;
  onGenerateActivity?: (assignment: AssignmentItem) => void;
  onUpdateAssignmentStatus?: (assignmentId: string, status: AssignmentItem['status']) => void;
  onRefreshSubmissions?: () => Promise<void> | void;
  assignmentComments: Record<string, AssignmentComment[]>;
  assignmentFiles: Record<string, AssignmentFileUpload[]>;
  onAddComment: (assignmentId: string, content: string) => void;
  onAddFile: (assignmentId: string, file: AssignmentFileUpload) => void;
  onRemoveFile: (assignmentId: string, fileId: string) => void;
  currentStudent?: CurrentStudent;
  isGeneratingActivity?: boolean;
  completedActivityScores?: Record<
    string,
    {
      scorePercent: number | null;
      completed: boolean;
      mastered: boolean;
      activityId?: string;
      completedAt?: string | null;
    }
  >;
  onPlayGame?: (assignment: AssignmentItem) => void; // 👈 ADDED
}

const EMPTY_COURSE: AssignmentCourse = {
  id: "",
  name: "No Course Selected",
  code: "",
  instructor: "",
  description: "No course data available.",
  semester: "",
  schoolYear: "",
  section: "",
  materials: [],
  assignments: [],
};

const CourseDetail = ({
  course,
  initialTab = "materials",
  onBack,
  autoOpenAssignmentId = null,
  onConsumedAutoOpenAssignment,
  onGenerateActivity,
  onUpdateAssignmentStatus,
  onRefreshSubmissions,
  assignmentComments,
  assignmentFiles,
  onAddComment,
  onAddFile,
  onRemoveFile,
  currentStudent,
  isGeneratingActivity = false,
  completedActivityScores = {},
  onPlayGame, // 👈 ADDED
}: CourseDetailProps) => {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isLargeScreen = width >= 768;

  const safeCourse = course ?? EMPTY_COURSE;

  const [activeTab, setActiveTab] = useState<"materials" | "assignments">(
    initialTab,
  );
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentItem | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<
    AssignmentCourse["materials"][number] | null
  >(null);
  const [newComment, setNewComment] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const autoHandledRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const getScorePercent = (assignment: AssignmentItem) => {
    if (
      assignment.status !== "graded" ||
      assignment.points === undefined ||
      assignment.maxPoints === undefined ||
      assignment.maxPoints === 0
    ) {
      return null;
    }
    return Math.round((assignment.points / assignment.maxPoints) * 100);
  };

  const getRecommendationType = (
    assignment: AssignmentItem,
  ): "review" | "practice" | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return "review";
    if (percent < 75) return "practice";
    return null;
  };

  const getRecommendationLabel = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === "review") return "Review Activity";
    if (recommendation === "practice") return "Practice Quiz";
    return null;
  };

  const getRecommendationColor = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === "review") return "#D32F2F";
    if (recommendation === "practice") return "#F57C00";
    return "#999";
  };

  const getMaterialIconName = (type: string) => {
    switch (type) {
      case "pdf":
        return "document-text-outline";
      case "video":
        return "videocam-outline";
      case "document":
        return "document-outline";
      case "link":
        return "link-outline";
      default:
        return "attach-outline";
    }
  };

  const getRelatedMaterials = (assignment: AssignmentItem) => {
    if (!assignment.materialIds?.length) return [];
    return safeCourse.materials.filter((m) =>
      assignment.materialIds?.includes(m.id),
    );
  };

  const getCompletedActivityScore = (assignment: AssignmentItem) => {
    return completedActivityScores[assignment.id] || null;
  };

  const hasMasteredGeneratedActivity = (assignment: AssignmentItem) => {
    const activityScore = getCompletedActivityScore(assignment);
    return (
      !!activityScore?.completed &&
      activityScore.scorePercent !== null &&
      activityScore.scorePercent >= 75
    );
  };

  const canGenerateActivity = (assignment: AssignmentItem) => {
    const score = getScorePercent(assignment);
    return (
      score !== null &&
      score < 75 &&
      getRelatedMaterials(assignment).length > 0 &&
      !hasMasteredGeneratedActivity(assignment)
    );
  };

  const getMaterialUrl = (
    material: AssignmentCourse["materials"][number] | null,
  ): string | null => {
    if (!material) return null;
    const raw =
      material.fileUri || material.fileUrl || (material as any).uri || null;
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed || null;
  };

  const getAssignmentFileUrl = (assignment?: AssignmentItem | null) => {
    const raw =
      assignment?.fileUrl ||
      assignment?.fileUri ||
      (assignment as any)?.downloadUrl ||
      (assignment as any)?.attachmentUrl ||
      null;
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed || null;
  };

  const getAssignmentFileName = (assignment?: AssignmentItem | null) => {
    return (
      assignment?.fileName ||
      (assignment as any)?.name ||
      (assignment as any)?.attachmentName ||
      "Assignment attachment"
    );
  };

  const handleOpenMaterialPreview = (
    material: AssignmentCourse["materials"][number],
  ) => {
    setSelectedMaterial(material);
  };

  const closeMaterialModal = () => setSelectedMaterial(null);

  const handleOpenUploadedFile = async (fileUri?: string | null) => {
    const url = fileUri?.trim();
    if (!url) {
      Alert.alert("No File", "This file has no URL yet.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Open Failed", "Unable to open this file.");
    }
  };

  const handleGenerateActivity = (
    assignment: AssignmentItem,
    silent = false,
  ) => {
    if (isGeneratingActivity) return;
    if (!canGenerateActivity(assignment)) {
      if (!silent) {
        const score = getScorePercent(assignment);
        if (score !== null && score >= 75) {
          Alert.alert(
            "Not available",
            "Generate Activity is only available for graded assignments below 75%.",
          );
        } else if (hasMasteredGeneratedActivity(assignment)) {
          const activityScore = getCompletedActivityScore(assignment);
          Alert.alert(
            "Already mastered",
            `You already scored ${activityScore?.scorePercent ?? 75}% or above on the generated follow-up activity for this assignment.`,
          );
        } else {
          Alert.alert(
            "Not available",
            "This assignment needs at least one teacher-selected related material. The AI activity will use that material, not the assignment title.",
          );
        }
      }
      return;
    }

    const relatedMaterials = getRelatedMaterials(assignment);

    setSelectedAssignment(null);
    onGenerateActivity?.({
      ...assignment,
      relatedMaterials,
      materialIds: relatedMaterials.map((material) => material.id),
    } as any);

    if (!silent) {
      Alert.alert(
        "Activity Generated",
        "The activity will be generated from the related materials selected by the teacher. The backend will download/read the Firebase material files and create questions from that content.",
      );
    }
  };

  useEffect(() => {
    if (!autoOpenAssignmentId) return;
    if (autoHandledRef.current === autoOpenAssignmentId) return;

    const targetAssignment = safeCourse.assignments.find(
      (assignment) => assignment.id === autoOpenAssignmentId,
    );

    if (!targetAssignment) {
      onConsumedAutoOpenAssignment?.();
      return;
    }

    autoHandledRef.current = autoOpenAssignmentId;
    setActiveTab("assignments");
    setSelectedAssignment(targetAssignment as any);

    setTimeout(() => {
      handleGenerateActivity(targetAssignment as any, true);
      onConsumedAutoOpenAssignment?.();
    }, 150);
  }, [autoOpenAssignmentId, safeCourse.assignments, completedActivityScores]);

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;
    onAddComment(selectedAssignment.id, newComment);
    setNewComment("");
  };

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    if (!course?.id) {
      Alert.alert("No class", "This assignment is not connected to a class.");
      return;
    }
    try {
      setIsUploadingFile(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        base64: Platform.OS === "web",
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const fileBase64 = await readPickedFileBase64(file);

        if (!fileBase64) {
          throw new Error("Unable to read selected file.");
        }

        const uploadResponse = await apiFetch(`${API_BASE_URL}/upload-class-file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: course.id,
            fileBase64,
            fileName: file.name || "submission-file",
            fileType: file.mimeType || "application/octet-stream",
            kind: "submission",
          }),
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData?.error || "Failed to upload file.");
        }

        onAddFile(selectedAssignment.id, {
          id: `f${Date.now()}`,
          fileName: uploadData?.data?.fileName || file.name || "file",
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
    } catch (error: any) {
      Alert.alert("Upload failed", error?.message || "Could not upload the selected file.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const normalizeSubmissionLink = (value: string) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleAddLinkSubmission = () => {
    if (!selectedAssignment) return;
    const linkUrl = normalizeSubmissionLink(submissionLink);
    if (!linkUrl) {
      Alert.alert("Missing link", "Please paste a submission link first.");
      return;
    }

    onAddFile(selectedAssignment.id, {
      id: `link-${Date.now()}`,
      fileName: "Submitted link",
      fileSize: "Link submission",
      uploadedDate: new Date().toLocaleString(),
      fileUrl: linkUrl,
      fileType: "text/uri-list",
      isSubmitted: false,
      source: "student",
    });

    setSubmissionLink("");
  };

  const closeAssignmentModal = () => {
    setSelectedAssignment(null);
    setNewComment("");
    setSubmissionLink("");
  };

  const isAssignmentSubmitted = (assignment?: AssignmentItem | null) => {
    return assignment?.status === "submitted" || assignment?.status === "graded";
  };

  const isAssignmentGraded = (assignment?: AssignmentItem | null) => {
    return assignment?.status === "graded";
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

  const syncSelectedAssignmentStatus = (status: AssignmentItem['status']) => {
    if (!selectedAssignment) return;
    setSelectedAssignment((prev) => (prev ? { ...prev, status } : prev));
    onUpdateAssignmentStatus?.(selectedAssignment.id, status);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !course?.id) return;
    if (isAssignmentSubmitted(selectedAssignment)) {
      return;
    }

    if (!currentStudent?.studentId) {
      Alert.alert("Missing student", "Student account information is missing. Please sign in again.");
      return;
    }

    const files = assignmentFiles[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert(
        "No files",
        "Please upload at least one file before submitting.",
      );
      return;
    }

    const file = files[0];
    if (!file.fileUrl) {
      Alert.alert("Upload still needed", "Please re-upload the file before submitting.");
      return;
    }

    try {
      setIsSubmittingAssignment(true);
      const studentName = `${currentStudent.firstName || ""} ${currentStudent.lastName || ""}`.trim();

      const response = await apiFetch(`${API_BASE_URL}/create-submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: course.id,
          assignmentId: selectedAssignment.id,
          studentUid: currentStudent.authUid || null,
          studentId: currentStudent.studentId,
          studentName,
          status: "submitted",
          score: null,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType || "application/octet-stream",
          storagePath: file.storagePath || null,
          bucketPath: file.bucketPath || null,
          feedback: null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit assignment.");
      }

      syncSelectedAssignmentStatus("submitted");
      await onRefreshSubmissions?.();
      Alert.alert("Submitted", "Your assignment was submitted successfully.");
    } catch (error: any) {
      Alert.alert("Submit Failed", error?.message || "Unable to submit assignment.");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleUnsubmitAssignment = async () => {
    if (!selectedAssignment || !course?.id) return;
    if (selectedAssignment.status === "graded") {
      Alert.alert("Already graded", "This assignment has already been graded and cannot be unsubmitted.");
      return;
    }

    if (!currentStudent?.studentId) {
      Alert.alert("Missing student", "Student account information is missing. Please sign in again.");
      return;
    }

    try {
      setIsSubmittingAssignment(true);

      const response = await apiFetch(`${API_BASE_URL}/unsubmit-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: course.id,
          assignmentId: selectedAssignment.id,
          studentUid: currentStudent.authUid || null,
          studentId: currentStudent.studentId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to unsubmit assignment.");
      }

      syncSelectedAssignmentStatus("pending");
      await onRefreshSubmissions?.();
      Alert.alert("Unsubmitted", "Your file is still attached. You can edit it and submit again.");
    } catch (error: any) {
      Alert.alert("Unsubmit Failed", error?.message || "Unable to unsubmit assignment.");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const renderMaterialItem = ({
    item,
  }: {
    item: AssignmentCourse["materials"][number];
  }) => (
    <TouchableOpacity
      style={styles.materialCard}
      activeOpacity={0.85}
      onPress={() => handleOpenMaterialPreview(item)}
    >
      <View style={styles.materialIcon}>
        <Ionicons
          name={getMaterialIconName(item.type)}
          size={24}
          color="#D32F2F"
        />
      </View>
      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle}>{item.title}</Text>
        <Text style={styles.materialType}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)} •{" "}
          {item.uploadedDate}
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
            {!!((item as any).description || item.topic) && (
              <Text style={styles.assignmentTopicText}>
                Instruction: {(item as any).description || item.topic}
              </Text>
            )}
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
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
            Based on: {relatedMaterials.map((m) => m.title).join(", ")}
          </Text>
        )}

        {hasMasteredGeneratedActivity(item) ? (
          <View style={styles.masteredActivityBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
            <Text style={styles.masteredActivityText}>
              Follow-up mastered ({getCompletedActivityScore(item)?.scorePercent}%)
            </Text>
          </View>
        ) : recommendationLabel ? (
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
        ) : null}
      </TouchableOpacity>
    );
  };

  const courseYear =
    (safeCourse as any).year ||
    (safeCourse as any).yearLevel ||
    (safeCourse as any).level ||
    "";
  const courseSection = safeCourse.section || "";
  const courseSemester = safeCourse.semester || "";
  const courseSchoolYear = safeCourse.schoolYear || "";
  const courseCode = safeCourse.code || (safeCourse as any).courseCode || "";
  const classCode =
    (safeCourse as any).classCode ||
    (safeCourse as any).joinCode ||
    courseCode ||
    "No Code";

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
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.screenScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.courseHeader,
          {
            paddingHorizontal: isLargeScreen ? 60 : 16,
            paddingTop: isLargeScreen ? 20 : 16,
            paddingBottom: isLargeScreen ? 24 : 18,
          },
        ]}
      >
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        <Text style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24 }]}>
          {safeCourse.name}
        </Text>

        {!!safeCourse.description && (
          <Text style={[styles.description, { fontSize: isSmallPhone ? 12 : 13 }]} numberOfLines={isLargeScreen ? 2 : 3}>
            {safeCourse.description}
          </Text>
        )}

        <View style={styles.headerInfoCard}>
          <View style={styles.headerInfoRow}>
            <Text style={styles.headerInfoLabel}>INSTRUCTOR</Text>
            <Text style={styles.headerInfoValue} numberOfLines={1}>
              {safeCourse.instructor || "No Instructor"}
            </Text>
          </View>

          <View style={[styles.headerDetailsGrid, isLargeScreen && styles.headerDetailsGridDesktop]}>
            {!!courseYear && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="school-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Year</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseYear}</Text>
                </View>
              </View>
            )}

            {!!courseSection && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="people-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Section</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSection}</Text>
                </View>
              </View>
            )}

            {!!courseSemester && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="calendar-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Semester</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSemester}</Text>
                </View>
              </View>
            )}

            {!!courseSchoolYear && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="time-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>School Year</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSchoolYear}</Text>
                </View>
              </View>
            )}

            <View style={[styles.classCodeBox, isLargeScreen && styles.headerDetailItemDesktop]}>
              <Ionicons name="copy-outline" size={14} color="#D32F2F" />
              <View style={styles.classCodeTextWrap}>
                <Text style={styles.classCodeLabel}>{(safeCourse as any).classCode ? "CLASS CODE" : "COURSE CODE"}</Text>
                <Text style={styles.classCodeValue} numberOfLines={1}>{classCode}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab("materials")}
          style={[styles.tab, activeTab === "materials" && styles.tabActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={activeTab === "materials" ? "#D32F2F" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "materials" && styles.tabTextActive,
              ]}
            >
              Materials ({safeCourse.materials.length})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("assignments")}
          style={[styles.tab, activeTab === "assignments" && styles.tabActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={activeTab === "assignments" ? "#D32F2F" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "assignments" && styles.tabTextActive,
              ]}
            >
              Assignments ({safeCourse.assignments.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.contentContainer,
          { paddingHorizontal: wp(isSmallPhone ? "3" : "4") },
        ]}
      >
        {activeTab === "materials" ? (
          safeCourse.materials.length > 0 ? (
            <FlatList
              data={safeCourse.materials}
              renderItem={renderMaterialItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          ) : (
            <Text style={styles.emptyText}>No materials available yet</Text>
          )
        ) : safeCourse.assignments.length > 0 ? (
          <FlatList
            data={safeCourse.assignments as any[]}
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
                          {selectedMaterial.uploadedDate || "Unknown date"}
                        </Text>
                      </View>

                      <Text style={styles.inputLabel}>File Name</Text>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>
                          {selectedMaterial.fileName || "No uploaded file"}
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
                            !selectedMaterialUrl &&
                              styles.confirmButtonDisabled,
                          ]}
                          disabled={!selectedMaterialUrl}
                          onPress={() =>
                            handleOpenUploadedFile(selectedMaterialUrl)
                          }
                        >
                          <Text style={styles.confirmButtonText}>
                            Open File
                          </Text>
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
                { width: isLargeScreen ? "72%" : width < 480 ? "92%" : "88%" },
                !isLargeScreen && styles.modalWrapperMobile,
              ]}
            >
              <ScrollView contentContainerStyle={styles.detailContainer}>
                {selectedAssignment && (
                  <>
                    <View style={styles.detailContent}>
                      <View style={[styles.infoCard, !isLargeScreen && styles.infoCardMobile]}>
                        <TouchableOpacity
                          onPress={closeAssignmentModal}
                          style={styles.modalCloseFloating}
                        >
                          <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>

                        <Text
                          style={[
                            styles.assignmentModalTitle,
                            !isLargeScreen && styles.assignmentModalTitleMobile,
                          ]}
                        >
                          {selectedAssignment.title}
                        </Text>

                        <View style={styles.infoMetaBlock}>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Class</Text>
                            <Text style={styles.infoMetaValue} numberOfLines={3}>
                              {safeCourse.name}
                            </Text>
                          </View>

                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Semester</Text>
                            <Text style={styles.infoMetaValue}>
                              {safeCourse.semester}
                            </Text>
                          </View>

                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>School Year</Text>
                            <Text style={styles.infoMetaValue}>
                              {safeCourse.schoolYear}
                            </Text>
                          </View>

                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Instructor</Text>
                            <Text style={styles.infoMetaValue} numberOfLines={3}>
                              {safeCourse.instructor}
                            </Text>
                          </View>

                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Due</Text>
                            <Text style={[styles.infoMetaValue, styles.infoMetaValueDue]}>
                              {selectedAssignment.dueDate}
                            </Text>
                          </View>

                          {selectedAssignment.maxPoints !== undefined && (
                            <View style={styles.infoMetaRow}>
                              <Text style={styles.infoMetaLabel}>Points</Text>
                              <Text style={styles.infoMetaValue}>
                                {selectedAssignment.points}/{selectedAssignment.maxPoints}
                              </Text>
                            </View>
                          )}

                          {getScorePercent(selectedAssignment) !== null && (
                            <View style={styles.infoMetaRow}>
                              <Text style={styles.infoMetaLabel}>Score</Text>
                              <Text style={styles.infoMetaValue}>
                                {getScorePercent(selectedAssignment)}%
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.infoInstructionBlock}>
                          <Text style={styles.infoMetaLabel}>Instruction</Text>
                          <Text style={styles.infoInstructionText}>
                            {(selectedAssignment as any).description || "No instruction provided."}
                          </Text>
                        </View>

                        {hasMasteredGeneratedActivity(selectedAssignment) ? (
                          <View style={styles.masteredActivityNotice}>
                            <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.masteredActivityNoticeTitle}>
                                Follow-up activity mastered
                              </Text>
                              <Text style={styles.masteredActivityNoticeText}>
                                You scored {getCompletedActivityScore(selectedAssignment)?.scorePercent}% on the generated follow-up activity, so the Generate Activity button is hidden for this assignment.
                              </Text>
                            </View>
                          </View>
                        ) : !canGenerateActivity(selectedAssignment) &&
                          getScorePercent(selectedAssignment) !== null &&
                          getScorePercent(selectedAssignment)! < 75 && (
                            <Text style={styles.materialWarningText}>
                              The teacher still needs to attach related
                              materials before AI activity generation can use
                              file content.
                            </Text>
                          )}
                      </View>

                      {canGenerateActivity(selectedAssignment) && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>
                            🎯 Follow-Up Activity
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              handleGenerateActivity(selectedAssignment)
                            }
                            disabled={isGeneratingActivity}
                            style={[
                              styles.uploadButtonWide,
                              {
                                backgroundColor:
                                  getRecommendationColor(selectedAssignment),
                                opacity: isGeneratingActivity ? 0.75 : 1,
                              },
                            ]}
                          >
                            {isGeneratingActivity ? (
                              <View style={styles.loadingButtonContent}>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text style={styles.uploadButtonText}>
                                  Generating...
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.uploadButtonText}>
                                Generate Activity
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📄 Assignment File</Text>
                        {getTeacherAssignmentFiles(selectedAssignment).length > 0 ? (
                          <View>
                            {getTeacherAssignmentFiles(selectedAssignment).map((file) => (
                              <View key={file.id} style={styles.attachmentFileCard}>
                                <Ionicons name="attach-outline" size={20} color="#D32F2F" />
                                <View style={styles.fileInfo}>
                                  <Text style={styles.fileName}>{file.fileName}</Text>
                                  <Text style={styles.fileDetails}>Uploaded by your teacher for this assignment</Text>
                                </View>
                                <TouchableOpacity
                                  style={[styles.fileOpenButton, !file.fileUrl && styles.fileOpenButtonDisabled]}
                                  disabled={!file.fileUrl}
                                  activeOpacity={0.85}
                                  onPress={() => handleOpenUploadedFile(file.fileUrl)}
                                >
                                  <Ionicons name="open-outline" size={15} color="#FFF" />
                                  <Text style={styles.fileOpenButtonText}>Open</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.emptyText}>No assignment file attached.</Text>
                        )}
                      </View>

                      {/* 👇 GAME BASED ASSIGNMENT BUTTON */}
                      {selectedAssignment.assignmentType === 'game_based' && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>🎮 Game-Based Assignment</Text>
                          <Text style={{ color: '#666', marginBottom: 10, fontSize: 13 }}>
                            This is an interactive game assignment. Click below to start playing!
                          </Text>
                          <TouchableOpacity
                            style={[styles.uploadButtonWide, { backgroundColor: '#4CAF50' }]}
                            onPress={() => onPlayGame && onPlayGame(selectedAssignment)}
                          >
                            <Text style={styles.uploadButtonText}>Start Game</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          📚 Related Materials
                        </Text>
                        {getRelatedMaterials(selectedAssignment).length > 0 ? (
                          getRelatedMaterials(selectedAssignment).map(
                            (material) => (
                              <TouchableOpacity
                                key={material.id}
                                style={styles.relatedMaterialItem}
                                activeOpacity={0.85}
                                onPress={() =>
                                  handleOpenMaterialPreview(material)
                                }
                              >
                                <Text style={styles.relatedMaterialTitle}>
                                  {material.title}
                                </Text>
                                <Text style={styles.relatedMaterialMeta}>
                                  {material.type} • {material.uploadedDate}
                                </Text>
                                {!!material.fileName && (
                                  <Text style={styles.relatedMaterialFileName}>
                                    {material.fileName}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            ),
                          )
                        ) : (
                          <Text style={styles.emptyText}>
                            No linked materials.
                          </Text>
                        )}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📤 Your Uploads</Text>
                        {getSubmittedFiles(selectedAssignment).length > 0 ? (
                          <View>
                            {getSubmittedFiles(selectedAssignment).map(
                              (file) => (
                                <View key={file.id} style={styles.fileItem}>
                                  <Ionicons
                                    name={file.fileType === "text/uri-list" ? "link-outline" : "document-text-outline"}
                                    size={20}
                                    color="#D32F2F"
                                  />
                                  <View style={styles.fileInfo}>
                                    <Text style={styles.fileName}>
                                      {file.fileName}
                                    </Text>
                                    <Text style={styles.fileDetails}>
                                      {file.fileSize} • {file.uploadedDate}
                                    </Text>
                                  </View>

                                  <View style={styles.fileActionsRow}>
                                    <TouchableOpacity
                                      style={[styles.fileOpenButton, !file.fileUrl && styles.fileOpenButtonDisabled]}
                                      disabled={!file.fileUrl}
                                      activeOpacity={0.85}
                                      onPress={() => handleOpenUploadedFile(file.fileUrl)}
                                    >
                                      <Ionicons name="open-outline" size={15} color="#FFF" />
                                      <Text style={styles.fileOpenButtonText}>Open</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      disabled={isAssignmentSubmitted(selectedAssignment)}
                                      onPress={() =>
                                        onRemoveFile(
                                          selectedAssignment.id,
                                          file.id,
                                        )
                                      }
                                    >
                                      <Ionicons
                                        name="close"
                                        size={20}
                                        color={isAssignmentSubmitted(selectedAssignment) ? "#D9A0A0" : "#D32F2F"}
                                      />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ),
                            )}
                          </View>
                        ) : (
                          <Text style={styles.emptyText}>
                            No student submission added yet
                          </Text>
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
                                  <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.lockedSubmissionTitle}>Assignment already graded</Text>
                                    <Text style={styles.lockedSubmissionText}>
                                      Your submission is locked. You can no longer upload, remove, submit, or unsubmit files.
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          }

                          if (isSubmitted) {
                            return (
                              <View style={styles.uploadActionsRow}>
                                <View style={styles.lockedSubmissionBox}>
                                  <Ionicons name="cloud-done-outline" size={18} color="#1565C0" />
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.lockedSubmissionTitle}>Already submitted</Text>
                                    <Text style={styles.lockedSubmissionText}>
                                      Your teacher has received this assignment. Unsubmit only if you need to change your file before grading.
                                    </Text>
                                  </View>
                                </View>

                                <TouchableOpacity
                                  onPress={handleUnsubmitAssignment}
                                  disabled={isSubmittingAssignment}
                                  style={[
                                    styles.uploadButtonWide,
                                    { backgroundColor: "#D32F2F" },
                                    isSubmittingAssignment && styles.sendButtonDisabled,
                                  ]}
                                >
                                  <Text style={styles.uploadButtonText}>
                                    {isSubmittingAssignment ? "UNSUBMITTING..." : "UNSUBMIT"}
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
                                  style={[styles.uploadButtonWide, isUploadingFile && styles.sendButtonDisabled]}
                                  disabled={isUploadingFile}
                                  onPress={handleFileUpload}
                                >
                                  <Text style={styles.uploadButtonText}>
                                    {isUploadingFile ? "Uploading..." : "+ Upload File"}
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
                                        {isUploadingFile ? "Uploading..." : "+ Add Another File"}
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  <TouchableOpacity
                                    onPress={handleSubmitAssignment}
                                    disabled={isSubmittingAssignment}
                                    style={[
                                      styles.uploadButtonWide,
                                      { backgroundColor: "#308C5D" },
                                      isSubmittingAssignment && styles.sendButtonDisabled,
                                    ]}
                                  >
                                    <Text style={styles.uploadButtonText}>
                                      {isSubmittingAssignment ? "SUBMITTING..." : "SUBMIT"}
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
                        {(assignmentComments[selectedAssignment.id] || [])
                          .length > 0 ? (
                          <View>
                            {(
                              assignmentComments[selectedAssignment.id] || []
                            ).map((comment) => (
                              <View
                                key={comment.id}
                                style={[
                                  styles.commentItem,
                                  comment.isInstructor &&
                                    styles.instructorComment,
                                ]}
                              >
                                <View style={styles.commentHeader}>
                                  <Text style={styles.commentAuthor}>
                                    {comment.author}
                                  </Text>
                                  {comment.isInstructor && (
                                    <Text style={styles.teacherBadge}>
                                      Teacher
                                    </Text>
                                  )}
                                </View>
                                <Text style={styles.commentContent}>
                                  {comment.content}
                                </Text>
                                <Text style={styles.commentTime}>
                                  {comment.timestamp}
                                </Text>
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

export default CourseDetail;

const styles = StyleSheet.create({
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  screenScroll: { flex: 1, backgroundColor: "#FFFFFF" },
  screenScrollContent: { paddingBottom: 40 },
  emptyScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 24,
  },
  emptyScreenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  emptyScreenText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyBackButton: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBackButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  courseHeader: {
    backgroundColor: "#D32F2F",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  courseCode: {
    fontWeight: "800",
    color: "rgba(255,255,255,0.74)",
    marginBottom: 4,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  courseName: {
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  instructor: {
    color: "rgba(255,255,255,0.92)",
    marginBottom: 6,
    fontWeight: "600",
  },
  metaText: {
    color: "rgba(255,255,255,0.88)",
    marginBottom: 4,
    fontWeight: "500",
  },
  description: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
    marginBottom: 14,
    fontWeight: "500",
  },
  headerInfoCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    padding: 14,
  },
  headerInfoRow: { marginBottom: 12 },
  headerInfoLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerInfoValue: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  headerDetailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerDetailsGridDesktop: { flexWrap: "nowrap", alignItems: "stretch" },
  headerDetailItemDesktop: { flexBasis: 0, flexGrow: 1, minWidth: 0 },
  academicInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: "100%",
  },
  academicInfoTextWrap: { flex: 1 },
  academicInfoLabel: {
    color: "#8A8A8A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  academicInfoValue: { color: "#202124", fontSize: 12, fontWeight: "800", marginTop: 2 },
  classCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: "100%",
  },
  classCodeTextWrap: { flex: 1 },
  classCodeLabel: { color: "#8A8A8A", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  classCodeValue: { color: "#202124", fontSize: 13, fontWeight: "900", marginTop: 2 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingHorizontal: wp("2"),
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    paddingVertical: 14,
  },
  tabActive: { borderBottomColor: "#D32F2F" },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabText: { fontWeight: "600", color: "#999" },
  tabTextActive: { color: "#D32F2F" },
  contentContainer: {
    paddingVertical: hp("2"),
    backgroundColor: "#FFFFFF",
    maxWidth: 1100,
    alignSelf: "center",
    width: "100%",
  },
  materialCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: hp("1.5"),
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  materialIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FFF1F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("3"),
  },
  materialInfo: { flex: 1 },
  materialTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  materialType: { fontSize: 12, color: "#999" },
  materialFileName: {
    fontSize: 12,
    color: "#D32F2F",
    marginTop: 4,
    fontWeight: "600",
  },
  assignmentCard: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  assignmentInfo: { flex: 1, marginRight: 8 },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  assignmentTopicText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FDECEC",
  },
  statusText: {
    fontWeight: "700",
    textTransform: "capitalize",
    fontSize: 12,
    color: "#D32F2F",
  },
  assignmentFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E6E6E6",
    paddingTop: 8,
  },
  dueDateText: {
    color: "#D32F2F",
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 4,
  },
  pointsText: { fontSize: 12, color: "#666", fontWeight: "600" },
  relatedPreviewText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    lineHeight: 18,
  },
  masteredActivityBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
  },
  masteredActivityText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2E7D32",
  },
  masteredActivityNotice: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#B7E0BC",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  masteredActivityNoticeTitle: {
    color: "#1B5E20",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  masteredActivityNoticeText: {
    color: "#2E7D32",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  recommendationBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  recommendationText: { fontSize: 12, fontWeight: "700" },
  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 20,
    fontSize: 14,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.18)" },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  materialDropdownModal: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECECEC",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  joinDropdownHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  joinDropdownHeaderText: { flex: 1 },
  joinDropdownIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
  },
  joinDropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  joinDropdownSubtitle: { fontSize: 13, lineHeight: 18, color: "#6B7280" },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  infoBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DADDE2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    marginBottom: 16,
    justifyContent: "center",
  },
  infoBoxText: { fontSize: 14, color: "#111827", lineHeight: 20 },
  joinDropdownActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: { color: "#374151", fontWeight: "600", fontSize: 13 },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#D32F2F",
  },
  confirmButtonDisabled: { backgroundColor: "#F0A7A7" },
  confirmButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  modalWrapper: {
    maxHeight: "92%",
    maxWidth: 1180,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalWrapperMobile: {
    maxHeight: "94%",
    borderRadius: 14,
    overflow: "hidden",
  },
  detailContainer: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#FFF",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  closeButton: { fontSize: 20, color: "#666" },
  modalCloseFloating: {
    position: "absolute",
    top: -10,
    left: -10,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  infoCardMobile: {
    padding: 16,
    paddingTop: 28,
  },
  assignmentModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
    paddingLeft: 24,
    paddingRight: 8,
  },
  assignmentModalTitleMobile: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
    paddingLeft: 24,
    paddingRight: 4,
  },
  infoMetaBlock: {
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  infoMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoMetaLabel: {
    width: 90,
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
    lineHeight: 20,
  },
  infoMetaValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
    lineHeight: 20,
  },
  infoMetaValueDue: {
    color: "#D32F2F",
    fontWeight: "600",
  },
  infoInstructionBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingTop: 12,
    gap: 4,
  },
  infoInstructionText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#444",
    lineHeight: 20,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  detailContent: {},
  infoCard: {
    position: "relative",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 22,
    paddingTop: 28,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
  },
  detailCourseName: { color: "#666", fontWeight: "600", fontSize: 13 },
  detailMetaText: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  detailTopicText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  detailDescription: {
    color: "#666",
    marginVertical: 8,
    lineHeight: 20,
    fontSize: 13,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    flexWrap: "wrap",
  },
  infoLabel: { fontWeight: "600", color: "#666", fontSize: 13 },
  infoValue: { fontWeight: "700", color: "#000", fontSize: 13, marginLeft: 10 },
  materialWarningText: {
    marginTop: 12,
    fontSize: 12,
    color: "#B26A00",
    lineHeight: 18,
    fontWeight: "600",
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
  },
  relatedMaterialItem: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  relatedMaterialTitle: { fontWeight: "600", color: "#111", marginBottom: 4 },
  relatedMaterialMeta: {
    color: "#777",
    fontSize: 12,
    textTransform: "capitalize",
  },
  relatedMaterialFileName: {
    fontSize: 12,
    color: "#D32F2F",
    marginTop: 4,
    fontWeight: "600",
  },
  attachmentFileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  fileInfo: { flex: 1, marginLeft: 8 },
  fileName: { fontWeight: "600", color: "#000", marginBottom: 4, fontSize: 13 },
  fileDetails: { color: "#888", fontSize: 12 },
  fileActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 8,
  },
  fileOpenButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  fileOpenButtonDisabled: {
    backgroundColor: "#D9A0A0",
  },
  fileOpenButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  uploadActionsRow: { gap: 10, marginTop: 8 },
  linkSubmitBox: { gap: 8, marginTop: 8 },
  linkInput: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#000",
  },
  lockedSubmissionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  lockedSubmissionTitle: {
    color: "#111",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 3,
  },
  lockedSubmissionText: {
    color: "#666",
    fontSize: 12,
    lineHeight: 18,
  },
  commentItem: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },
  instructorComment: { backgroundColor: "#FFF9C4", borderLeftColor: "#FBC02D" },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAuthor: { fontWeight: "700", color: "#000", fontSize: 13 },
  teacherBadge: {
    fontWeight: "600",
    color: "#1f1f1f",
    backgroundColor: "#fbc12d99",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
  },
  commentContent: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
    marginBottom: 6,
  },
  commentTime: { fontSize: 11, color: "#888", fontWeight: "500" },
  commentInputContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 12,
  },
  commentInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    fontSize: 13,
    color: "#000",
    marginBottom: 8,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#CCC" },
  sendButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  secondaryButton: {
    backgroundColor: "#EFEFEF",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { color: "#444", fontWeight: "700", fontSize: 13 },
  uploadButtonWide: {
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 8,
  },
  uploadButtonText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});