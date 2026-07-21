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

function getInitials(className: string): string {
  const words = className.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Small deterministic palette so each class gets a consistent avatar color
const AVATAR_PALETTE = [
  { bg: "#FEE2E2", fg: "#DC2626" },
  { bg: "#FFE8D6", fg: "#C2410C" },
  { bg: "#FDE68A33", fg: "#B45309" },
  { bg: "#E0E7FF", fg: "#4338CA" },
  { bg: "#DCFCE7", fg: "#15803D" },
  { bg: "#F3E8FF", fg: "#7E22CE" },
];

function getAvatarColors(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

type SortColumn =
  | "classCode"
  | "className"
  | "section"
  | "instructor"
  | "classMembers"
  | null;
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 8;

// Builds a compact page list like: 1 2 3 4 5 ... 15
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}

type SortableHeaderProps = {
  label: string;
  column: Exclude<SortColumn, null>;
  activeColumn: SortColumn;
  direction: SortDirection;
  onPress: (column: Exclude<SortColumn, null>) => void;
  style?: any;
};

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onPress,
  style,
}: SortableHeaderProps) {
  const isActive = activeColumn === column;

  return (
    <TouchableOpacity
      style={[styles.sortableHeaderButton, style]}
      activeOpacity={0.6}
      onPress={() => onPress(column)}
    >
      <Text
        style={[
          styles.tableHeaderText,
          isActive && styles.tableHeaderTextActive,
        ]}
      >
        {label}
      </Text>
      <Ionicons
        name={
          isActive
            ? direction === "asc"
              ? "chevron-up"
              : "chevron-down"
            : "swap-vertical-outline"
        }
        size={12}
        color={isActive ? "#DC2626" : "#C7B0B0"}
        style={styles.sortIcon}
      />
    </TouchableOpacity>
  );
}

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
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowMenu, setRowMenu] = useState<{
    item: TableClassItem;
    x: number;
    y: number;
  } | null>(null);
  const rowMenuButtonRefs = React.useRef<Record<string, View | null>>({});

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
  const tableMinWidth = isMobile ? 1000 : isTablet ? 1080 : 1160;

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

  const sortedClasses = useMemo(() => {
    if (!sortColumn) return filteredClasses;

    const getValue = (item: TableClassItem) => {
      switch (sortColumn) {
        case "classCode":
          return item.classCode.toLowerCase();
        case "className":
          return item.className.toLowerCase();
        case "section":
          return item.section.toLowerCase();
        case "instructor":
          return item.instructor.toLowerCase();
        case "classMembers":
          return item.classMembers;
        default:
          return "";
      }
    };

    const sorted = [...filteredClasses].sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    });

    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredClasses, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedClasses.length / PAGE_SIZE));

  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedClasses.slice(start, start + PAGE_SIZE);
  }, [sortedClasses, currentPage]);

  // Reset to page 1 whenever the underlying result set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, sortColumn, sortDirection, classes.length]);

  const handleSort = (column: Exclude<SortColumn, null>) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const openRowMenu = (item: TableClassItem, key: string) => {
    const node = rowMenuButtonRefs.current[key];
    if (node && (node as any).measureInWindow) {
      (node as any).measureInWindow(
        (x: number, y: number, w: number, h: number) => {
          setRowMenu({ item, x: x + w, y: y + h });
        }
      );
    } else {
      setRowMenu({ item, x: 0, y: 0 });
    }
  };

  const closeRowMenu = () => setRowMenu(null);

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
            <Ionicons name="search-outline" size={18} color="#A18888" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search class, section, semester, or instructor"
              placeholderTextColor="#C2ABAB"
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
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableCardInner}>
          <View style={styles.tableMetaRow}>
            <Text style={styles.tableMetaText}>
              {sortedClasses.length} {sortedClasses.length === 1 ? "class" : "classes"}
            </Text>
          </View>

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
                  <SortableHeader
                    label="Class Code"
                    column="classCode"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.codeColumn}
                  />
                  <SortableHeader
                    label="Class Name with Semester"
                    column="className"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.classNameColumn}
                  />
                  <SortableHeader
                    label="Section"
                    column="section"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.sectionColumn}
                  />
                  <SortableHeader
                    label="Instructor"
                    column="instructor"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.instructorColumn}
                  />
                  <SortableHeader
                    label="Members"
                    column="classMembers"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.memberColumn}
                  />
                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.actionColumn,
                      styles.actionHeaderText,
                    ]}
                  >
                    Action
                  </Text>
                </View>

                {isLoading ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="sync-outline" size={26} color="#DC2626" />
                    <Text style={styles.emptyStateTitle}>Loading classes...</Text>
                  </View>
                ) : paginatedClasses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="albums-outline" size={26} color="#DC2626" />
                    <Text style={styles.emptyStateTitle}>No classes found</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Try another search or add a new class record.
                    </Text>
                  </View>
                ) : (
                  paginatedClasses.map((item) => {
                    const avatarColors = getAvatarColors(item.id || item.classCode);
                    const isHovered = hoveredRowId === item.id;
                    const menuKey = item.id;

                    return (
                      <Pressable
                        key={item.id}
                        onHoverIn={() => setHoveredRowId(item.id)}
                        onHoverOut={() => setHoveredRowId(null)}
                        style={[
                          styles.tableBodyRow,
                          isHovered && styles.tableBodyRowHovered,
                        ]}
                      >
                        <View style={styles.codeColumn}>
                          <Text style={styles.codeBadge}>{item.classCode}</Text>
                        </View>

                        <View style={[styles.classNameColumn, styles.nameCell]}>
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: avatarColors.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.avatarText,
                                { color: avatarColors.fg },
                              ]}
                            >
                              {getInitials(item.className)}
                            </Text>
                          </View>
                          <Text style={styles.tablePrimaryText} numberOfLines={2}>
                            {item.className}
                          </Text>
                        </View>

                        <View style={styles.sectionColumn}>
                          <Text style={styles.tableSecondaryText} numberOfLines={1}>
                            {item.section || "—"}
                          </Text>
                        </View>

                        <View style={styles.instructorColumn}>
                          <Text style={styles.tableSecondaryText} numberOfLines={1}>
                            {item.instructor || "—"}
                          </Text>
                        </View>

                        <View style={styles.memberColumn}>
                          <View style={styles.memberCountBadge}>
                            <Ionicons name="people-outline" size={13} color="#57474A" />
                            <Text style={styles.memberCountText}>{item.classMembers}</Text>
                          </View>
                        </View>

                        <View style={[styles.actionColumn, styles.actionCellRow]}>
                          <View
                            ref={(node) => {
                              rowMenuButtonRefs.current[menuKey] = node;
                            }}
                            collapsable={false}
                          >
                            <TouchableOpacity
                              style={styles.iconActionButton}
                              activeOpacity={0.7}
                              onPress={() => openRowMenu(item, menuKey)}
                            >
                              <Ionicons
                                name="ellipsis-horizontal"
                                size={16}
                                color="#57474A"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </ScrollView>

          {!isLoading && sortedClasses.length > 0 && (
            <View style={styles.paginationBar}>
              <TouchableOpacity
                style={[
                  styles.paginationNavButton,
                  currentPage === 1 && styles.paginationNavButtonDisabled,
                ]}
                activeOpacity={0.7}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <Ionicons name="chevron-back" size={15} color={currentPage === 1 ? "#CBB8B8" : "#57474A"} />
                <Text
                  style={[
                    styles.paginationNavText,
                    currentPage === 1 && styles.paginationNavTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.paginationPages}>
                {getPageNumbers(currentPage, totalPages).map((page, idx) =>
                  page === "..." ? (
                    <Text key={`ellipsis-${idx}`} style={styles.paginationEllipsis}>
                      ⋯
                    </Text>
                  ) : (
                    <TouchableOpacity
                      key={page}
                      style={[
                        styles.paginationPageButton,
                        currentPage === page && styles.paginationPageButtonActive,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setCurrentPage(page)}
                    >
                      <Text
                        style={[
                          styles.paginationPageText,
                          currentPage === page && styles.paginationPageTextActive,
                        ]}
                      >
                        {page}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationNavButton,
                  currentPage === totalPages && styles.paginationNavButtonDisabled,
                ]}
                activeOpacity={0.7}
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <Text
                  style={[
                    styles.paginationNavText,
                    currentPage === totalPages && styles.paginationNavTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={currentPage === totalPages ? "#CBB8B8" : "#57474A"}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {rowMenu && (
        <Modal transparent visible animationType="fade" onRequestClose={closeRowMenu}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeRowMenu} />
          <View
            style={[
              styles.rowMenuCard,
              {
                position: "absolute",
                top: rowMenu.y + 6,
                left: Math.max(12, rowMenu.x - 190),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.rowMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                const item = rowMenu.item;
                closeRowMenu();
                handleViewMembers(item);
              }}
            >
              <Ionicons name="people-outline" size={16} color="#2563EB" />
              <Text style={[styles.rowMenuItemText, styles.rowMenuItemTextInfo]}>
                Members
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rowMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                const item = rowMenu.item;
                closeRowMenu();
                handleEdit(item);
              }}
            >
              <Ionicons name="create-outline" size={16} color="#3A2C2C" />
              <Text style={styles.rowMenuItemText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rowMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                const item = rowMenu.item;
                closeRowMenu();
                openDeleteModal(item);
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
              <Text style={[styles.rowMenuItemText, styles.rowMenuItemTextDanger]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

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
    height: 50, borderRadius: 14, borderWidth: 1, borderColor: "#EFE3E3",
    backgroundColor: "#FFFFFF", paddingHorizontal: 16, flexDirection: "row", alignItems: "center",
  },
  searchInput: { flex: 1, marginLeft: 10, height: "80%", fontSize: 14, color: "#2B1111", fontWeight: "500" },
  primaryActionButton: {
    height: 50, minWidth: 140, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", flexDirection: "row",
    shadowColor: "#DC2626", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 3,
  },
  fullWidthButton: { width: "100%" },
  primaryActionButtonText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginLeft: 6 },

  tableCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#F1E4E4",
    overflow: "hidden", flex: 1, minHeight: 0,
    shadowColor: "#3B0D0D", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 1,
  },
  tableCardInner: { flex: 1, minHeight: 0 },
  tableMetaRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  tableMetaText: {
    fontSize: 12, fontWeight: "700", color: "#A88989", letterSpacing: 0.4, textTransform: "uppercase",
  },
  tableHorizontalContent: { flexGrow: 1 },
  tableVerticalScroll: { maxHeight: 520 },
  tableVerticalContent: { flexGrow: 1 },
  tableHeaderRow: {
    minHeight: 44, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F1E4E4",
  },
  tableBodyRow: {
    minHeight: 78, flexDirection: "row", alignItems: "center", paddingHorizontal: 20,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F8F1F1",
  },
  tableBodyRowHovered: { backgroundColor: "#FFFAFA" },
  tableHeaderText: {
    fontSize: 11, fontWeight: "700", color: "#B99C9C", letterSpacing: 0.6, textTransform: "uppercase",
  },
  tableHeaderTextActive: { color: "#DC2626" },
  actionHeaderText: { textAlign: "right" },
  sortableHeaderButton: { flexDirection: "row", alignItems: "center" },
  sortIcon: { marginLeft: 4 },

  tablePrimaryText: { fontSize: 14, fontWeight: "600", color: "#2B1111", flexShrink: 1 },
  tableSecondaryText: { fontSize: 13.5, fontWeight: "500", color: "#8A6F6F" },

  codeColumn: { width: 140, paddingRight: 12 },
  classNameColumn: { width: 320, paddingRight: 12 },
  nameCell: { flexDirection: "row", alignItems: "center" },
  sectionColumn: { width: 140, paddingRight: 12 },
  instructorColumn: { width: 220, paddingRight: 12 },
  memberColumn: { width: 130, paddingRight: 12 },
  actionColumn: { width: 90 },

  avatar: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  avatarText: { fontSize: 12, fontWeight: "800" },

  codeBadge: {
    alignSelf: "flex-start", backgroundColor: "#FDF2F2", color: "#B5484B",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: "hidden",
    fontSize: 12, fontWeight: "700", borderWidth: 1, borderColor: "#F5DEDE",
  },

  memberCountBadge: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    backgroundColor: "#F7F3F3", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  memberCountText: { fontSize: 13, fontWeight: "700", color: "#57474A", marginLeft: 6 },

  actionCellRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  iconActionButton: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F3F3",
  },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyStateTitle: { marginTop: 12, fontSize: 17, fontWeight: "800", color: "#2B1111" },
  emptyStateSubtitle: { marginTop: 6, fontSize: 13, color: "#8A6F6F", textAlign: "center" },

  paginationBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#F1E4E4",
  },
  paginationNavButton: {
    flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
  },
  paginationNavButtonDisabled: { opacity: 0.6 },
  paginationNavText: { fontSize: 13, fontWeight: "600", color: "#57474A", marginHorizontal: 4 },
  paginationNavTextDisabled: { color: "#CBB8B8" },
  paginationPages: { flexDirection: "row", alignItems: "center", gap: 4 },
  paginationPageButton: {
    minWidth: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  paginationPageButtonActive: { backgroundColor: "#DC2626" },
  paginationPageText: { fontSize: 13, fontWeight: "600", color: "#8A6F6F" },
  paginationPageTextActive: { color: "#FFFFFF", fontWeight: "700" },
  paginationEllipsis: { fontSize: 13, color: "#C7B0B0", marginHorizontal: 4 },

  rowMenuCard: {
    width: 190, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#F1E4E4",
    paddingVertical: 6,
    shadowColor: "#3B0D0D", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
  },
  rowMenuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14 },
  rowMenuItemText: { fontSize: 14, fontWeight: "600", color: "#3A2C2C", marginLeft: 10 },
  rowMenuItemTextDanger: { color: "#DC2626" },
  rowMenuItemTextInfo: { color: "#2563EB" },

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