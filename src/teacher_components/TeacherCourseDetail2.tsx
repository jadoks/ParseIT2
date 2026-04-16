import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  const [assignmentDisableRepositoryAfterDue, setAssignmentDisableRepositoryAfterDue] =
    useState(false);
  const [classCodeCopied, setClassCodeCopied] = useState(false);

  const [pickedFile, setPickedFile] = useState<{
    name?: string | undefined;
    uri?: string | undefined;
    type?: string | undefined;
  } | null>(null);

  const [pickedAssignmentFile, setPickedAssignmentFile] = useState<{
    name?: string | undefined;
    uri?: string | undefined;
    type?: string | undefined;
  } | null>(null);

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

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
      });
    } catch {
      Alert.alert("Error", "Failed to pick file.");
    }
  };

  const handlePickAssignmentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setPickedAssignmentFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
      });
    } catch {
      Alert.alert("Error", "Failed to pick assignment file.");
    }
  };

  const handleOpenUploadedFile = async (fileUri?: string) => {
    if (!fileUri) {
      Alert.alert("No File", "No uploaded file available.");
      return;
    }

    try {
      await Linking.openURL(fileUri);
    } catch {
      Alert.alert("Error", "Unable to open the file.");
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
      Alert.alert("Error", "No class selected.");
      return;
    }

    if (activeTab === "Materials") {
      if (!formTitle.trim()) {
        Alert.alert("Required", "Please enter a title.");
        return;
      }

      if (!formWeek.trim()) {
        Alert.alert("Required", "Please enter the week.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/create-class-material`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId: course.id,
            title: formTitle.trim(),
            week: formWeek.trim(),
            content: `${formWeek.trim()} material: ${formTitle.trim()}`,
            fileName: pickedFile?.name ?? null,
            fileUrl: pickedFile?.uri ?? null,
            fileType: pickedFile?.type ?? null,
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
        Alert.alert("Success", "Material created successfully.");
      } catch (error) {
        console.error("Create material error:", error);
        Alert.alert("Error", "Failed to create material.");
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
      Alert.alert("Required", "Please complete all assignment fields.");
      return;
    }

    try {
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
          fileName: pickedAssignmentFile?.name ?? null,
          fileUrl: pickedAssignmentFile?.uri ?? null,
          fileType: pickedAssignmentFile?.type ?? null,
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
      Alert.alert("Success", "Assignment created successfully.");
    } catch (error) {
      console.error("Create assignment error:", error);
      Alert.alert("Error", "Failed to create assignment.");
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
      Alert.alert("Success", "Assignment Updated");
    } catch (error) {
      console.error("Update assignment error:", error);
      Alert.alert("Error", "Failed to update assignment.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
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
          } catch (error) {
            console.error("Delete assignment error:", error);
            Alert.alert("Error", "Failed to delete assignment.");
          }
        },
      },
    ]);
  };

  const handleAddMember = async () => {
    if (!course?.id) {
      Alert.alert("Error", "No class selected.");
      return;
    }

    if (!memberIdInput.trim()) {
      Alert.alert("Required", "Please enter a student ID.");
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
      Alert.alert("Success", "Member added successfully.");
    } catch (error) {
      console.error("Add member error:", error);
      Alert.alert("Error", "Failed to add member.");
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
                  style={styles.inputBox}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  placeholder="Enter Instruction"
                  placeholderTextColor="#999"
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

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>Delete Assignment</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                  <Text style={styles.updateButtonText}>Update Assignment</Text>
                </TouchableOpacity>
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

            <Text style={[styles.courseSubText, { fontSize: isMobile ? 14 : 16 }]}>
              {visibleCourseCode}
              {courseSection ? ` • ${courseSection}` : ""}
            </Text>

            {!!courseYear && <Text style={styles.metaText}>{courseYear}</Text>}

            {!!courseSemester && (
              <Text style={styles.metaText}>{courseSemester}</Text>
            )}

            <Text style={styles.instructorText}>Instructor: {courseInstructor}</Text>

            <View style={styles.classCodeRow}>
              <Text style={styles.classCodeText}>Class Code: {classCode}</Text>

              <TouchableOpacity onPress={handleCopyClassCode} style={styles.copyBtn}>
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
          <Text style={[styles.tabLabel, activeTab === "Materials" && styles.tabLabelActive]}>
            Materials ({materials.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "Assignments" && styles.tabActive]}
          onPress={() => setActiveTab("Assignments")}
        >
          <MaterialCommunityIcons
            name="clipboard-list"
            size={isMobile ? 20 : 22}
            color={activeTab === "Assignments" ? "#D32F2F" : "#333"}
          />
          <Text style={[styles.tabLabel, activeTab === "Assignments" && styles.tabLabelActive]}>
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
              styles.createModalBox,
              { width: isMobile ? Math.min(width - 28, 360) : 420 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>
                Create {activeTab === "Materials" ? "Material" : "Assignment"}
              </Text>
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
              <TextInput
                style={styles.inputBox}
                placeholder={activeTab === "Materials" ? "Material Title" : "Enter Header"}
                placeholderTextColor="#999"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {activeTab === "Materials" ? (
                <>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Week (example: Week 1)"
                    placeholderTextColor="#999"
                    value={formWeek}
                    onChangeText={setFormWeek}
                  />

                  <TouchableOpacity style={styles.uploadBtn} onPress={handlePickFile}>
                    <MaterialCommunityIcons name="upload" size={20} color="#FFF" />
                    <Text style={styles.uploadBtnText}>Upload File</Text>
                  </TouchableOpacity>

                  {pickedFile?.name ? (
                    <View style={styles.filePreviewBox}>
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={22}
                        color="#D32F2F"
                      />
                      <Text style={styles.filePreviewText}>{pickedFile.name}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Enter Instruction"
                    placeholderTextColor="#999"
                    value={formDesc}
                    onChangeText={setFormDesc}
                  />
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Total Score"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={formPoints}
                    onChangeText={setFormPoints}
                  />
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Points On Time"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={formWeek}
                    onChangeText={setFormWeek}
                  />
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Set Due Date"
                    placeholderTextColor="#999"
                    value={formDue}
                    onChangeText={setFormDue}
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
                        <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                      ) : null}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={handlePickAssignmentFile}
                  >
                    <MaterialCommunityIcons name="upload" size={20} color="#FFF" />
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

              <TouchableOpacity style={styles.updateButton} onPress={handleCreate}>
                <Text style={styles.updateButtonText}>Create</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMaterialModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.materialModalBox,
              { width: isMobile ? Math.min(width - 28, 360) : 520 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>
                {selectedMaterial?.title || "Material"}
              </Text>
              <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.materialLabel}>Week</Text>
            <Text style={styles.materialValue}>{selectedMaterial?.week || "-"}</Text>

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

            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => setShowMaterialModal(false)}
            >
              <Text style={styles.updateButtonText}>Close</Text>
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

  createHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  createTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    flex: 1,
    marginRight: 12,
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
  },

  updateButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
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