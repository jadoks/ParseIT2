import Constants from "expo-constants";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,

  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import type { Assignment, Member, Submission } from "./TeacherCourseDetail2";

// Helper to resolve API URL
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
  fetch(url, { credentials: "include", ...options });

type Props = {
  members: Member[];
  currentAssignment?: Assignment;
  submissions: Submission[];
  onBack: () => void;
  onOpenUpdate: () => void;

  classId?: string;
  currentTeacher?: {
    teacherId?: string;
    authUid?: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  onGradeSubmission?: (
    submissionId: string,
    score: number,
    feedback: string
  ) => Promise<void> | void;
};

type AssignmentComment = {
  id: string;
  assignmentId: string;
  classId: string;
  studentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  isInstructor: boolean;
  timestamp: string;
  createdAt?: any;
  updatedAt?: any;
};

// UI-only filter keys — purely for client-side display filtering, no backend impact
type FilterKey = "all" | "submitted" | "graded" | "late" | "pending";

const TeacherSubmissionsSection = ({
  members,
  currentAssignment,
  submissions,
  onBack,
  onOpenUpdate,
  classId,
  currentTeacher,
  onGradeSubmission,
}: Props) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallPhone = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  const pagePadding = isSmallPhone ? 12 : isMobile ? 14 : isTablet ? 20 : 24;
  const mobileTopSpace = isMobile ? insets.top : 0;

  const cardWidth = isMobile ? "100%" : isLargeScreen ? "48.8%" : "48.5%";

  // ── Comment States (unchanged) ──
  const [allComments, setAllComments] = useState<AssignmentComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [studentCommentDrafts, setStudentCommentDrafts] = useState<Record<string, string>>({});
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── New UI-only state (display/navigation only — no business logic) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState<Record<string, boolean>>({});

  const currentTeacherId = useMemo(() => {
    return currentTeacher?.teacherId || currentTeacher?.authUid || currentTeacher?.email || "";
  }, [currentTeacher]);

  const assignmentSubmissions = useMemo(() => {
    if (!currentAssignment) return [];
    return submissions.filter((item) => item.assignmentId === currentAssignment.id);
  }, [submissions, currentAssignment]);

  const studentMembers = useMemo(() => {
    return members.filter((member) => {
      const lowerName = String(member.name || "").toLowerCase();
      const lowerHandle = String(member.handle || "").toLowerCase();
      return !lowerName.includes("teacher") && !lowerHandle.includes("teacher");
    });
  }, [members]);

  const completedCount = assignmentSubmissions.filter(
    (item) =>
      item.status === "submitted" ||
      item.status === "graded" ||
      item.status === "late"
  ).length;

  const pendingCount = studentMembers.length - completedCount;

  const lateCount = assignmentSubmissions.filter((item) => item.status === "late").length;

  const gradedSubmissionsForAvg = assignmentSubmissions.filter(
    (item) => item.status === "graded" && typeof item.score === "number"
  );
  const averageScore =
    gradedSubmissionsForAvg.length > 0
      ? Math.round(
          gradedSubmissionsForAvg.reduce((sum, item) => sum + (item.score || 0), 0) /
            gradedSubmissionsForAvg.length
        )
      : 0;

  const completionPercent =
    studentMembers.length > 0
      ? Math.round((completedCount / studentMembers.length) * 100)
      : 0;

  const totalScoreValue = Number(currentAssignment?.totalScore || 0);

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null);

  // ── Comment Fetching (unchanged) ──
  const fetchComments = async () => {
    if (!currentAssignment?.id) return;
    setIsLoadingComments(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${currentAssignment.id}`);
      const data = await response.json();
      if (response.ok) {
        setAllComments(Array.isArray(data?.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Fetch comments error:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (currentAssignment?.id) {
      fetchComments();
    } else {
      setAllComments([]);
    }
  }, [currentAssignment?.id]);

  // TRUE PER-STUDENT FILTERING (unchanged)
  const getStudentComments = (studentId: string) => {
    return allComments.filter((c) => c.studentId === studentId);
  };

  // ── Comment Actions (unchanged) ──
  const handleAddComment = async (studentId: string) => {
    const commentText = studentCommentDrafts[studentId]?.trim();
    if (!commentText || !currentAssignment?.id) return;

    setIsPostingComment(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: currentAssignment.id,
          classId: classId || (currentAssignment as any).classId || "",
          studentId: studentId,
          content: commentText,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStudentCommentDrafts((prev) => ({ ...prev, [studentId]: "" }));
        await fetchComments();
      } else {
        Alert.alert("Error", data?.error || "Failed to post comment.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to post comment.");
    } finally {
      setIsPostingComment(false);
    }
  };

  const startEditComment = (comment: AssignmentComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        cancelEdit();
        await fetchComments();
      } else {
        Alert.alert("Error", data?.error || "Failed to update comment.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update comment.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteModal = (commentId: string) => {
    setCommentToDeleteId(commentId);
    setDeleteModalVisible(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    setIsDeleting(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${commentToDeleteId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok) {
        setDeleteModalVisible(false);
        setCommentToDeleteId(null);
        await fetchComments();
      } else {
        Alert.alert("Error", data?.error || "Failed to delete comment.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to delete comment.");
    } finally {
      setIsDeleting(false);
    }
  };

  const canManageComment = (comment: AssignmentComment) => {
    if (!currentTeacherId) return false;
    return comment.authorId === currentTeacherId;
  };

  const getStudentSubmission = (studentId: string) => {
    return assignmentSubmissions.find((item) => item.studentId === studentId);
  };

  const getDotColor = (status?: Submission["status"]) => {
    switch (status) {
      case "graded": return "#10B981";
      case "submitted": return "#3B82F6";
      case "late": return "#EF4444";
      default: return "#9CA3AF";
    }
  };

  const getStatusText = (status?: Submission["status"]) => {
    switch (status) {
      case "graded": return "Graded";
      case "submitted": return "Submitted";
      case "late": return "Late";
      case "pending": return "Pending";
      default: return "No submission";
    }
  };

  const getStatusColor = (status?: Submission["status"]) => {
    switch (status) {
      case "graded": return "#065F46";
      case "submitted": return "#1E40AF";
      case "late": return "#991B1B";
      case "pending": return "#4B5563";
      default: return "#4B5563";
    }
  };

  const getStatusBgColor = (status?: Submission["status"]) => {
    switch (status) {
      case "graded": return "#D1FAE5";
      case "submitted": return "#DBEAFE";
      case "late": return "#FEE2E2";
      case "pending": return "#F3F4F6";
      default: return "#F3F4F6";
    }
  };

  // Maps a submission status (or lack thereof) to one of the five UI filter
  // chip keys. Pure presentational helper — does not touch submission data.
  const getFilterKeyForStatus = (status?: Submission["status"]): FilterKey => {
    switch (status) {
      case "graded": return "graded";
      case "submitted": return "submitted";
      case "late": return "late";
      default: return "pending";
    }
  };

  const getSubmissionFileUrl = (submission?: Submission) => {
    const candidate =
      (submission as any)?.fileUrl ||
      (submission as any)?.fileUri ||
      (submission as any)?.url ||
      null;

    if (!candidate || typeof candidate !== "string") return null;
    const trimmed = candidate.trim();
    return trimmed || null;
  };

  const isLinkSubmission = (submission?: Submission) => {
    const type = String((submission as any)?.fileType || "").toLowerCase();
    const url = getSubmissionFileUrl(submission);
    return type === "text/uri-list" || (!!url && !submission?.fileName);
  };

  const getSubmissionFileName = (submission?: Submission) => {
    if (isLinkSubmission(submission)) return "Submitted link";
    return (
      (submission as any)?.fileName ||
      (submission as any)?.name ||
      "Submitted file"
    );
  };

  const handleOpenSubmittedFile = async (submission?: Submission) => {
    const fileUrl = getSubmissionFileUrl(submission);
    if (!fileUrl) {
      Alert.alert("No file", "This student has no submitted file to view.");
      return;
    }
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (!supported) {
        Alert.alert("Cannot open file", "This file URL is not supported on this device.");
        return;
      }
      await Linking.openURL(fileUrl);
    } catch {
      Alert.alert("Open failed", "Unable to open the submitted file.");
    }
  };

  const handleSaveScore = async (submission: Submission) => {
    const rawScore = scoreDrafts[submission.id] ?? String(submission.score ?? "");
    const score = Number(rawScore);

    if (!Number.isFinite(score)) {
      Alert.alert("Invalid score", "Please enter a valid numeric score.");
      return;
    }
    if (score < 0) {
      Alert.alert("Invalid score", "Score cannot be lower than 0.");
      return;
    }
    if (totalScoreValue > 0 && score > totalScoreValue) {
      Alert.alert("Invalid score", `Score cannot be higher than ${totalScoreValue}.`);
      return;
    }
    if (!onGradeSubmission) {
      Alert.alert("Grading action missing", "Pass onGradeSubmission from TeacherCourseDetail2 to save this score.");
      return;
    }

    try {
      setSavingSubmissionId(submission.id);
      await onGradeSubmission(submission.id, score, "");
      Alert.alert("Saved", "Score saved successfully.");
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Unable to save score.");
    } finally {
      setSavingSubmissionId(null);
    }
  };

  // ── Display-only filtering (search + status chips). Does not touch
  // assignmentSubmissions, allComments, or any backend-facing state.
  // NOTE: search matches Student Name ONLY — email/handle is intentionally
  // excluded from the search comparison. ──
  const visibleStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return studentMembers.filter((student) => {
      if (activeFilter !== "all") {
        const submission = getStudentSubmission(student.id);
        if (getFilterKeyForStatus(submission?.status) !== activeFilter) return false;
      }
      if (!query) return true;
      const name = String(student.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [studentMembers, searchQuery, activeFilter, assignmentSubmissions]);

  // Keep a valid selection for desktop master-detail as the visible list changes
  useEffect(() => {
    if (isLargeScreen && visibleStudents.length > 0) {
      const stillVisible = visibleStudents.some((s) => s.id === selectedStudentId);
      if (!stillVisible) {
        setSelectedStudentId(visibleStudents[0].id);
      }
    }
  }, [isLargeScreen, visibleStudents, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentMembers.find((s) => s.id === selectedStudentId) || null;
  }, [studentMembers, selectedStudentId]);

  const toggleCommentsExpanded = (studentId: string) => {
    setCommentsExpanded((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "submitted", label: "Submitted" },
    { key: "graded", label: "Graded" },
    { key: "late", label: "Late" },
    { key: "pending", label: "Pending" },
  ];

  // ── Reusable render pieces ──

  const renderStatusChip = (status?: Submission["status"], small?: boolean) => (
    <View
      style={[
        styles.statusChip,
        { backgroundColor: getStatusBgColor(status) },
        small && styles.statusChipSmall,
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: getDotColor(status) }]} />
      <Text
        style={[styles.statusChipText, { color: getStatusColor(status) }, small && styles.statusChipTextSmall]}
        numberOfLines={1}
      >
        {getStatusText(status)}
      </Text>
    </View>
  );

  const renderStudentListItem = (student: Member, variant: "list" | "grid" | "card") => {
    const submission = getStudentSubmission(student.id);
    const isSelected = selectedStudentId === student.id;

    if (variant === "list") {
      return (
        <TouchableOpacity
          key={student.id}
          activeOpacity={0.7}
          onPress={() => setSelectedStudentId(student.id)}
          style={[styles.listItem, isSelected && styles.listItemActive]}
          accessibilityRole="button"
          accessibilityLabel={`${student.name}, ${getStatusText(submission?.status)}`}
        >
          <View style={styles.listItemAvatar}>
            <MaterialCommunityIcons name="account" size={18} color={isSelected ? "#D32F2F" : "#9CA3AF"} />
          </View>
          <View style={styles.listItemTextWrap}>
            <Text style={[styles.listItemName, isSelected && styles.listItemNameActive]} numberOfLines={1}>
              {student.name}
            </Text>
            <Text style={styles.listItemHandle} numberOfLines={1}>
              {student.handle}
            </Text>
          </View>
          {submission?.status === "graded" && (
            <Text style={styles.listItemScore} numberOfLines={1}>
              {submission.score ?? 0}/{totalScoreValue}
            </Text>
          )}
          <View style={[styles.listItemDot, { backgroundColor: getDotColor(submission?.status) }]} />
        </TouchableOpacity>
      );
    }

    // grid (tablet) and card (mobile) variants both render the full card
    return renderStudentCard(student, variant === "card");
  };

  // Score / game score / submitted date / view-file link — the substance of
  // a submission, independent of how it's framed (card header vs. detail pane).
  const renderSubmissionMeta = (student: Member) => {
    const submission = getStudentSubmission(student.id);
    const fileUrl = getSubmissionFileUrl(submission);

    return (
      <View>
        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <Text style={styles.metaCellLabel}>⭐ Score</Text>
            <Text style={styles.metaCellValue}>
              {submission?.score ?? 0}/{totalScoreValue}
            </Text>
          </View>
          {(submission as any)?.gameScore !== undefined && (
            <View style={styles.metaCell}>
              <Text style={styles.metaCellLabel}>🎮 Game</Text>
              <Text style={styles.metaCellValue}>
                {(submission as any).gameScore}/{(submission as any).gameTotalQuestions || "?"}
                {(submission as any).attemptNumber > 1 ? ` (Att.${(submission as any).attemptNumber})` : ""}
              </Text>
            </View>
          )}
          <View style={styles.metaCell}>
            <Text style={styles.metaCellLabel}>📅 Submitted</Text>
            <Text style={styles.metaCellValue} numberOfLines={1}>
              {submission?.submittedAt || "Not yet"}
            </Text>
          </View>
        </View>

        {!!fileUrl && (
          <TouchableOpacity
            style={styles.viewFileButton}
            onPress={() => handleOpenSubmittedFile(submission)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isLinkSubmission(submission) ? "Open submitted link" : "View submitted file"}
          >
            <MaterialCommunityIcons
              name={
                isLinkSubmission(submission)
                  ? "link-variant"
                  : String((submission as any)?.fileType || "").startsWith("image/")
                    ? "image-outline"
                    : "file-document-outline"
              }
              size={16}
              color="#D32F2F"
            />
            <Text style={styles.viewFileText} numberOfLines={1}>
              {isLinkSubmission(submission) ? "Open" : "View"} {getSubmissionFileName(submission)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStudentCard = (student: Member, fullWidth: boolean) => {
    const submission = getStudentSubmission(student.id);
    const isSelected = selectedStudentId === student.id;

    return (
      <TouchableOpacity
        key={student.id}
        activeOpacity={0.85}
        onPress={() => setSelectedStudentId(student.id)}
        style={[
          styles.studentCard,
          fullWidth ? styles.studentCardFull : styles.studentCardGrid,
          isSelected && isTablet && styles.studentCardSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`View ${student.name}'s submission`}
      >
        <View style={styles.studentCardTopRow}>
          <View style={styles.studentCardIdentity}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={20} color="#D32F2F" />
            </View>
            <View style={styles.studentCardNameWrap}>
              <Text style={styles.studentCardName} numberOfLines={1}>
                {student.name}
              </Text>
              <Text style={styles.studentCardId} numberOfLines={1}>
                {student.id}
              </Text>
            </View>
          </View>
          {renderStatusChip(submission?.status, true)}
        </View>

        <View style={styles.cardDivider} />

        {renderSubmissionMeta(student)}
      </TouchableOpacity>
    );
  };

  const renderGradePanel = (student: Member) => {
    const submission = getStudentSubmission(student.id);
    const scoreDraft = submission
      ? scoreDrafts[submission.id] ?? String(submission.score ?? "")
      : "";
    const canGrade =
      !!submission &&
      (submission.status === "submitted" ||
        submission.status === "late" ||
        submission.status === "graded");
    const isSaving = !!submission && savingSubmissionId === submission.id;

    return (
      <View style={styles.gradePanel}>
        <Text style={styles.gradePanelTitle}>Grade</Text>
        <Text style={styles.gradePanelSubtitle}>
          {canGrade ? "Enter a score for this submission" : "No submission to grade yet"}
        </Text>

        <View style={styles.scoreRow}>
          <TextInput
            style={[styles.scoreInput, !canGrade && styles.inputDisabled]}
            value={scoreDraft}
            onChangeText={(value) => {
              if (!submission) return;
              setScoreDrafts((prev) => ({
                ...prev,
                [submission.id]: value.replace(/[^0-9.]/g, ""),
              }));
            }}
            editable={canGrade && !isSaving}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel="Score input"
          />
          <Text style={styles.maxScoreText}>/ {totalScoreValue}</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveScoreButton, (!canGrade || isSaving) && styles.disabledButton]}
          disabled={!canGrade || isSaving}
          onPress={() => submission && handleSaveScore(submission)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Save grade"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveScoreText}>
              {submission?.status === "graded" ? "Update Grade" : "Save Grade"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderComments = (student: Member, collapsedByDefault: boolean) => {
    const studentComments = getStudentComments(student.id);
    const commentDraft = studentCommentDrafts[student.id] || "";
    const isCollapsed = collapsedByDefault && !commentsExpanded[student.id];

    return (
      <View style={styles.commentsSection}>
        <TouchableOpacity
          style={styles.commentsSectionHeader}
          onPress={() => collapsedByDefault && toggleCommentsExpanded(student.id)}
          activeOpacity={collapsedByDefault ? 0.7 : 1}
          disabled={!collapsedByDefault}
        >
          <Text style={styles.commentsSectionTitle}>
            Comments{studentComments.length > 0 ? ` (${studentComments.length})` : ""}
          </Text>
          {collapsedByDefault && (
            <View style={styles.showCommentsBtn}>
              <Text style={styles.showCommentsBtnText}>{isCollapsed ? "Show" : "Hide"}</Text>
              <MaterialCommunityIcons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={16}
                color="#D32F2F"
              />
            </View>
          )}
        </TouchableOpacity>

        {!isCollapsed && (
          <View>
            {isLoadingComments ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#D32F2F" />
              </View>
            ) : studentComments.length > 0 ? (
              <View style={styles.bubbleList}>
                {studentComments.map((comment) => {
                  const isEditing = editingCommentId === comment.id;
                  const canManage = canManageComment(comment);

                  return (
                    <View
                      key={comment.id}
                      style={[
                        styles.bubbleRow,
                        comment.isInstructor ? styles.bubbleRowTeacher : styles.bubbleRowStudent,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          comment.isInstructor ? styles.bubbleTeacher : styles.bubbleStudent,
                        ]}
                      >
                        <View style={styles.bubbleHeaderRow}>
                          <Text style={styles.bubbleAuthor} numberOfLines={1}>
                            {comment.isInstructor ? "Instructor" : "Student"}
                          </Text>
                          {canManage && !isEditing && (
                            <View style={styles.bubbleActions}>
                              <TouchableOpacity
                                onPress={() => startEditComment(comment)}
                                accessibilityLabel="Edit comment"
                                style={styles.bubbleActionBtn}
                              >
                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#6B7280" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => openDeleteModal(comment.id)}
                                accessibilityLabel="Delete comment"
                                style={styles.bubbleActionBtn}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>

                        {isEditing ? (
                          <View style={styles.editRow}>
                            <TextInput
                              value={editText}
                              onChangeText={setEditText}
                              style={styles.editInput}
                              placeholderTextColor="#9CA3AF"
                              autoFocus
                              multiline
                            />
                            <View style={styles.editActionsRow}>
                              <TouchableOpacity onPress={cancelEdit} style={styles.editCancelBtn}>
                                <Text style={styles.editCancelText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleSaveEdit(comment.id)}
                                style={[styles.editSaveBtn, savingEdit && { opacity: 0.6 }]}
                                disabled={savingEdit}
                              >
                                <Text style={styles.editSaveText}>{savingEdit ? "Saving..." : "Save"}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.bubbleContent}>{comment.content}</Text>
                        )}

                        <Text style={styles.bubbleTime}>{comment.timestamp}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
            )}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Type a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentDraft}
                onChangeText={(text) => {
                  setStudentCommentDrafts((prev) => ({ ...prev, [student.id]: text }));
                }}
                multiline
                editable={!isPostingComment}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!commentDraft.trim() || isPostingComment) && styles.sendButtonDisabled,
                ]}
                disabled={!commentDraft.trim() || isPostingComment}
                onPress={() => handleAddComment(student.id)}
                accessibilityLabel="Send comment"
              >
                {isPostingComment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <MaterialCommunityIcons name="send" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSelectedStudentDetail = (student: Member) => (
    <View style={styles.detailPane}>
      <View style={styles.detailHeaderRow}>
        <View style={styles.avatarCircleLarge}>
          <MaterialCommunityIcons name="account" size={28} color="#D32F2F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailName}>{student.name}</Text>
          <Text style={styles.detailHandle}>{student.handle} · {student.id}</Text>
        </View>
        {renderStatusChip(getStudentSubmission(student.id)?.status)}
      </View>

      <View style={styles.detailMetaCard}>{renderSubmissionMeta(student)}</View>

      <View style={isTablet ? styles.tabletDetailRow : undefined}>
        <View style={isTablet ? styles.gradePanelContainer : undefined}>{renderGradePanel(student)}</View>
        <View style={isTablet ? styles.commentsPanelContainer : {marginTop: 20}}>{renderComments(student, false)}</View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isMobile ? <View style={{ height: mobileTopSpace }} /> : null}

      {/* ── Header ── */}
      <View
        style={[
          styles.headerBar,
          {
            paddingHorizontal: pagePadding,
            paddingTop: isMobile ? 14 : 20,
            paddingBottom: isMobile ? 12 : 18,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="chevron-left" size={isMobile ? 26 : 28} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text
              style={[styles.headerTitle, { fontSize: isSmallPhone ? 18 : isMobile ? 20 : 24 }]}
              numberOfLines={1}
            >
              {currentAssignment?.header || "Assignment"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {completedCount} / {studentMembers.length} Submitted
            </Text>
          </View>

          {!isMobile && (
            <TouchableOpacity
              style={styles.updateButtonOutlined}
              onPress={onOpenUpdate}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Update assignment"
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#D32F2F" />
              <Text style={styles.updateButtonOutlinedText}>Update Assignment</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${completionPercent}%` }]} />
        </View>
        <Text style={styles.progressPercentLabel}>{completionPercent}% complete</Text>

        <View style={styles.chipsRow}>
          <View style={[styles.smallChip, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.smallChipText, { color: "#065F46" }]}>🟢 Submitted</Text>
          </View>
          <View style={[styles.smallChip, { backgroundColor: "#F3F4F6" }]}>
            <Text style={[styles.smallChipText, { color: "#4B5563" }]}>🟡 Pending</Text>
          </View>
          <View style={[styles.smallChip, { backgroundColor: "#FEE2E2" }]}>
            <Text style={[styles.smallChipText, { color: "#991B1B" }]}>🔴 Late</Text>
          </View>
          <View style={[styles.smallChip, { backgroundColor: "#DBEAFE" }]}>
            <Text style={[styles.smallChipText, { color: "#1E40AF" }]}>🔵 Graded</Text>
          </View>
        </View>
      </View>

      {/* ── Progress Summary Dashboard ── */}
      <View style={[styles.summaryRow, { paddingHorizontal: pagePadding }]}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardValue}>{completedCount}</Text>
          <Text style={styles.summaryCardLabel}>Completed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardValue}>{Math.max(pendingCount, 0)}</Text>
          <Text style={styles.summaryCardLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardValue}>{lateCount}</Text>
          <Text style={styles.summaryCardLabel}>Late</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardValue}>
            {averageScore}/{totalScoreValue}
          </Text>
          <Text style={styles.summaryCardLabel}>Avg. Score</Text>
        </View>
      </View>

      {/* ── Search + Filters ── */}
      <View style={[styles.searchFilterWrap, { paddingHorizontal: pagePadding }]}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search students"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityLabel="Clear search">
              <MaterialCommunityIcons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.filterChipsRow}
        >
          {filterChips.map((chip) => {
            const active = activeFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(chip.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Main Content ── */}
      {isLargeScreen ? (
        // Desktop: master-detail
        <View style={[styles.masterDetailRow, { paddingHorizontal: pagePadding }]}>
          <View style={styles.masterList}>
            <Text style={styles.masterListTitle}>Student List</Text>
            <ScrollView showsVerticalScrollIndicator={true}>
              {visibleStudents.map((student) => renderStudentListItem(student, "list"))}
              {visibleStudents.length === 0 && (
                <Text style={styles.emptyText}>No students match your search.</Text>
              )}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.detailScroll}
            contentContainerStyle={{ paddingBottom: Math.max(30, insets.bottom + 20) }}
            showsVerticalScrollIndicator={true}
          >
            {selectedStudent ? (
              renderSelectedStudentDetail(selectedStudent)
            ) : (
              <Text style={styles.emptyText}>Select a student to view details.</Text>
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentGrid,
            {
              paddingHorizontal: pagePadding,
              paddingBottom: Math.max(30, insets.bottom + 20),
            },
          ]}
          showsVerticalScrollIndicator={true}
        >
          {visibleStudents.map((student) => {
            const isExpandedOnMobile = isMobile && selectedStudentId === student.id;
            const isExpandedOnTablet = isTablet && selectedStudentId === student.id;

            if (isTablet) {
              return (
                <View key={student.id} style={{ width: isExpandedOnTablet ? "100%" : cardWidth }}>
                  {renderStudentListItem(student, "grid")}
                  {isExpandedOnTablet && (
                    <View style={styles.tabletExpandedDetail}>
                      <View style={styles.tabletDetailRow}>
                        <View style={{ flex: 1 }}>{renderGradePanel(student)}</View>
                        <View style={{ flex: 1 }}>{renderComments(student, false)}</View>
                      </View>
                    </View>
                  )}
                </View>
              );
            }

            // Mobile: one card per student, tap to expand grade + comments below
            return (
              <View key={student.id} style={{ width: "100%" }}>
                {renderStudentListItem(student, "card")}
                {isExpandedOnMobile && (
                  <View style={styles.mobileExpandedDetail}>
                    {renderGradePanel(student)}
                    {renderComments(student, true)}
                  </View>
                )}
              </View>
            );
          })}

          {visibleStudents.length === 0 && (
            <Text style={styles.emptyText}>
              {studentMembers.length === 0 ? "No students found for this class." : "No students match your search."}
            </Text>
          )}
        </ScrollView>
      )}

      {/* ── Mobile FAB for Update Assignment ── */}
      {isMobile && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(24, insets.bottom + 16) }]}
          onPress={onOpenUpdate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Update assignment"
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* ── Delete Confirmation Modal (unchanged logic) ── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
          }
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIconContainer}>
              <MaterialCommunityIcons name="trash-can-outline" size={44} color="#EF4444" />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Comment</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.7 }]}
                onPress={confirmDeleteComment}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherSubmissionsSection;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC"  , paddingBottom: 15},

  // ── Header ──
  headerBar: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitleWrap: { flex: 1, marginLeft: 2 },
  headerTitle: { fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 13, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  updateButtonOutlined: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#D32F2F",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  updateButtonOutlinedText: { color: "#D32F2F", fontWeight: "700", fontSize: 13 },

  progressBarTrack: { height: 8, borderRadius: 16, backgroundColor: "#E5E7EB", overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 16, backgroundColor: "#D32F2F" },
  progressPercentLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginTop: 6 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  smallChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  smallChipText: { fontSize: 11, fontWeight: "700" },

  // ── Progress Summary Dashboard ──
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 4 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryCardValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  summaryCardLabel: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginTop: 4 },

  // ── Search + Filters ──
  searchFilterWrap: { marginTop: 16, marginBottom: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  filterChipsRow: { flexDirection: "row", gap: 8, marginTop: 10, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 36,
    justifyContent: "center",
  },
  filterChipActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  filterChipTextActive: { color: "#FFFFFF" },

  // ── Scroll containers ──
  scrollContent: { gap: 14, paddingTop: 8 },
  scrollContentGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },

  // ── Master-detail (desktop) ──
  masterDetailRow: { flex: 1, flexDirection: "row", gap: 20, marginTop: 12 },
  masterList: { width: 280, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  masterListTitle: { fontSize: 13, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 6 },
  detailScroll: { flex: 1 },

  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 48,
  },
  listItemActive: { backgroundColor: "#FEF2F2" },
  listItemAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  listItemTextWrap: { flex: 1, minWidth: 0 },
  listItemName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  listItemNameActive: { color: "#D32F2F" },
  listItemHandle: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  listItemScore: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginRight: 4 },
  listItemDot: { width: 8, height: 8, borderRadius: 4 },

  detailPane: { gap: 16 },
  detailHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircleLarge: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  detailName: { fontSize: 20, fontWeight: "800", color: "#111827" },
  detailHandle: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  tabletDetailRow: { flexDirection: "row", gap: 20 },
  gradePanelContainer: { flex: 1, minWidth: 0 },
  commentsPanelContainer: { flex: 1, minWidth: 0, marginTop: 20},
  detailMetaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabletExpandedDetail: { marginTop: 8, marginBottom: 8 },
  mobileExpandedDetail: { gap: 12, marginTop: 5, marginBottom: 8 },

  // ── Student Card ──
  studentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  studentCardFull: { width: "100%" },
  studentCardGrid: {},
  studentCardSelected: { borderWidth: 1.5, borderColor: "#D32F2F" },
  studentCardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  studentCardIdentity: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  studentCardNameWrap: { flex: 1, minWidth: 0 },
  studentCardName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  studentCardId: { fontSize: 12, color: "#6B7280", fontWeight: "500", marginTop: 1 },

  statusChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusChipSmall: { paddingHorizontal: 8, paddingVertical: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 12, fontWeight: "700" },
  statusChipTextSmall: { fontSize: 11 },

  cardDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 14 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaCell: { flexGrow: 1, flexBasis: 100, minWidth: 90 },
  metaCellLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600", marginBottom: 3 },
  metaCellValue: { fontSize: 14, color: "#111827", fontWeight: "800" },

  viewFileButton: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 44,
  },
  viewFileText: { color: "#D32F2F", fontWeight: "700", fontSize: 12, flexShrink: 1 },

  // ── Grade panel ──
  gradePanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    width: "100%",
  },
  gradePanelTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  gradePanelSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2, marginBottom: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    minHeight: 48,
  },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF", borderColor: "#E5E7EB" },
  maxScoreText: { color: "#6B7280", fontWeight: "700", fontSize: 16 },
  saveScoreButton: {
    marginTop: 14,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  disabledButton: { backgroundColor: "#D1D5DB" },
  saveScoreText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  // ── Comments ──
  commentsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    width: "100%",
  },
  commentsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 },
  commentsSectionTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  showCommentsBtn: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32, paddingHorizontal: 6 },
  showCommentsBtnText: { color: "#D32F2F", fontWeight: "700", fontSize: 12 },

  bubbleList: { marginTop: 14, gap: 10 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowTeacher: { justifyContent: "flex-start" },
  bubbleRowStudent: { justifyContent: "flex-start" },
  bubble: { width: "100%", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#F3F4F6" },
  bubbleTeacher: { backgroundColor: "#FEF9E7", borderColor: "#FDE68A" },
  bubbleStudent: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  bubbleHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bubbleAuthor: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase" },
  bubbleActions: { flexDirection: "row", gap: 12 },
  bubbleActionBtn: { padding: 4 },
  bubbleContent: { fontSize: 13, color: "#111827", lineHeight: 19, marginTop: 6 },
  bubbleTime: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", marginTop: 8, textAlign: "right" },

  emptyCommentsText: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginVertical: 16 },

  commentInputContainer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 14 },
  commentInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#D1D5DB" },

  editRow: { marginTop: 6 },
  editInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: "#111827", backgroundColor: "#FFFFFF", fontSize: 13, lineHeight: 18 },
  editActionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  editCancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: "#F3F4F6", minHeight: 32 },
  editCancelText: { fontWeight: "600", color: "#4B5563", fontSize: 12 },
  editSaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: "#D32F2F", minHeight: 32 },
  editSaveText: { fontWeight: "700", color: "#FFFFFF", fontSize: 12 },

  // ── Delete Modal ──
  deleteModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  deleteModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
  deleteModalIconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  deleteModalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  deleteModalMessage: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  deleteModalActions: { flexDirection: "row", gap: 12, width: "100%" },
  deleteModalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", minHeight: 44, justifyContent: "center" },
  deleteModalCancelText: { fontSize: 14, fontWeight: "700", color: "#4B5563" },
  deleteModalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", minHeight: 44 },
  deleteModalConfirmText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // ── FAB ──
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  emptyText: { width: "100%", textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 30, fontWeight: "600", paddingHorizontal: 20 },
});