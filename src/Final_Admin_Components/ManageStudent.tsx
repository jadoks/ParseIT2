import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
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

import AddStudentModal, {
  AddStudentModalInitialData,
} from "./AddStudentModal";
import Toast from "./Toast";

type ManageStudentProps = {
  width: number;
};

type StudentFormPayload = {
  studentId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
};

type BackendStudentItem = {
  id: string;
  studentId?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string | { _seconds?: number; seconds?: number } | null;
  email?: string;
};

type TableStudentItem = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
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

function formatBirthday(value: BackendStudentItem["birthday"]): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value?._seconds) {
    const date = new Date(value._seconds * 1000);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  if (value?.seconds) {
    const date = new Date(value.seconds * 1000);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  return "";
}

function mapStudent(item: BackendStudentItem): TableStudentItem {
  return {
    id: item.id || item.studentId || "",
    studentId: item.studentId || "",
    firstName: item.firstName || "",
    lastName: item.lastName || "",
    birthday: formatBirthday(item.birthday),
    email: item.email || "",
  };
}

function getInitials(firstName: string, lastName: string): string {
  const a = firstName?.trim()?.[0] || "";
  const b = lastName?.trim()?.[0] || "";
  return (a + b).toUpperCase() || "?";
}

// Small deterministic palette so each student gets a consistent avatar color
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

type SortColumn = "studentId" | "name" | "birthday" | "email" | null;
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 8;

// The table only needs to be as wide as its columns actually require.
// This is used as a floor (not a forced width), so on normal/wide
// screens the table simply fills the available space with no
// horizontal scrollbar, and only narrow phones fall back to scrolling.
const TABLE_CONTENT_MIN_WIDTH = 900;

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

export default function ManageStudent({ width }: ManageStudentProps) {
  const [students, setStudents] = useState<TableStudentItem[]>([]);
  const [rawStudents, setRawStudents] = useState<BackendStudentItem[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<AddStudentModalInitialData | null>(null);
  const [searchText, setSearchText] = useState("");
  const [studentToDelete, setStudentToDelete] =
    useState<TableStudentItem | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowMenu, setRowMenu] = useState<{
    item: TableStudentItem;
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

  const isMobile = width < 768;

  const loadStudents = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await apiFetch(`${API_BASE_URL}/students`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch students");
      }

      const raw = Array.isArray(data) ? data : [];
      setRawStudents(raw);
      setStudents(raw.map(mapStudent));
    } catch (error) {
      console.error("Error loading students:", error);
      showToast("Failed to load students.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return students;

    return students.filter((item) => {
      const searchable = [
        item.studentId,
        item.firstName,
        item.lastName,
        item.birthday,
        item.email,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [students, searchText]);

  const sortedStudents = useMemo(() => {
    if (!sortColumn) return filteredStudents;

    const getValue = (item: TableStudentItem) => {
      switch (sortColumn) {
        case "studentId":
          return item.studentId.toLowerCase();
        case "name":
          return `${item.firstName} ${item.lastName}`.trim().toLowerCase();
        case "birthday":
          return item.birthday;
        case "email":
          return item.email.toLowerCase();
        default:
          return "";
      }
    };

    const sorted = [...filteredStudents].sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    });

    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredStudents, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / PAGE_SIZE));

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedStudents.slice(start, start + PAGE_SIZE);
  }, [sortedStudents, currentPage]);

  // Reset to page 1 whenever the underlying result set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, sortColumn, sortDirection, students.length]);

  const handleSort = (column: Exclude<SortColumn, null>) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const openRowMenu = (item: TableStudentItem, key: string) => {
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
    setSelectedStudent(null);
  };

  const handleSubmitStudent = async (payload: StudentFormPayload) => {
    const isCreating = !isEditMode;
    let tempId: string | null = null;

    if (isCreating) {
      // 1. Build a temporary local entry from what was just typed
      tempId = `temp-${Date.now()}`;
      const optimisticRaw: BackendStudentItem = {
        id: tempId,
        studentId: payload.studentId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        birthday: payload.birthday,
        email: payload.email,
      };

      // 2. Show it in the table immediately
      setRawStudents((prev) => [optimisticRaw, ...prev]);
      setStudents((prev) => [mapStudent(optimisticRaw), ...prev]);

      // 3. Close the modal right away so it feels instant
      resetModalState();
    }

    try {
      if (isEditMode && selectedStudent?.id) {
        const response = await apiFetch(`${API_BASE_URL}/update-student/${selectedStudent.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update student");
        }

        resetModalState();
        await loadStudents();
        showToast("Student updated successfully.", "success");
        return;
      }

      const response = await apiFetch(`${API_BASE_URL}/create-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create student");
      }

      // 4. Swap the temp row for the real backend data
      await loadStudents();
      showToast("Student created successfully.", "success");
    } catch (error) {
      console.error("Error saving student:", error);

      if (isCreating && tempId) {
        // 5. Roll back the optimistic row if the backend call failed
        setRawStudents((prev) => prev.filter((item) => item.id !== tempId));
        setStudents((prev) => prev.filter((item) => item.id !== tempId));
      }

      showToast(
        error instanceof Error ? error.message : "Failed to save student.",
        "error"
      );
    }
  };

  const handleEdit = (item: TableStudentItem) => {
    const fullStudent = rawStudents.find((row) => row.id === item.id);

    if (!fullStudent) {
      showToast("Student details not found.", "error");
      return;
    }

    setSelectedStudent({
      id: fullStudent.id,
      studentId: fullStudent.studentId || "",
      firstName: fullStudent.firstName || "",
      lastName: fullStudent.lastName || "",
      birthday: formatBirthday(fullStudent.birthday),
      email: fullStudent.email || "",
    });

    setIsEditMode(true);
    setIsAddModalVisible(true);
  };

  const openDeleteModal = (item: TableStudentItem) => {
    setStudentToDelete(item);
    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setStudentToDelete(null);
    setIsDeleteModalVisible(false);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      const response = await apiFetch(`${API_BASE_URL}/delete-student/${studentToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete student");
      }

      closeDeleteModal();
      await loadStudents();
      showToast("Student deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting student:", error);
      showToast("Failed to delete student.", "error");
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
        <View
          style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
        >
          <Text style={styles.heroEyebrow}>STUDENT MANAGEMENT</Text>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Manage Student
          </Text>
          <Text style={styles.heroSubtitle}>
            View all students, manage records, and maintain student details in
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
              placeholder="Search student ID, name, birthday, or email"
              placeholderTextColor="#C2ABAB"
              style={styles.searchInput}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryActionButton,
            isMobile && styles.fullWidthButton,
          ]}
          activeOpacity={0.85}
          onPress={() => {
            setIsEditMode(false);
            setSelectedStudent(null);
            setIsAddModalVisible(true);
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>Add Student</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableCardInner}>
          <View style={styles.tableMetaRow}>
            <Text style={styles.tableMetaText}>
              {sortedStudents.length} {sortedStudents.length === 1 ? "student" : "students"}
            </Text>
          </View>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.tableHorizontalContent}
          >
            <ScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              style={styles.tableVerticalScroll}
              contentContainerStyle={styles.tableVerticalContent}
            >
              <View style={{ minWidth: TABLE_CONTENT_MIN_WIDTH }}>
                <View style={styles.tableHeaderRow}>
                  <SortableHeader
                    label="Student ID"
                    column="studentId"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.idColumn}
                  />
                  <SortableHeader
                    label="Full Name"
                    column="name"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.nameColumn}
                  />
                  <SortableHeader
                    label="Birthday"
                    column="birthday"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.birthdayColumn}
                  />
                  <SortableHeader
                    label="Email"
                    column="email"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onPress={handleSort}
                    style={styles.emailColumn}
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
                    <Text style={styles.emptyStateTitle}>Loading students...</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Please wait while student records are fetched.
                    </Text>
                  </View>
                ) : paginatedStudents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="account-school-outline"
                      size={26}
                      color="#DC2626"
                    />
                    <Text style={styles.emptyStateTitle}>No students found</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Try another search or add a new student record.
                    </Text>
                  </View>
                ) : (
                  paginatedStudents.map((item) => {
                    const avatarColors = getAvatarColors(item.id || item.email);
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
                        <View style={styles.idColumn}>
                          <Text style={styles.codeBadge}>{item.studentId}</Text>
                        </View>

                        <View style={[styles.nameColumn, styles.nameCell]}>
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
                              {getInitials(item.firstName, item.lastName)}
                            </Text>
                          </View>
                          <Text style={styles.tablePrimaryText} numberOfLines={1}>
                            {`${item.firstName} ${item.lastName}`.toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.birthdayColumn}>
                          <Text style={styles.tableSecondaryText}>
                            {item.birthday || "—"}
                          </Text>
                        </View>

                        <View style={styles.emailColumn}>
                          <Text style={styles.tableSecondaryText} numberOfLines={1}>
                            {item.email}
                          </Text>
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

          {!isLoading && sortedStudents.length > 0 && (
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
                left: Math.max(12, rowMenu.x - 180),
              },
            ]}
          >
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

      <AddStudentModal
        visible={isAddModalVisible}
        onClose={resetModalState}
        isMobile={isMobile}
        onSubmitStudent={handleSubmitStudent}
        initialData={selectedStudent}
        isEditMode={isEditMode}
      />

      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteModal} />

          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="warning-outline" size={28} color="#DC2626" />
            </View>

            <Text style={styles.confirmTitle}>Delete Student</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to delete{" "}
              <Text style={styles.confirmHighlight}>
                {studentToDelete
                  ? `${studentToDelete.firstName} ${studentToDelete.lastName}`
                  : "this student"}
              </Text>
              ?
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                activeOpacity={0.85}
                onPress={closeDeleteModal}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteButton}
                activeOpacity={0.85}
                onPress={handleConfirmDelete}
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.confirmDeleteText}>Delete</Text>
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
  screen: {
    flex: 1,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  heroCardMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
  },

  heroTextSection: {
    flex: 1,
    marginRight: 20,
  },

  heroTextMobile: {
    marginRight: 0,
    marginBottom: 0,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#DC2626",
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 8,
  },

  heroTitleMobile: {
    fontSize: 22,
  },

  heroSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
    lineHeight: 22,
  },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12,
  },

  toolbarStack: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  searchWrap: {
    flex: 1,
  },

  searchField: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFE3E3",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    height: "80%",
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "500",
  },

  primaryActionButton: {
    height: 50,
    minWidth: 140,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },

  fullWidthButton: {
    width: "100%",
  },

  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 6,
  },

  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1E4E4",
    overflow: "hidden",
    flex: 1,
    minHeight: 0,
    shadowColor: "#3B0D0D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 1,
  },

  tableCardInner: {
    flex: 1,
    minHeight: 0,
  },

  tableMetaRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  tableMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A88989",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  tableHorizontalContent: {
    flexGrow: 1,
  },

  tableVerticalScroll: {
    maxHeight: 520,
  },

  tableVerticalContent: {
    flexGrow: 1,
  },

  tableHeaderRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1E4E4",
  },

  tableBodyRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F8F1F1",
  },

  tableBodyRowHovered: {
    backgroundColor: "#FFFAFA",
  },

  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B99C9C",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  tableHeaderTextActive: {
    color: "#DC2626",
  },

  actionHeaderText: {
    textAlign: "right",
  },

  sortableHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  sortIcon: {
    marginLeft: 4,
  },

  tablePrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2B1111",
    flexShrink: 1,
  },

  tableSecondaryText: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "#8A6F6F",
  },

  idColumn: {
    width: 130,
    paddingRight: 8,
  },

  nameColumn: {
    width: 220,
    paddingRight: 8,
  },

  nameCell: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText: {
    fontSize: 11,
    fontWeight: "800",
  },

  birthdayColumn: {
    width: 130,
    paddingRight: 8,
  },

  emailColumn: {
    width: 250,
    paddingRight: 8,
  },

  actionColumn: {
    width: 70,
  },

  codeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FDF2F2",
    color: "#B5484B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#F5DEDE",
  },

  actionCellRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F3F3",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyStateTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    color: "#2B1111",
  },

  emptyStateSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#8A6F6F",
    textAlign: "center",
  },

  paginationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1E4E4",
  },

  paginationNavButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  paginationNavButtonDisabled: {
    opacity: 0.6,
  },

  paginationNavText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#57474A",
    marginHorizontal: 4,
  },

  paginationNavTextDisabled: {
    color: "#CBB8B8",
  },

  paginationPages: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  paginationPageButton: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  paginationPageButtonActive: {
    backgroundColor: "#DC2626",
  },

  paginationPageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8A6F6F",
  },

  paginationPageTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  paginationEllipsis: {
    fontSize: 13,
    color: "#C7B0B0",
    marginHorizontal: 4,
  },

  rowMenuCard: {
    width: 190,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1E4E4",
    paddingVertical: 6,
    shadowColor: "#3B0D0D",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },

  rowMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  rowMenuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A2C2C",
    marginLeft: 10,
  },

  rowMenuItemTextDanger: {
    color: "#DC2626",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  confirmModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 24,
    alignItems: "center",
  },

  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  confirmTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 8,
  },

  confirmSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 22,
  },

  confirmHighlight: {
    fontWeight: "800",
    color: "#2B1111",
  },

  confirmActions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    gap: 12,
  },

  confirmCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7C0C0",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A4A4A",
  },

  confirmDeleteButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  confirmDeleteText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});