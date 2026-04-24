import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import type { Assignment, Member, Submission } from "./TeacherCourseDetail2";

type Props = {
  members: Member[];
  currentAssignment?: Assignment;
  submissions: Submission[];
  onBack: () => void;
  onOpenUpdate: () => void;

  /**
   * Optional callback from TeacherCourseDetail2.
   * If you already grade using API in the parent, pass this:
   * onGradeSubmission={(submissionId, score, feedback) => ...}
   */
  onGradeSubmission?: (
    submissionId: string,
    score: number,
    feedback: string
  ) => Promise<void> | void;
};

const TeacherSubmissionsSection = ({
  members,
  currentAssignment,
  submissions,
  onBack,
  onOpenUpdate,
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
  const useCompactCard = isMobile || width < 900;

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

  const completionPercent =
    studentMembers.length > 0
      ? Math.round((completedCount / studentMembers.length) * 100)
      : 0;

  const totalScoreValue = Number(currentAssignment?.totalScore || 0);

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null);

  const getStudentSubmission = (studentId: string) => {
    return assignmentSubmissions.find((item) => item.studentId === studentId);
  };

  const getDotColor = (status?: Submission["status"]) => {
    switch (status) {
      case "graded":
        return "#4CAF50";
      case "submitted":
        return "#2196F3";
      case "late":
        return "#F44336";
      default:
        return "#BDBDBD";
    }
  };

  const getStatusText = (status?: Submission["status"]) => {
    switch (status) {
      case "graded":
        return "Graded";
      case "submitted":
        return "Submitted";
      case "late":
        return "Late";
      case "pending":
        return "Pending";
      default:
        return "No submission";
    }
  };

  const getStatusColor = (status?: Submission["status"]) => {
    switch (status) {
      case "graded":
        return "#2E7D32";
      case "submitted":
        return "#1565C0";
      case "late":
        return "#C62828";
      case "pending":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getStatusBgColor = (status?: Submission["status"]) => {
    switch (status) {
      case "graded":
        return "#E8F5E9";
      case "submitted":
        return "#E3F2FD";
      case "late":
        return "#FFEBEE";
      case "pending":
        return "#F3F4F6";
      default:
        return "#F3F4F6";
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

  const getSubmissionFileName = (submission?: Submission) => {
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
    const feedback = feedbackDrafts[submission.id] ?? String((submission as any)?.feedback || "");

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
      Alert.alert(
        "Grading action missing",
        "Pass onGradeSubmission from TeacherCourseDetail2 to save this score."
      );
      return;
    }

    try {
      setSavingSubmissionId(submission.id);
      await onGradeSubmission(submission.id, score, feedback);
      Alert.alert("Saved", "Score saved successfully.");
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Unable to save score.");
    } finally {
      setSavingSubmissionId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isMobile ? <View style={{ height: mobileTopSpace }} /> : null}

      <View
        style={[
          styles.membersHeader,
          {
            paddingHorizontal: pagePadding,
            paddingTop: isMobile ? 14 : 20,
            paddingBottom: isMobile ? 10 : 16,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={isMobile ? 30 : 35}
            color="#000"
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.membersTitle,
            { fontSize: isSmallPhone ? 22 : isMobile ? 24 : isTablet ? 28 : 32 },
          ]}
          numberOfLines={1}
        >
          Submissions
        </Text>

        <TouchableOpacity
          style={[styles.updateInfoTrigger, isSmallPhone && styles.updateInfoTriggerCompact]}
          onPress={onOpenUpdate}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="information" size={isMobile ? 20 : 22} color="#D32F2F" />
          {!isSmallPhone && <Text style={styles.updateText}>Update</Text>}
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.analyticsRow,
          isMobile && styles.analyticsRowMobile,
          {
            paddingHorizontal: pagePadding,
            marginTop: 2,
            marginBottom: isMobile ? 14 : 18,
          },
        ]}
      >
        <View style={styles.analyticsTextWrap}>
          <Text
            style={[
              styles.completedText,
              { fontSize: isSmallPhone ? 14 : isMobile ? 15 : 18 },
            ]}
          >
            {completedCount} out of {studentMembers.length} completed
          </Text>

          {!!currentAssignment?.header && (
            <Text style={styles.assignmentTitlePreview} numberOfLines={1}>
              {currentAssignment.header}
            </Text>
          )}
        </View>

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
            paddingBottom: Math.max(30, insets.bottom + 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {studentMembers.map((student) => {
          const submission = getStudentSubmission(student.id);
          const fileUrl = getSubmissionFileUrl(submission);
          const scoreDraft = submission
            ? scoreDrafts[submission.id] ?? String(submission.score ?? "")
            : "";

          const feedbackDraft = submission
            ? feedbackDrafts[submission.id] ?? String((submission as any)?.feedback || "")
            : "";

          const canGrade =
            !!submission &&
            (submission.status === "submitted" ||
              submission.status === "late" ||
              submission.status === "graded");

          const isSaving = !!submission && savingSubmissionId === submission.id;

          return (
            <View
              key={student.id}
              style={[
                styles.studentCardWide,
                {
                  width: cardWidth,
                  minHeight: useCompactCard ? undefined : 170,
                },
              ]}
            >
              <View style={styles.studentRedAccent} />

              <View
                style={[
                  styles.studentInfo,
                  {
                    paddingHorizontal: isSmallPhone ? 12 : isMobile ? 14 : 18,
                    paddingVertical: isSmallPhone ? 12 : isMobile ? 14 : 16,
                  },
                ]}
              >
                <View style={[styles.cardMainLayout, !useCompactCard && styles.cardMainLayoutWide]}>
                  <View style={styles.studentDetailsColumn}>
                    <View style={styles.studentTopRow}>
                      <Text
                        style={[
                          styles.studentId,
                          { fontSize: isMobile ? 12 : 14 },
                        ]}
                        numberOfLines={1}
                      >
                        {student.id}
                      </Text>

                      <View style={styles.statusInlineWrap}>
                        <View
                          style={[
                            styles.lateDot,
                            { backgroundColor: getDotColor(submission?.status) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusPill,
                            {
                              color: getStatusColor(submission?.status),
                              backgroundColor: getStatusBgColor(submission?.status),
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {getStatusText(submission?.status)}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.studentName,
                        { fontSize: isSmallPhone ? 15 : isMobile ? 16 : 18 },
                      ]}
                      numberOfLines={2}
                    >
                      {student.name}
                    </Text>

                    <Text style={styles.studentHandle} numberOfLines={1}>
                      {student.handle}
                    </Text>

                    <View style={styles.metaGrid}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Score</Text>
                        <Text style={styles.gradeRatio}>
                          {submission?.score ?? 0}/{totalScoreValue}
                        </Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Submitted</Text>
                        <Text style={styles.dateText} numberOfLines={1}>
                          {submission?.submittedAt || "Not yet"}
                        </Text>
                      </View>
                    </View>

                    {!!fileUrl && (
                      <TouchableOpacity
                        style={[styles.viewFileButton, isMobile && styles.viewFileButtonMobile]}
                        onPress={() => handleOpenSubmittedFile(submission)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons
                          name={
                            String((submission as any)?.fileType || "").startsWith("image/")
                              ? "image-outline"
                              : "file-document-outline"
                          }
                          size={17}
                          color="#D32F2F"
                        />
                        <Text style={styles.viewFileText} numberOfLines={1}>
                          View {getSubmissionFileName(submission)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={[styles.gradeBox, useCompactCard && styles.gradeBoxCompact]}>
                    <Text style={styles.gradeInputLabel}>
                      {canGrade ? "Input score" : "No submission to grade"}
                    </Text>

                    <View style={[styles.scoreRow, isSmallPhone && styles.scoreRowSmall]}>
                      <TextInput
                        style={[
                          styles.scoreInput,
                          !canGrade && styles.inputDisabled,
                          isSmallPhone && styles.scoreInputSmall,
                        ]}
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
                        placeholderTextColor="#999"
                      />

                      <Text style={styles.maxScoreText}>/ {totalScoreValue}</Text>
                    </View>

                    <TextInput
                      style={[
                        styles.feedbackInput,
                        !canGrade && styles.inputDisabled,
                      ]}
                      value={feedbackDraft}
                      onChangeText={(value) => {
                        if (!submission) return;
                        setFeedbackDrafts((prev) => ({
                          ...prev,
                          [submission.id]: value,
                        }));
                      }}
                      editable={canGrade && !isSaving}
                      placeholder="Feedback optional"
                      placeholderTextColor="#999"
                      multiline
                    />

                    <TouchableOpacity
                      style={[
                        styles.saveScoreButton,
                        (!canGrade || isSaving) && styles.disabledButton,
                      ]}
                      disabled={!canGrade || isSaving}
                      onPress={() => submission && handleSaveScore(submission)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.saveScoreText}>
                        {isSaving ? "Saving..." : submission?.status === "graded" ? "Update Score" : "Save Score"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {studentMembers.length === 0 && (
          <Text style={styles.emptyText}>No students found for this class.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeacherSubmissionsSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    marginRight: 8,
    padding: 2,
  },

  membersTitle: {
    fontWeight: "700",
    color: "#111",
    flex: 1,
    marginLeft: 6,
  },

  updateInfoTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 10,
    minHeight: 36,
    justifyContent: "center",
  },

  updateInfoTriggerCompact: {
    paddingLeft: 4,
    minWidth: 34,
  },

  updateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D32F2F",
  },

  analyticsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  analyticsRowMobile: {
    alignItems: "center",
  },

  analyticsTextWrap: {
    flex: 1,
    marginRight: 12,
  },

  completedText: {
    color: "#555",
    fontWeight: "600",
  },

  assignmentTitlePreview: {
    marginTop: 4,
    color: "#999",
    fontSize: 12,
    fontWeight: "600",
  },

  progressCircle: {
    borderColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
  },

  percentText: {
    fontWeight: "700",
    color: "#4CAF50",
  },

  scrollContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
  },

  studentCardWide: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ECECEC",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: "hidden",
    marginBottom: 2,
  },

  studentRedAccent: {
    width: 4,
    backgroundColor: "#D32F2F",
  },

  studentInfo: {
    flex: 1,
    justifyContent: "center",
  },

  cardMainLayout: {
    width: "100%",
  },

  cardMainLayoutWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },

  studentDetailsColumn: {
    flex: 1,
    minWidth: 0,
  },

  studentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },

  studentId: {
    color: "#999",
    fontWeight: "600",
    flex: 1,
  },

  statusInlineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },

  lateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  statusPill: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
  },

  studentName: {
    fontWeight: "800",
    color: "#222",
    marginTop: 7,
    lineHeight: 22,
  },

  studentHandle: {
    color: "#777",
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
  },

  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },

  metaItem: {
    flexGrow: 1,
    flexBasis: 110,
    minWidth: 100,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  metaLabel: {
    color: "#999",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 3,
  },

  gradeRatio: {
    color: "#333",
    fontWeight: "800",
    fontSize: 13,
  },

  dateText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },

  viewFileButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FFD6D6",
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },

  viewFileButtonMobile: {
    alignSelf: "stretch",
  },

  viewFileText: {
    color: "#D32F2F",
    fontWeight: "800",
    fontSize: 12,
    flexShrink: 1,
  },

  gradeBox: {
    width: 210,
    borderLeftWidth: 1,
    borderLeftColor: "#F0F0F0",
    paddingLeft: 14,
  },

  gradeBoxCompact: {
    width: "100%",
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingLeft: 0,
    paddingTop: 12,
    marginTop: 12,
  },

  gradeInputLabel: {
    color: "#555",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  scoreRowSmall: {
    alignItems: "stretch",
  },

  scoreInput: {
    flex: 1,
    minWidth: 74,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  scoreInputSmall: {
    minWidth: 60,
  },

  maxScoreText: {
    color: "#777",
    fontWeight: "700",
    fontSize: 12,
  },

  feedbackInput: {
    marginTop: 9,
    minHeight: 64,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlignVertical: "top",
    fontSize: 12,
    color: "#111",
  },

  inputDisabled: {
    backgroundColor: "#F5F5F5",
    color: "#999",
  },

  saveScoreButton: {
    marginTop: 9,
    backgroundColor: "#308C5D",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },

  disabledButton: {
    backgroundColor: "#BDBDBD",
  },

  saveScoreText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },

  emptyText: {
    width: "100%",
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 30,
    fontWeight: "600",
  },
});
