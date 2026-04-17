import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
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

import TeacherAssignmentSection from "./TeacherAssignmentSection";
import TeacherMaterialSection from "./TeacherMaterialSection";
import TeacherSubmissionsSection from "./TeacherSubmissionsSection";

export type Assignment = {
  id: string;
  header: string;
  instruction: string;
  posted: string;
  dueDate: string;
  totalScore: string;
  pointsOnTime: string;
  repositoryDisabledAfterDue: boolean;
  fileName?: string;
  fileUri?: string;
  fileType?: string;
};

export type Material = {
  id: string;
  title: string;
  week: string;
  posted: string;
  content?: string;
  fileName?: string;
  fileUri?: string;
  fileType?: string;
};

export type Member = {
  id: string;
  name: string;
  handle: string;
};

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: "pending" | "submitted" | "graded" | "late";
  score?: number;
  submittedAt?: string;
};

export type CourseDetailData = {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  instructor: string;
  section?: string;
  bannerUri?: string;
  year?: string;
  semester?: string;
};

type PickedUploadFile = {
  name?: string;
  uri?: string;
  type?: string;
  base64?: string;
  file?: File;
} | null;

function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return "http://localhost:5000";
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  if (host) {
    return `http://${host}:5000`;
  }

  return "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

const formatDateTime = (value?: any) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value?._seconds) {
    return new Date(value._seconds * 1000).toLocaleString();
  }

  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleString();
  }

  return "";
};

const mapMaterial = (item: any): Material => ({
  id: item.id,
  title: item.title || "",
  week: item.week || "",
  posted: formatDateTime(item.createdAt || item.posted),
  content: item.content || "",
  fileName: item.fileName || undefined,
  fileUri: item.fileUrl || item.fileUri || undefined,
  fileType: item.fileType || undefined,
});

const mapAssignment = (item: any): Assignment => ({
  id: item.id,
  header: item.header || "",
  instruction: item.instruction || "",
  posted: formatDateTime(item.createdAt || item.posted),
  dueDate: item.dueDate || "",
  totalScore: String(item.totalScore ?? ""),
  pointsOnTime: String(item.pointsOnTime ?? ""),
  repositoryDisabledAfterDue: !!item.repositoryDisabledAfterDue,
  fileName: item.fileName || undefined,
  fileUri: item.fileUrl || item.fileUri || undefined,
  fileType: item.fileType || undefined,
});

const mapMember = (item: any): Member => ({
  id: item.userId || item.id || "",
  name: item.name || "",
  handle: item.email ? `@${String(item.email).split("@")[0]}` : "@member",
});

const mapSubmission = (item: any): Submission => ({
  id: item.id,
  assignmentId: item.assignmentId || "",
  studentId: item.studentId || "",
  status:
    item.status === "submitted" ||
    item.status === "graded" ||
    item.status === "late"
      ? item.status
      : "pending",
  score: typeof item.score === "number" ? item.score : undefined,
  submittedAt: formatDateTime(item.submittedAt),
});

const TeacherCourseDetail2 = ({
  onBack,
  course,
}: {
  onBack?: () => void;
  course?: CourseDetailData;
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;

  const mobileTopSpace = isMobile ? insets.top + 10 : 1;

  const [activeTab, setActiveTab] = useState<"Materials" | "Assignments">(
    "Materials"
  );
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showUpdateMaterialModal, setShowUpdateMaterialModal] =
    useState(false);
  const [showDeleteMaterialConfirmModal, setShowDeleteMaterialConfirmModal] =
    useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null
  );

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [memberIdInput, setMemberIdInput] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formWeek, setFormWeek] = useState("");
  const [
    assignmentDisableRepositoryAfterDue,
    setAssignmentDisableRepositoryAfterDue,
  ] = useState(false);
  const [classCodeCopied, setClassCodeCopied] = useState(false);

  const [pickedFile, setPickedFile] = useState<PickedUploadFile>(null);
  const [pickedAssignmentFile, setPickedAssignmentFile] =
    useState<PickedUploadFile>(null);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalType, setResultModalType] = useState<"success" | "error">(
    "success"
  );
  const [resultModalTitle, setResultModalTitle] = useState("");
  const [resultModalMessage, setResultModalMessage] = useState("");

  const showResultModal = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    setResultModalType(type);
    setResultModalTitle(title);
    setResultModalMessage(message);
    setResultModalVisible(true);
  };

  const loadCourseContent = async () => {
    if (!course?.id) {
      setAssignments([]);
      setMaterials([]);
      setMembers([]);
      setSubmissions([]);
      return;
    }

    try {
      const [materialsRes, assignmentsRes, membersRes, submissionsRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/class-materials/${course.id}`),
          fetch(`${API_BASE_URL}/class-assignments/${course.id}`),
          fetch(`${API_BASE_URL}/class-members/${course.id}`),
          fetch(`${API_BASE_URL}/class-submissions/${course.id}`),
        ]);

      const [materialsData, assignmentsData, membersData, submissionsData] =
        await Promise.all([
          materialsRes.json(),
          assignmentsRes.json(),
          membersRes.json(),
          submissionsRes.json(),
        ]);

      setMaterials(
        materialsRes.ok && Array.isArray(materialsData)
          ? materialsData.map(mapMaterial)
          : []
      );

      setAssignments(
        assignmentsRes.ok && Array.isArray(assignmentsData)
          ? assignmentsData.map(mapAssignment)
          : []
      );

      setMembers(
        membersRes.ok && Array.isArray(membersData)
          ? membersData.map(mapMember)
          : []
      );

      setSubmissions(
        submissionsRes.ok && Array.isArray(submissionsData)
          ? submissionsData.map(mapSubmission)
          : []
      );
    } catch (error) {
      console.error("Error loading course content:", error);
      setAssignments([]);
      setMaterials([]);
      setMembers([]);
      setSubmissions([]);
    }
  };

  useEffect(() => {
    loadCourseContent();
  }, [course?.id]);

  const resetCreateForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormPoints("");
    setFormDue("");
    setFormWeek("");
    setAssignmentDisableRepositoryAfterDue(false);
    setPickedFile(null);
    setPickedAssignmentFile(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openMaterialModal = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const openUpdateMaterialModal = (material: Material | null) => {
    if (!material) return;

    setSelectedMaterialId(material.id);
    setFormTitle(material.title || "");
    setFormWeek(material.week || "");
    setFormDesc(material.content || "");
    setShowMaterialModal(false);
    setShowUpdateMaterialModal(true);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        base64: Platform.OS === "web",
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
        base64: (asset as any).base64,
        file: (asset as any).file,
      });
    } catch {
      showResultModal("error", "Error", "Failed to pick file.");
    }
  };

  const handlePickAssignmentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        base64: Platform.OS === "web",
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setPickedAssignmentFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
        base64: (asset as any).base64,
        file: (asset as any).file,
      });
    } catch {
      showResultModal("error", "Error", "Failed to pick assignment file.");
    }
  };

  const uploadPickedFile = async (
    picked: PickedUploadFile,
    kind: "material" | "assignment"
  ) => {
    if (!picked || !course?.id) return null;

    let fileBase64: string | null = null;

    if (Platform.OS === "web") {
      if (picked.base64) {
        fileBase64 = picked.base64;
      } else if (picked.file) {
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
              const base64Part = result.includes(",")
                ? result.split(",")[1]
                : result;
              resolve(base64Part);
            } else {
              reject(new Error("Failed to read file on web."));
            }
          };

          reader.onerror = () =>
            reject(new Error("Failed to read file on web."));
          reader.readAsDataURL(picked.file as File);
        });
      } else {
        throw new Error("No file data available for web upload.");
      }
    } else {
      if (!picked.uri) {
        throw new Error("No file URI available for mobile upload.");
      }

      fileBase64 = await FileSystem.readAsStringAsync(picked.uri, {
        encoding: "base64" as any,
      });
    }

    const response = await fetch(`${API_BASE_URL}/upload-class-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        classId: course.id,
        fileBase64,
        fileName: picked.name ?? "file",
        fileType: picked.type ?? "application/octet-stream",
        kind,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to upload file.");
    }

    return data.data;
  };

  const handleOpenUploadedFile = async (fileUri?: string) => {
    if (!fileUri) {
      showResultModal("error", "No File", "No uploaded file available.");
      return;
    }

    try {
      await Linking.openURL(fileUri);
    } catch {
      showResultModal("error", "Error", "Unable to open the file.");
    }
  };

  const handleCopyClassCode = async () => {
    const codeToCopy = course?.classCode || "";

    if (!codeToCopy || codeToCopy === "No Class Code") return;

    await Clipboard.setStringAsync(codeToCopy);
    setClassCodeCopied(true);

    setTimeout(() => {
      setClassCodeCopied(false);
    }, 2000);
  };

  const handleCreate = async () => {
    if (!course?.id) {
      showResultModal("error", "Error", "No class selected.");
      return;
    }

    if (activeTab === "Materials") {
      if (!formTitle.trim()) {
        showResultModal("error", "Required", "Please enter a title.");
        return;
      }

      if (!formWeek.trim()) {
        showResultModal("error", "Required", "Please enter the week.");
        return;
      }

      try {
        let uploadedFile = null;

        if (pickedFile?.uri || pickedFile?.base64 || pickedFile?.file) {
          uploadedFile = await uploadPickedFile(pickedFile, "material");
        }

        const response = await fetch(`${API_BASE_URL}/create-class-material`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId: course.id,
            title: formTitle.trim(),
            week: formWeek.trim(),
            content:
              formDesc.trim() ||
              `${formWeek.trim()} material: ${formTitle.trim()}`,
            fileName: uploadedFile?.fileName ?? null,
            fileUrl: uploadedFile?.fileUrl ?? null,
            fileType: uploadedFile?.fileType ?? null,
            storagePath: uploadedFile?.storagePath ?? null,
            bucketPath: uploadedFile?.bucketPath ?? null,
            postedByUid: "teacher_uid_001",
            postedByName: course.instructor || "Teacher",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create material");
        }

        await loadCourseContent();
        setShowCreateModal(false);
        resetCreateForm();
        showResultModal(
          "success",
          "Success",
          "Material uploaded successfully."
        );
      } catch (error: any) {
        console.error("Create material error:", error);
        showResultModal(
          "error",
          "Upload Failed",
          error?.message || "Failed to create material."
        );
      }

      return;
    }

    if (
      !formTitle.trim() ||
      !formDesc.trim() ||
      !formDue.trim() ||
      !formPoints.trim() ||
      !formWeek.trim()
    ) {
      showResultModal(
        "error",
        "Required",
        "Please complete all assignment fields."
      );
      return;
    }

    try {
      let uploadedFile = null;

      if (
        pickedAssignmentFile?.uri ||
        pickedAssignmentFile?.base64 ||
        pickedAssignmentFile?.file
      ) {
        uploadedFile = await uploadPickedFile(
          pickedAssignmentFile,
          "assignment"
        );
      }

      const response = await fetch(`${API_BASE_URL}/create-class-assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: course.id,
          header: formTitle.trim(),
          instruction: formDesc.trim(),
          dueDate: formDue.trim(),
          totalScore: Number(formPoints),
          pointsOnTime: Number(formWeek),
          repositoryDisabledAfterDue: assignmentDisableRepositoryAfterDue,
          fileName: uploadedFile?.fileName ?? null,
          fileUrl: uploadedFile?.fileUrl ?? null,
          fileType: uploadedFile?.fileType ?? null,
          storagePath: uploadedFile?.storagePath ?? null,
          bucketPath: uploadedFile?.bucketPath ?? null,
          postedByUid: "teacher_uid_001",
          postedByName: course.instructor || "Teacher",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create assignment");
      }

      await loadCourseContent();
      setShowCreateModal(false);
      resetCreateForm();
      showResultModal(
        "success",
        "Success",
        "Assignment uploaded successfully."
      );
    } catch (error: any) {
      console.error("Create assignment error:", error);
      showResultModal(
        "error",
        "Upload Failed",
        error?.message || "Failed to create assignment."
      );
    }
  };

  const openUpdateModal = (item: Assignment | undefined) => {
    if (!item) return;
    setSelectedId(item.id);
    setFormTitle(item.header);
    setFormDesc(item.instruction);
    setFormPoints(item.totalScore);
    setFormDue(item.dueDate);
    setFormWeek(item.pointsOnTime);
    setAssignmentDisableRepositoryAfterDue(item.repositoryDisabledAfterDue);
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/update-class-assignment/${selectedId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            header: formTitle,
            instruction: formDesc,
            totalScore: Number(formPoints),
            pointsOnTime: Number(formWeek),
            dueDate: formDue,
            repositoryDisabledAfterDue: assignmentDisableRepositoryAfterDue,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update assignment");
      }

      await loadCourseContent();
      setShowUpdateModal(false);
      showResultModal("success", "Success", "Assignment updated.");
    } catch (error) {
      console.error("Update assignment error:", error);
      showResultModal("error", "Error", "Failed to update assignment.");
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/delete-class-assignment/${selectedId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete assignment");
      }

      await loadCourseContent();
      setShowUpdateModal(false);
      setShowSubmissions(false);
      showResultModal("success", "Success", "Assignment deleted.");
    } catch (error) {
      console.error("Delete assignment error:", error);
      showResultModal("error", "Error", "Failed to delete assignment.");
    }
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterialId) return;

    if (!formTitle.trim()) {
      showResultModal("error", "Required", "Please enter a title.");
      return;
    }

    if (!formWeek.trim()) {
      showResultModal("error", "Required", "Please enter the week.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/update-class-material/${selectedMaterialId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formTitle.trim(),
            week: formWeek.trim(),
            content: formDesc.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update material");
      }

      await loadCourseContent();
      setShowUpdateMaterialModal(false);
      setSelectedMaterialId(null);
      resetCreateForm();
      showResultModal("success", "Success", "Material updated successfully.");
    } catch (error: any) {
      console.error("Update material error:", error);
      showResultModal(
        "error",
        "Error",
        error?.message || "Failed to update material."
      );
    }
  };

  const confirmDeleteMaterial = () => {
    if (!selectedMaterialId) return;
    setShowDeleteMaterialConfirmModal(true);
  };

  const handleDeleteMaterial = async () => {
    if (!selectedMaterialId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/delete-class-material/${selectedMaterialId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete material");
      }

      await loadCourseContent();
      setShowDeleteMaterialConfirmModal(false);
      setShowUpdateMaterialModal(false);
      setShowMaterialModal(false);
      setSelectedMaterialId(null);
      resetCreateForm();
      showResultModal("success", "Success", "Material deleted successfully.");
    } catch (error: any) {
      console.error("Delete material error:", error);
      showResultModal(
        "error",
        "Error",
        error?.message || "Failed to delete material."
      );
    }
  };

  const handleAddMember = async () => {
    if (!course?.id) {
      showResultModal("error", "Error", "No class selected.");
      return;
    }

    if (!memberIdInput.trim()) {
      showResultModal("error", "Required", "Please enter a student ID.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/join-class`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: course.id,
          studentId: memberIdInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      setMemberIdInput("");
      await loadCourseContent();
      showResultModal("success", "Success", "Member added successfully.");
    } catch (error) {
      console.error("Add member error:", error);
      showResultModal("error", "Error", "Failed to add member.");
    }
  };

  const currentAssignment = assignments.find((a) => a.id === selectedId);

  const visibleCourseCode = course?.courseCode || "No Course Code";
  const courseName = course?.name || "Untitled Course";
  const courseSection = course?.section || "";
  const courseInstructor = course?.instructor || "No Instructor";
  const classCode = course?.classCode || "No Class Code";
  const courseYear = course?.year || "";
  const courseSemester = course?.semester || "";

  if (showSubmissions) {
    return (
      <>
        <TeacherSubmissionsSection
          members={members}
          currentAssignment={currentAssignment}
          submissions={submissions}
          onBack={() => setShowSubmissions(false)}
          onOpenUpdate={() => openUpdateModal(currentAssignment)}
        />

        <Modal visible={showUpdateModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.sidePanel,
                { width: isMobile ? Math.min(width - 28, 360) : 380 },
              ]}
            >
              <View style={styles.panelHeader}>
                <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={28}
                    color="#000"
                  />
                </TouchableOpacity>
                <Text style={styles.panelTitle}>Update Assignment</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.inputBox}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Enter Header"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.textAreaBox}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  placeholder="Enter Instruction"
                  placeholderTextColor="#999"
                  multiline
                />
                <TextInput
                  style={styles.inputBox}
                  value={formPoints}
                  onChangeText={setFormPoints}
                  keyboardType="numeric"
                  placeholder="Total Score"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.inputBox}
                  value={formWeek}
                  onChangeText={setFormWeek}
                  keyboardType="numeric"
                  placeholder="Points On Time"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.inputBox}
                  value={formDue}
                  onChangeText={setFormDue}
                  placeholder="Set Due Date"
                  placeholderTextColor="#999"
                />

                <View style={styles.checkboxRow}>
                  <Text style={styles.checkboxLabel}>
                    Disabled repository after due
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.checkboxBox,
                      assignmentDisableRepositoryAfterDue &&
                        styles.checkboxBoxChecked,
                    ]}
                    onPress={() =>
                      setAssignmentDisableRepositoryAfterDue(
                        !assignmentDisableRepositoryAfterDue
                      )
                    }
                  >
                    {assignmentDisableRepositoryAfterDue ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color="#FFF"
                      />
                    ) : null}
                  </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleDelete}
                  >
                    <Text style={styles.secondaryButtonText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleUpdate}
                  >
                    <Text style={styles.primaryButtonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isMobile ? <View style={{ height: mobileTopSpace }} /> : null}

      <View
        style={[
          styles.redHeader,
          {
            paddingHorizontal: isMobile ? 16 : 20,
            paddingTop: isMobile ? 16 : 20,
            paddingBottom: isMobile ? 22 : 30,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={isMobile ? 30 : 35}
              color="#FFF"
            />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text
              style={[
                styles.courseTitle,
                { fontSize: isMobile ? 21 : isTablet ? 24 : 27 },
              ]}
            >
              {visibleCourseCode} - {courseName}
            </Text>

            <Text
              style={[
                styles.courseSubText,
                { fontSize: isMobile ? 14 : 16 },
              ]}
            >
              {visibleCourseCode}
              {courseSection ? ` • ${courseSection}` : ""}
            </Text>

            {!!courseYear && <Text style={styles.metaText}>{courseYear}</Text>}

            {!!courseSemester && (
              <Text style={styles.metaText}>{courseSemester}</Text>
            )}

            <Text style={styles.instructorText}>
              Instructor: {courseInstructor}
            </Text>

            <View style={styles.classCodeRow}>
              <Text style={styles.classCodeText}>Class Code: {classCode}</Text>

              <TouchableOpacity
                onPress={handleCopyClassCode}
                style={styles.copyBtn}
              >
                <MaterialCommunityIcons
                  name={classCodeCopied ? "check" : "content-copy"}
                  size={18}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "Materials" && styles.tabActive]}
          onPress={() => setActiveTab("Materials")}
        >
          <MaterialCommunityIcons
            name="book-multiple"
            size={isMobile ? 20 : 22}
            color={activeTab === "Materials" ? "#D32F2F" : "#333"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "Materials" && styles.tabLabelActive,
            ]}
          >
            Materials ({materials.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "Assignments" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("Assignments")}
        >
          <MaterialCommunityIcons
            name="clipboard-list"
            size={isMobile ? 20 : 22}
            color={activeTab === "Assignments" ? "#D32F2F" : "#333"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "Assignments" && styles.tabLabelActive,
            ]}
          >
            Assignments ({assignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "Materials" ? (
        <TeacherMaterialSection
          materials={materials}
          onCreate={openCreateModal}
          onOpenMaterial={openMaterialModal}
        />
      ) : (
        <TeacherAssignmentSection
          assignments={assignments}
          onCreate={openCreateModal}
          onOpenMembers={(id) => {
            setSelectedId(id);
            setShowSubmissions(true);
          }}
        />
      )}

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 370) : 440 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>
                  Create {activeTab === "Materials" ? "Material" : "Assignment"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {activeTab === "Materials"
                    ? "Add a new class material with optional file attachment."
                    : "Create a new assignment and attach a file if needed."}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>
                {activeTab === "Materials" ? "Title" : "Header"}
              </Text>
              <TextInput
                style={styles.inputBox}
                placeholder={
                  activeTab === "Materials"
                    ? "Material Title"
                    : "Enter Header"
                }
                placeholderTextColor="#999"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {activeTab === "Materials" ? (
                <>
                  <Text style={styles.sectionLabel}>Week</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Week (example: Week 1)"
                    placeholderTextColor="#999"
                    value={formWeek}
                    onChangeText={setFormWeek}
                  />

                  <Text style={styles.sectionLabel}>Description</Text>
                  <TextInput
                    style={styles.textAreaBox}
                    placeholder="Optional description"
                    placeholderTextColor="#999"
                    value={formDesc}
                    onChangeText={setFormDesc}
                    multiline
                  />

                  <Text style={styles.sectionLabel}>Attachment</Text>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={handlePickFile}
                  >
                    <MaterialCommunityIcons
                      name="upload"
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.uploadBtnText}>Upload File</Text>
                  </TouchableOpacity>

                  {pickedFile?.name ? (
                    <View style={styles.filePreviewBox}>
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={22}
                        color="#D32F2F"
                      />
                      <Text style={styles.filePreviewText}>
                        {pickedFile.name}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>Instruction</Text>
                  <TextInput
                    style={styles.textAreaBox}
                    placeholder="Enter Instruction"
                    placeholderTextColor="#999"
                    value={formDesc}
                    onChangeText={setFormDesc}
                    multiline
                  />

                  <Text style={styles.sectionLabel}>Total Score</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Total Score"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={formPoints}
                    onChangeText={setFormPoints}
                  />

                  <Text style={styles.sectionLabel}>Points On Time</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Points On Time"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={formWeek}
                    onChangeText={setFormWeek}
                  />

                  <Text style={styles.sectionLabel}>Due Date</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Set Due Date"
                    placeholderTextColor="#999"
                    value={formDue}
                    onChangeText={setFormDue}
                  />

                  <View style={styles.checkboxRow}>
                    <Text style={styles.checkboxLabel}>
                      Disable repository after due
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.checkboxBox,
                        assignmentDisableRepositoryAfterDue &&
                          styles.checkboxBoxChecked,
                      ]}
                      onPress={() =>
                        setAssignmentDisableRepositoryAfterDue(
                          !assignmentDisableRepositoryAfterDue
                        )
                      }
                    >
                      {assignmentDisableRepositoryAfterDue ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={16}
                          color="#FFF"
                        />
                      ) : null}
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionLabel}>Attachment</Text>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={handlePickAssignmentFile}
                  >
                    <MaterialCommunityIcons
                      name="upload"
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.uploadBtnText}>Upload File</Text>
                  </TouchableOpacity>

                  {pickedAssignmentFile?.name ? (
                    <View style={styles.filePreviewBox}>
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={22}
                        color="#D32F2F"
                      />
                      <Text style={styles.filePreviewText}>
                        {pickedAssignmentFile.name}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleCreate}
                >
                  <Text style={styles.primaryButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMaterialModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 360) : 520 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>
                  {selectedMaterial?.title || "Material"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  View the material details and open the uploaded file.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.materialLabel}>Week</Text>
            <Text style={styles.materialValue}>
              {selectedMaterial?.week || "-"}
            </Text>

            <Text style={styles.materialLabel}>Posted</Text>
            <Text style={styles.materialValue}>
              {selectedMaterial?.posted || "-"}
            </Text>

            <Text style={styles.materialLabel}>Uploaded File</Text>
            {selectedMaterial?.fileName ? (
              <View style={styles.materialFileRow}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={24}
                  color="#D32F2F"
                />
                <View style={styles.materialFileInfo}>
                  <Text style={styles.materialFileName}>
                    {selectedMaterial.fileName}
                  </Text>
                  <TouchableOpacity
                    style={styles.openFileBtn}
                    onPress={() => handleOpenUploadedFile(selectedMaterial.fileUri)}
                  >
                    <Text style={styles.openFileBtnText}>Open File</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noFileText}>No uploaded file</Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => openUpdateMaterialModal(selectedMaterial)}
              >
                <Text style={styles.secondaryButtonText}>Edit Material</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowMaterialModal(false)}
              >
                <Text style={styles.primaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showUpdateMaterialModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 370) : 440 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Update Material</Text>
                <Text style={styles.modalSubtitle}>
                  Edit the material details or remove it from the class.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setShowUpdateMaterialModal(false);
                  setSelectedMaterialId(null);
                  resetCreateForm();
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Title</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="Material Title"
                placeholderTextColor="#999"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.sectionLabel}>Week</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="Week (example: Week 1)"
                placeholderTextColor="#999"
                value={formWeek}
                onChangeText={setFormWeek}
              />

              <Text style={styles.sectionLabel}>Description</Text>
              <TextInput
                style={styles.textAreaBox}
                placeholder="Optional description"
                placeholderTextColor="#999"
                value={formDesc}
                onChangeText={setFormDesc}
                multiline
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={confirmDeleteMaterial}
                >
                  <Text style={styles.secondaryButtonText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleUpdateMaterial}
                >
                  <Text style={styles.primaryButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteMaterialConfirmModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              {
                width: isMobile ? Math.min(width - 28, 340) : 360,
              },
            ]}
          >
            <View style={styles.confirmIconWrap}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={34}
                color="#D32F2F"
              />
            </View>

            <Text style={styles.confirmTitle}>Delete Material?</Text>
            <Text style={styles.confirmMessage}>
              This will permanently remove the material and its uploaded file
              from the class.
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowDeleteMaterialConfirmModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dangerButtonFilled}
                onPress={handleDeleteMaterial}
              >
                <Text style={styles.dangerButtonFilledText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={resultModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              {
                width: isMobile ? Math.min(width - 28, 340) : 360,
                alignItems: "center",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={
                resultModalType === "success"
                  ? "check-circle"
                  : "close-circle"
              }
              size={52}
              color={resultModalType === "success" ? "#16A34A" : "#D32F2F"}
              style={{ marginBottom: 12 }}
            />

            <Text style={styles.confirmTitle}>{resultModalTitle}</Text>

            <Text style={styles.confirmMessage}>{resultModalMessage}</Text>

            <TouchableOpacity
              style={[styles.primaryButton, { width: "100%", marginTop: 6 }]}
              onPress={() => setResultModalVisible(false)}
            >
              <Text style={styles.primaryButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherCourseDetail2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  redHeader: {
    backgroundColor: "#D32F2F",
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  backBtn: {
    marginRight: 8,
    padding: 2,
  },

  headerInfo: {
    flex: 1,
  },

  courseTitle: {
    color: "#FFF",
    fontWeight: "700",
  },

  courseSubText: {
    color: "rgba(255,255,255,0.95)",
    marginTop: 4,
    fontWeight: "600",
  },

  metaText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "500",
  },

  instructorText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginTop: 4,
  },

  classCodeText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "600",
  },

  classCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  copyBtn: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 6,
  },

  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#FFF",
  },

  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },

  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#D32F2F",
  },

  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  tabLabelActive: {
    color: "#D32F2F",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.18)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  sidePanel: {
    backgroundColor: "#FFF",
    maxHeight: "88%",
    borderRadius: 18,
    padding: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  panelTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.18)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  createModalBox: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    maxHeight: "85%",
  },

  materialModalBox: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    maxHeight: "80%",
  },

  modalCardElevated: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "#F1F1F1",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 10,
  },

  createHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  modalHeaderTextWrap: {
    flex: 1,
    marginRight: 12,
  },

  createTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    flex: 1,
    marginRight: 12,
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
    lineHeight: 20,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    marginBottom: 8,
    marginTop: 4,
  },

  inputBox: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFF",
  },

  textAreaBox: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFF",
    minHeight: 96,
    textAlignVertical: "top",
  },

  uploadBtn: {
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },

  uploadBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },

  filePreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  filePreviewText: {
    marginLeft: 10,
    color: "#333",
    flex: 1,
    fontSize: 14,
  },

  materialLabel: {
    fontSize: 13,
    color: "#777",
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "600",
  },

  materialValue: {
    fontSize: 15,
    color: "#222",
    marginBottom: 8,
  },

  materialFileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 18,
  },

  materialFileInfo: {
    flex: 1,
    marginLeft: 10,
  },

  materialFileName: {
    fontSize: 15,
    color: "#222",
    fontWeight: "600",
    marginBottom: 8,
  },

  openFileBtn: {
    backgroundColor: "#D32F2F",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  openFileBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },

  noFileText: {
    fontSize: 14,
    color: "#777",
    marginBottom: 18,
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: "#D32F2F",
    borderRadius: 10,
    padding: 11,
    alignItems: "center",
    marginBottom: 10,
  },

  deleteButtonText: {
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "600",
  },

  updateButton: {
    backgroundColor: "#D32F2F",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 5,
    minWidth: 120,
  },

  updateButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D32F2F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },

  secondaryButtonText: {
    color: "#D32F2F",
    fontWeight: "700",
    fontSize: 14,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },

  dangerButtonFilled: {
    flex: 1,
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  dangerButtonFilledText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },

  confirmIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },

  confirmTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
  },

  confirmMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  checkboxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  checkboxLabel: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },

  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: "#D32F2F",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },

  checkboxBoxChecked: {
    backgroundColor: "#D32F2F",
  },
});