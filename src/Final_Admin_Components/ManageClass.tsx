import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import AddClassModal, {
  AddClassModalInitialData,
  AddClassModalPayload,
} from "./AddClassModal";
import Toast from "./Toast";

type ManageClassProps = {
  width: number;
  currentAdmin?: {
    adminId?: string;
    authUid?: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type BackendClassItem = {
  id: string;
  classCode: string;
  name: string;
  semester: string;
  section: string;
  instructorName: string;
  memberCount: number;
  courseCode?: string;
  schoolYear?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  bannerFileName?: string | null;
  bannerMimeType?: string | null;
  bannerStoragePath?: string | null;
  createdByUid?: string;
  createdByRole?: "teacher" | "admin";
  instructorEmail?: string;
  assignedTeacherId?: string;
  assignedTeacherUid?: string;
  status?: "active" | "archived";
};

type TableClassItem = {
  id: string;
  classCode: string;
  className: string;
  semester: string;
  section: string;
  instructor: string;
  classMembers: number;
};

function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  return host
    ? `http://${host}:5000`
    : "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

const fileUriToBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to convert image to base64."));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read selected image."));
    reader.readAsDataURL(blob);
  });
};

export default function ManageClass({ width, currentAdmin }: ManageClassProps) {
  const [classes, setClasses] = useState<TableClassItem[]>([]);
  const [rawClasses, setRawClasses] = useState<BackendClassItem[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClass, setSelectedClass] =
    useState<AddClassModalInitialData | null>(null);
  const [searchText, setSearchText] = useState("");
  const [classToDelete, setClassToDelete] = useState<TableClassItem | null>(
    null
  );
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  // --- STATES FOR MEMBER MANAGEMENT ---
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [selectedClassForMembers, setSelectedClassForMembers] = useState<TableClassItem | null>(null);
  const [classMembers, setClassMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [newMemberStudentId, setNewMemberStudentId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  // 👇 NEW STATES FOR REMOVE MEMBER MODALS & LOADING
  const [isRemoveMemberConfirmModalVisible, setIsRemoveMemberConfirmModalVisible] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  
  const [isRemoveMemberSuccessModalVisible, setIsRemoveMemberSuccessModalVisible] = useState(false);
  const [isRemoveMemberErrorModalVisible, setIsRemoveMemberErrorModalVisible] = useState(false);
  const [removeMemberErrorMessage, setRemoveMemberErrorMessage] = useState('');

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const tableMinWidth = isMobile ? 1100 : isTablet ? 1200 : 1300; 

  const mapBackendClassToTable = (item: BackendClassItem): TableClassItem => {
    const formattedSchoolYear = item.schoolYear
      ? item.schoolYear.replace("-", " - ")
      : null;

    const classNameWithDetails = [
      item.name,
      item.semester ? `- ${item.semester}` : null,
      formattedSchoolYear ? `(${formattedSchoolYear})` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: item.id,
      classCode: item.classCode,
      className: classNameWithDetails,
      semester: item.semester,
      section: item.section,
      instructor: item.instructorName,
      classMembers: item.memberCount ?? 0,
    };
  };

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch(`${API_BASE_URL}/classes`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch classes");
      const raw = Array.isArray(data) ? data : [];
      setRawClasses(raw);
      setClasses(raw.map(mapBackendClassToTable));
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const filteredClasses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return classes;
    return classes.filter((item) => {
      const searchable = [
        item.classCode,
        item.className,
        item.semester,
        item.section,
        item.instructor,
        `${item.classMembers}`,
      ].join(" ").toLowerCase();
      return searchable.includes(keyword);
    });
  }, [classes, searchText]);

  const resetModalState = () => {
    setIsAddModalVisible(false);
    setIsEditMode(false);
    setSelectedClass(null);
  };

  const handleSubmitClass = async (payload: AddClassModalPayload) => {
    const isCreating = !isEditMode;
    let tempId: string | null = null;

    if (isCreating) {
      // 1. Build a temporary local entry from what the admin just typed
      tempId = `temp-${Date.now()}`;
      const optimisticRaw: BackendClassItem = {
        id: tempId,
        classCode: payload.classCode,
        name: payload.className,
        semester: payload.semester,
        section: payload.section,
        instructorName: "Fetching teacher…", // backend resolves the real name
        memberCount: 0,
        courseCode: payload.courseCode,
        schoolYear: payload.schoolYear,
        description: payload.description,
        bannerUrl: payload.bannerLocalUri,
        bannerFileName: payload.bannerFileName,
        bannerMimeType: payload.bannerMimeType,
        assignedTeacherId: payload.instructorIdentifier,
        status: "active",
      };

      // 2. Show it in the table immediately
      setRawClasses((prev) => [optimisticRaw, ...prev]);
      setClasses((prev) => [mapBackendClassToTable(optimisticRaw), ...prev]);

      // 3. Close the modal right away so it feels instant
      resetModalState();
    }

    try {
      let bannerBase64 = undefined;
      if (payload.bannerLocalUri) {
        const isExistingRemoteBanner =
          payload.bannerLocalUri.startsWith("http://") ||
          payload.bannerLocalUri.startsWith("https://");
        if (!isExistingRemoteBanner) {
          bannerBase64 = await fileUriToBase64(payload.bannerLocalUri);
        }
      } else {
        bannerBase64 = null;
      }

      if (isEditMode && selectedClass?.id) {
        const response = await apiFetch(`${API_BASE_URL}/update-class/${selectedClass.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.className,
            courseCode: payload.courseCode,
            section: payload.section,
            semester: payload.semester,
            schoolYear: payload.schoolYear,
            description: payload.description,
            bannerBase64,
            bannerFileName: payload.bannerFileName,
            bannerMimeType: payload.bannerMimeType,
            instructorIdentifier: payload.instructorIdentifier,
            memberCount: payload.classMembers,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update class");
        resetModalState();
        await loadClasses();
        showToast("Class updated successfully.", "success");
        return;
      }

      const response = await apiFetch(`${API_BASE_URL}/create-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.className,
          courseCode: payload.courseCode,
          section: payload.section,
          semester: payload.semester,
          schoolYear: payload.schoolYear,
          description: payload.description,
          bannerBase64,
          bannerFileName: payload.bannerFileName,
          bannerMimeType: payload.bannerMimeType,
          instructorIdentifier: payload.instructorIdentifier,
          createdByUid: currentAdmin?.authUid || currentAdmin?.adminId || "admin_uid_001",
          createdByRole: "admin",
          createdByName: `${currentAdmin?.firstName || ""} ${currentAdmin?.lastName || ""}`.trim() || "Admin",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create class");

      // 4. Swap the temp row for the real backend data (real id, resolved teacher name, etc.)
      await loadClasses();
      showToast(`Class created successfully. Class Code: ${data?.data?.classCode || payload.classCode}`, "success");
    } catch (error) {
      console.error("Error saving class:", error);

      if (isCreating && tempId) {
        // 5. Roll back the optimistic row if the backend call failed
        setRawClasses((prev) => prev.filter((item) => item.id !== tempId));
        setClasses((prev) => prev.filter((item) => item.id !== tempId));
      }

      showToast(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
        "error"
      );
    }
  };

  const handleEdit = (item: TableClassItem) => {
    const fullClass = rawClasses.find((row) => row.id === item.id);
    if (!fullClass) {
      showToast("Class details not found.", "error");
      return;
    }
    setSelectedClass({
      id: fullClass.id,
      classCode: fullClass.classCode,
      className: fullClass.name,
      courseCode: fullClass.courseCode,
      semester: fullClass.semester,
      section: fullClass.section,
      instructorIdentifier: fullClass.assignedTeacherId || "",
      classMembers: fullClass.memberCount ?? 0,
      schoolYear: fullClass.schoolYear ?? null,
      description: fullClass.description ?? null,
      bannerUrl: fullClass.bannerUrl ?? null,
      bannerFileName: fullClass.bannerFileName ?? null,
      bannerMimeType: fullClass.bannerMimeType ?? null,
    });
    setIsEditMode(true);
    setIsAddModalVisible(true);
  };

  const openDeleteModal = (item: TableClassItem) => {
    setClassToDelete(item);
    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setClassToDelete(null);
    setIsDeleteModalVisible(false);
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    try {
      const response = await apiFetch(`${API_BASE_URL}/delete-class/${classToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete class");
      closeDeleteModal();
      await loadClasses();
      showToast("Class deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting class:", error);
      showToast("Failed to delete class.", "error");
    }
  };

  // --- MEMBER MANAGEMENT FUNCTIONS ---
  const handleViewMembers = async (item: TableClassItem) => {
    setSelectedClassForMembers(item);
    setIsMemberModalVisible(true);
    await fetchClassMembers(item.id);
  };

  const fetchClassMembers = async (classId: string) => {
    try {
      setIsLoadingMembers(true);
      const response = await apiFetch(`${API_BASE_URL}/class-members/${classId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch members");
      setClassMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching members:", error);
      showToast("Failed to load class members.", "error");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedClassForMembers) return;
    const studentId = newMemberStudentId.trim();
    if (!studentId) {
      showToast("Please enter a Student ID.", "error");
      return;
    }
    try {
      setIsAddingMember(true);
      const response = await apiFetch(`${API_BASE_URL}/join-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classCode: selectedClassForMembers.classCode,
          studentId: studentId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add member");
      
      showToast("Member added successfully.", "success");
      setNewMemberStudentId("");
      setIsAddMemberModalVisible(false);
      await fetchClassMembers(selectedClassForMembers.id);
      await loadClasses();
    } catch (error: any) {
      console.error("Error adding member:", error);
      showToast(error.message || "Failed to add member.", "error");
    } finally {
      setIsAddingMember(false);
    }
  };

  // 👇 UPDATED: Opens Custom Confirmation Modal instead of Alert.alert
  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setIsRemoveMemberConfirmModalVisible(true);
  };

  // 👇 NEW: Executes the API call with Loading State
  const confirmRemoveMember = async () => {
    if (!memberToRemove || !selectedClassForMembers) return;
    
    setIsRemovingMember(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/remove-class-member/${memberToRemove.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to remove member");
      
      setIsRemoveMemberConfirmModalVisible(false);
      await fetchClassMembers(selectedClassForMembers.id);
      await loadClasses();
      setIsRemoveMemberSuccessModalVisible(true);
    } catch (error: any) {
      setIsRemoveMemberConfirmModalVisible(false);
      setRemoveMemberErrorMessage(error.message || "Failed to remove member.");
      setIsRemoveMemberErrorModalVisible(true);
    } finally {
      setIsRemovingMember(false);
      setMemberToRemove(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
        <View style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}>
          <Text style={styles.heroEyebrow}>CLASS MANAGEMENT</Text>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Manage Classes
          </Text>
          <Text style={styles.heroSubtitle}>
            View all added classes, manage records, and maintain class details in
            one place.
          </Text>
        </View>
      </View>

      <View style={[styles.toolbar, isMobile && styles.toolbarStack]}>
        <View style={styles.searchWrap}>
          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={18} color="#8A6F6F" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search class, section, semester, or instructor"
              placeholderTextColor="#B79A9A"
              style={styles.searchInput}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryActionButton, isMobile && styles.fullWidthButton]}
          activeOpacity={0.85}
          onPress={() => {
            setIsEditMode(false);
            setSelectedClass(null);
            setIsAddModalVisible(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableCard}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.tableHorizontalContent}
        >
          <ScrollView
          nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            style={styles.tableVerticalScroll}
            contentContainerStyle={styles.tableVerticalContent}
          >
            <View style={{ minWidth: tableMinWidth }}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.codeColumn]}>Class Code</Text>
                <Text style={[styles.tableHeaderText, styles.classNameColumn]}>Class Name with Semester</Text>
                <Text style={[styles.tableHeaderText, styles.sectionColumn]}>Section</Text>
                <Text style={[styles.tableHeaderText, styles.instructorColumn]}>Instructor</Text>
                <Text style={[styles.tableHeaderText, styles.memberColumn]}>Number of Class Member</Text>
                <Text style={[styles.tableHeaderText, styles.actionColumn]}>Action</Text>
              </View>

              {isLoading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="sync-outline" size={28} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>Loading classes...</Text>
                </View>
              ) : filteredClasses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="albums-outline" size={28} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>No classes found</Text>
                </View>
              ) : (
                filteredClasses.map((item, index) => {
                  const isLast = index === filteredClasses.length - 1;
                  return (
                    <View key={item.id} style={[styles.tableBodyRow, !isLast && styles.tableRowBorder]}>
                      <View style={styles.codeColumn}>
                        <Text style={styles.codeBadge}>{item.classCode}</Text>
                      </View>
                      <View style={styles.classNameColumn}>
                        <Text style={styles.tablePrimaryText}>{item.className}</Text>
                      </View>
                      <View style={styles.sectionColumn}>
                        <Text style={styles.tablePrimaryText}>{item.section}</Text>
                      </View>
                      <View style={styles.instructorColumn}>
                        <Text style={styles.tablePrimaryText}>{item.instructor}</Text>
                      </View>
                      <View style={styles.memberColumn}>
                        <Text style={styles.tablePrimaryText}>{item.classMembers}</Text>
                      </View>
                      <View style={[styles.actionColumn, styles.actionCellRow]}>
                        <TouchableOpacity
                          style={[styles.rowActionButton, { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }]}
                          activeOpacity={0.85}
                          onPress={() => handleViewMembers(item)}
                        >
                          <Ionicons name="people-outline" size={15} color="#2563EB" />
                          <Text style={[styles.rowActionButtonText, { color: "#2563EB" }]}>Members</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rowActionButton, styles.editButton]}
                          activeOpacity={0.85}
                          onPress={() => handleEdit(item)}
                        >
                          <Ionicons name="create-outline" size={15} color="#7A4A4A" />
                          <Text style={styles.rowActionButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rowActionButton, styles.deleteButton]}
                          activeOpacity={0.85}
                          onPress={() => openDeleteModal(item)}
                        >
                          <Ionicons name="trash-outline" size={15} color="#DC2626" />
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      <AddClassModal
        visible={isAddModalVisible}
        onClose={resetModalState}
        isMobile={isMobile}
        onCreateClass={handleSubmitClass}
        initialData={selectedClass}
        isEditMode={isEditMode}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteModal} />
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="warning-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.confirmTitle}>Delete Class</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to delete <Text style={styles.confirmHighlight}>{classToDelete?.className || "this class"}</Text>?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancelButton} activeOpacity={0.85} onPress={closeDeleteModal}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteButton} activeOpacity={0.85} onPress={handleConfirmDelete}>
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- PROFESSIONAL BOTTOM SHEET: VIEW MEMBERS --- */}
      <Modal
        visible={isMemberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMemberModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMemberModalVisible(false)} />
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.sheetTitle}>Class Members</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {selectedClassForMembers?.className} • {selectedClassForMembers?.classCode}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMemberModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close-outline" size={24} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{classMembers.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{classMembers.filter(m => m.role === 'student').length}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{classMembers.filter(m => m.role === 'teacher').length}</Text>
                <Text style={styles.statLabel}>Teachers</Text>
              </View>
            </View>

            {/* Member List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {isLoadingMembers ? (
                <View style={[styles.emptyState, { paddingVertical: 60 }]}>
                  <Ionicons name="sync-outline" size={32} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>Loading members...</Text>
                </View>
              ) : classMembers.length === 0 ? (
                <View style={[styles.emptyState, { paddingVertical: 60 }]}>
                  <Ionicons name="people-outline" size={48} color="#F1CACA" />
                  <Text style={styles.emptyStateTitle}>No members yet</Text>
                  <Text style={styles.emptyStateSubtitle}>Add students to this class to get started.</Text>
                </View>
              ) : (
                classMembers.map((member) => {
                  const nameStr = member.name || "Unknown";
                  const initials = nameStr.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  const isTeacher = member.role === 'teacher';
                  const avatarBg = isTeacher ? "#DBEAFE" : "#FEE2E2";
                  const avatarText = isTeacher ? "#1E40AF" : "#991B1B";

                  return (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: avatarBg }]}>
                        <Text style={[styles.memberAvatarText, { color: avatarText }]}>{initials || "U"}</Text>
                      </View>
                      
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName} numberOfLines={1}>{nameStr}</Text>
                        <View style={styles.memberMetaRow}>
                          <View style={[styles.roleBadge, isTeacher ? styles.roleBadgeTeacher : styles.roleBadgeStudent]}>
                            <Text style={[styles.roleBadgeText, isTeacher ? styles.roleBadgeTextTeacher : styles.roleBadgeTextStudent]}>
                              {isTeacher ? "Teacher" : "Student"}
                            </Text>
                          </View>
                          <Text style={styles.memberId} numberOfLines={1}>
                            {member.userId || member.email || "No ID"}
                          </Text>
                        </View>
                      </View>

                      {!isTeacher && (
                        <TouchableOpacity 
                          onPress={() => handleRemoveMember(member.id, member.name)}
                          style={styles.removeMemberBtn}
                        >
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Footer Action */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.addMemberFooterBtn}
                activeOpacity={0.85}
                onPress={() => setIsAddMemberModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addMemberFooterText}>Add New Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- PROFESSIONAL CENTERED MODAL: ADD MEMBER --- */}
      <Modal
        visible={isAddMemberModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddMemberModalVisible(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsAddMemberModalVisible(false)} />
          <View style={styles.addMemberCard}>
             <View style={{ alignItems: "center", marginBottom: 20 }}>
                <View style={[styles.confirmIconWrap, { backgroundColor: "#EFF6FF", marginBottom: 12 }]}>
                  <Ionicons name="person-add-outline" size={28} color="#2563EB" />
                </View>
                <Text style={styles.confirmTitle}>Add Member</Text>
                <Text style={[styles.confirmSubtitle, { marginBottom: 0 }]}>
                  Enter the Student ID of the user you want to enroll.
                </Text>
             </View>

             <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Student ID</Text>
                <TextInput
                  value={newMemberStudentId}
                  onChangeText={setNewMemberStudentId}
                  placeholder="e.g. 20210001"
                  placeholderTextColor="#B79A9A"
                  style={styles.professionalInput}
                />
             </View>

             <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    setNewMemberStudentId("");
                    setIsAddMemberModalVisible(false);
                  }}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmDeleteButton, { backgroundColor: "#2563EB" }]}
                  activeOpacity={0.85}
                  onPress={handleAddMember}
                  disabled={isAddingMember}
                >
                  {isAddingMember ? (
                    <Ionicons name="sync-outline" size={16} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.confirmDeleteText}>{isAddingMember ? "Adding..." : "Enroll"}</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>

      {/* 👇 REMOVE MEMBER CONFIRMATION MODAL */}
      <Modal 
        visible={isRemoveMemberConfirmModalVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => !isRemovingMember && setIsRemoveMemberConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !isRemovingMember && setIsRemoveMemberConfirmModalVisible(false)} />
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="person-remove-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.confirmTitle}>Remove Member</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to remove <Text style={styles.confirmHighlight}>{memberToRemove?.name || "this member"}</Text> from the class?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.confirmCancelButton} 
                activeOpacity={0.85} 
                onPress={() => setIsRemoveMemberConfirmModalVisible(false)}
                disabled={isRemovingMember}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmDeleteButton, { opacity: isRemovingMember ? 0.7 : 1 }]} 
                activeOpacity={0.85} 
                onPress={confirmRemoveMember}
                disabled={isRemovingMember}
              >
                {isRemovingMember ? (
                  <Ionicons name="sync-outline" size={16} color="#FFFFFF" />
                ) : (
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.confirmDeleteText}>{isRemovingMember ? "Removing..." : "Remove"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 👇 REMOVE MEMBER SUCCESS MODAL */}
      <Modal 
        visible={isRemoveMemberSuccessModalVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setIsRemoveMemberSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsRemoveMemberSuccessModalVisible(false)} />
          <View style={styles.confirmModalCard}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#059669" />
            </View>
            <Text style={styles.confirmTitle}>Success</Text>
            <Text style={styles.confirmSubtitle}>
              Member has been successfully removed from the class.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={[styles.confirmDeleteButton, { backgroundColor: "#059669" }]} 
                activeOpacity={0.85} 
                onPress={() => setIsRemoveMemberSuccessModalVisible(false)}
              >
                <Text style={styles.confirmDeleteText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 👇 REMOVE MEMBER ERROR MODAL */}
      <Modal 
        visible={isRemoveMemberErrorModalVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setIsRemoveMemberErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsRemoveMemberErrorModalVisible(false)} />
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.confirmTitle}>Unable to Remove Member</Text>
            <Text style={styles.confirmSubtitle}>
              {removeMemberErrorMessage || "An error occurred while trying to remove the member."}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={[styles.confirmDeleteButton, { backgroundColor: "#7A4A4A" }]} 
                activeOpacity={0.85} 
                onPress={() => setIsRemoveMemberErrorModalVisible(false)}
              >
                <Text style={styles.confirmDeleteText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heroCard: {
    backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#F3D4D4",
    padding: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20,
  },
  heroCardMobile: { flexDirection: "column", alignItems: "flex-start" },
  heroTextSection: { flex: 1, marginRight: 20 },
  heroTextMobile: { marginRight: 0, marginBottom: 0 },
  heroEyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, color: "#DC2626", marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#2B1111", marginBottom: 8 },
  heroTitleMobile: { fontSize: 22 },
  heroSubtitle: { fontSize: 14, color: "#8A6F6F", lineHeight: 22 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 },
  toolbarStack: { flexDirection: "column", alignItems: "stretch" },
  searchWrap: { flex: 1 },
  searchField: {
    height: 54, borderRadius: 16, borderWidth: 1, borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9", paddingHorizontal: 14, flexDirection: "row", alignItems: "center",
  },
  searchInput: { flex: 1, marginLeft: 10, height: "80%", fontSize: 14, color: "#2B1111", fontWeight: "600" },
  primaryActionButton: {
    height: 54, minWidth: 120, paddingHorizontal: 18, borderRadius: 16,
    backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", flexDirection: "row",
  },
  fullWidthButton: { width: "100%" },
  primaryActionButtonText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", marginLeft: 8 },
  tableCard: {flex: 1,
    minHeight: 0, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#F3D4D4", overflow: "hidden" },
  tableHorizontalContent: { flexGrow: 1 },
  tableVerticalScroll: { maxHeight: 520 },
  tableVerticalContent: { flexGrow: 1 },
  tableHeaderRow: {
    minHeight: 58, backgroundColor: "#FFF5F5", flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F8E3E3",
  },
  tableBodyRow: { minHeight: 82, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, backgroundColor: "#FFFFFF" },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F8E3E3" },
  tableHeaderText: { fontSize: 13, fontWeight: "800", color: "#7A4A4A" },
  tablePrimaryText: { fontSize: 14, fontWeight: "700", color: "#2B1111" },
  codeColumn: { width: 140, paddingRight: 12 },
  classNameColumn: { width: 360, paddingRight: 12 },
  sectionColumn: { width: 170, paddingRight: 22, paddingLeft: 40 },
  instructorColumn: { width: 240, paddingRight: 12, paddingLeft: 50 },
  memberColumn: { width: 190, paddingRight: 12 },
  actionColumn: { width: 320 },
  codeBadge: {
    alignSelf: "flex-start", backgroundColor: "#FEE2E2", color: "#DC2626",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, overflow: "hidden", fontSize: 12, fontWeight: "800",
  },
  actionCellRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", paddingVertical: 8 },
  rowActionButton: {
    minHeight: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexDirection: "row", marginRight: 8, marginBottom: 8,
  },
  editButton: { borderColor: "#E7C0C0", backgroundColor: "#FFF7F7" },
  deleteButton: { borderColor: "#F5C2C7", backgroundColor: "#FFF1F2" },
  rowActionButtonText: { fontSize: 13, fontWeight: "700", color: "#7A4A4A", marginLeft: 6 },
  deleteButtonText: { fontSize: 13, fontWeight: "700", color: "#DC2626", marginLeft: 6 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyStateTitle: { marginTop: 12, fontSize: 17, fontWeight: "800", color: "#2B1111" },
  emptyStateSubtitle: { marginTop: 6, fontSize: 13, color: "#8A6F6F", textAlign: "center" },
  
  // --- MODALS BASE ---
  modalOverlay: { flex: 1, backgroundColor: "rgba(43, 17, 17, 0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  confirmModalCard: {
    width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 24,
    borderWidth: 1, borderColor: "#F3D4D4", padding: 24, alignItems: "center",
  },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 22, fontWeight: "800", color: "#2B1111", marginBottom: 8 },
  confirmSubtitle: { fontSize: 14, color: "#8A6F6F", textAlign: "center", lineHeight: 22, marginBottom: 22 },
  confirmHighlight: { fontWeight: "800", color: "#2B1111" },
  confirmActions: { flexDirection: "row", width: "100%", justifyContent: "center", gap: 12 },
  confirmCancelButton: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: "#E7C0C0", backgroundColor: "#FFF7F7", alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontSize: 14, fontWeight: "700", color: "#7A4A4A" },
  confirmDeleteButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  confirmDeleteText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", marginLeft: 8 },

  // --- BOTTOM SHEET (MEMBERS PREVIEW) ---
  bottomSheetOverlay: { flex: 1, backgroundColor: "rgba(43, 17, 17, 0.45)", justifyContent: "flex-end" },
  bottomSheetContainer: {
    flex: 1, maxHeight: "92%", width: "100%", maxWidth: 600, alignSelf: "center",
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 15,
  },
  bottomSheetHandle: { width: 40, height: 5, backgroundColor: "#E7C0C0", borderRadius: 10, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: "#2B1111" },
  sheetSubtitle: { fontSize: 14, color: "#8A6F6F", marginTop: 4, fontWeight: "600" },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF5F5", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "#FFF9F9", borderWidth: 1, borderColor: "#F3D4D4", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#DC2626" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#8A6F6F", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  
  // Member Row
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F8E3E3" },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 14 },
  memberAvatarText: { fontSize: 15, fontWeight: "800" },
  memberInfo: { flex: 1, marginRight: 12 },
  memberName: { fontSize: 15, fontWeight: "700", color: "#2B1111" },
  memberMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeStudent: { backgroundColor: "#FEE2E2" },
  roleBadgeTeacher: { backgroundColor: "#DBEAFE" },
  roleBadgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  roleBadgeTextStudent: { color: "#991B1B" },
  roleBadgeTextTeacher: { color: "#1E40AF" },
  memberId: { fontSize: 13, color: "#8A6F6F", fontWeight: "500" },
  removeMemberBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center" },
  sheetFooter: { paddingVertical: 20, borderTopWidth: 1, borderTopColor: "#F8E3E3" },
  addMemberFooterBtn: {
    height: 52, borderRadius: 16, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", flexDirection: "row",
    shadowColor: "#DC2626", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  addMemberFooterText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginLeft: 8 },

  // --- ADD MEMBER MODAL ---
  centeredModalOverlay: { flex: 1, backgroundColor: "rgba(43, 17, 17, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  addMemberCard: {
    width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#7A4A4A", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  professionalInput: {
    width: "100%", height: 52, borderWidth: 1.5, borderColor: "#F1CACA", borderRadius: 14,
    paddingHorizontal: 16, backgroundColor: "#FFF9F9", fontSize: 15, color: "#2B1111", fontWeight: "600",
  },
});