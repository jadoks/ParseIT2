import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AddClassModal, {
  AddClassModalInitialData,
  AddClassModalPayload,
} from "./AddClassModal";

type ManageClassProps = {
  width: number;
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

export default function ManageClass({ width }: ManageClassProps) {
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

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const tableMinWidth = isMobile ? 980 : isTablet ? 1080 : 1180;

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

      const response = await fetch(`${API_BASE_URL}/classes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch classes");
      }

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
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [classes, searchText]);

  const resetModalState = () => {
    setIsAddModalVisible(false);
    setIsEditMode(false);
    setSelectedClass(null);
  };

  const handleSubmitClass = async (payload: AddClassModalPayload) => {
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
        const response = await fetch(
          `${API_BASE_URL}/update-class/${selectedClass.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
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
              instructorName: payload.instructor,
              memberCount: payload.classMembers,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update class");
        }

        resetModalState();
        await loadClasses();
        Alert.alert("Success", "Class updated successfully.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/create-class`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          instructorName: payload.instructor,
          instructorEmail: "admin@email.com",
          createdByUid: "admin_uid_001",
          createdByRole: "admin",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create class");
      }

      resetModalState();
      await loadClasses();

      Alert.alert(
        "Success",
        `Class created successfully.\nClass Code: ${
          data?.data?.classCode || payload.classCode
        }`
      );
    } catch (error) {
      console.error("Error saving class:", error);
     
    }
  };

  const handleEdit = (item: TableClassItem) => {
    const fullClass = rawClasses.find((row) => row.id === item.id);
    if (!fullClass) {
      Alert.alert("Error", "Class details not found.");
      return;
    }

    setSelectedClass({
      id: fullClass.id,
      classCode: fullClass.classCode,
      className: fullClass.name,
      courseCode: fullClass.courseCode,
      semester: fullClass.semester,
      section: fullClass.section,
      instructor: fullClass.instructorName,
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
      const response = await fetch(
        `${API_BASE_URL}/delete-class/${classToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete class");
      }

      closeDeleteModal();
      await loadClasses();

      Alert.alert("Success", "Class deleted successfully.");
    } catch (error) {
      console.error("Error deleting class:", error);
      
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
        <View
          style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
        >
          <Text style={styles.heroEyebrow}>CLASS MANAGEMENT</Text>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Manage Class
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
          style={[
            styles.primaryActionButton,
            isMobile && styles.fullWidthButton,
          ]}
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
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.tableHorizontalContent}
        >
          <ScrollView
            showsVerticalScrollIndicator={true}
            style={styles.tableVerticalScroll}
            contentContainerStyle={styles.tableVerticalContent}
          >
            <View style={{ minWidth: tableMinWidth }}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.codeColumn]}>
                  Class Code
                </Text>
                <Text style={[styles.tableHeaderText, styles.classNameColumn]}>
                  Class Name with Semester
                </Text>
                <Text style={[styles.tableHeaderText, styles.sectionColumn]}>
                  Section
                </Text>
                <Text style={[styles.tableHeaderText, styles.instructorColumn]}>
                  Instructor
                </Text>
                <Text style={[styles.tableHeaderText, styles.memberColumn]}>
                  Number of Class Member
                </Text>
                <Text style={[styles.tableHeaderText, styles.actionColumn]}>
                  Action
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="sync-outline" size={28} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>Loading classes...</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Please wait while class records are fetched.
                  </Text>
                </View>
              ) : filteredClasses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="albums-outline" size={28} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>No classes found</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Try another search or add a new class record.
                  </Text>
                </View>
              ) : (
                filteredClasses.map((item, index) => {
                  const isLast = index === filteredClasses.length - 1;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.tableBodyRow,
                        !isLast && styles.tableRowBorder,
                      ]}
                    >
                      <View style={styles.codeColumn}>
                        <Text style={styles.codeBadge}>{item.classCode}</Text>
                      </View>

                      <View style={styles.classNameColumn}>
                        <Text style={styles.tablePrimaryText}>
                          {item.className}
                        </Text>
                      </View>

                      <View style={styles.sectionColumn}>
                        <Text style={styles.tablePrimaryText}>{item.section}</Text>
                      </View>

                      <View style={styles.instructorColumn}>
                        <Text style={styles.tablePrimaryText}>
                          {item.instructor}
                        </Text>
                      </View>

                      <View style={styles.memberColumn}>
                        <Text style={styles.tablePrimaryText}>
                          {item.classMembers}
                        </Text>
                      </View>

                      <View style={[styles.actionColumn, styles.actionCellRow]}>
                        <TouchableOpacity
                          style={[styles.rowActionButton, styles.editButton]}
                          activeOpacity={0.85}
                          onPress={() => handleEdit(item)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={15}
                            color="#7A4A4A"
                          />
                          <Text style={styles.rowActionButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rowActionButton, styles.deleteButton]}
                          activeOpacity={0.85}
                          onPress={() => openDeleteModal(item)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#DC2626"
                          />
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

      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDeleteModal}
          />

          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="warning-outline" size={28} color="#DC2626" />
            </View>

            <Text style={styles.confirmTitle}>Delete Class</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to delete{" "}
              <Text style={styles.confirmHighlight}>
                {classToDelete?.className || "this class"}
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
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    height: "80%",
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
  },

  primaryActionButton: {
    height: 54,
    minWidth: 120,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  fullWidthButton: {
    width: "100%",
  },

  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
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
    minHeight: 58,
    backgroundColor: "#FFF5F5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8E3E3",
  },

  tableBodyRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },

  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F8E3E3",
  },

  tableHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7A4A4A",
  },

  tablePrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2B1111",
  },

  codeColumn: {
    width: 140,
    paddingRight: 12,
  },

  classNameColumn: {
    width: 300,
    paddingRight: 12,
  },

  sectionColumn: {
    width: 170,
    paddingRight: 12,
  },

  instructorColumn: {
    width: 240,
    paddingRight: 12,
  },

  memberColumn: {
    width: 190,
    paddingRight: 12,
  },

  actionColumn: {
    width: 220,
  },

  codeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "800",
  },

  actionCellRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingVertical: 8,
  },

  rowActionButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 8,
    marginBottom: 8,
  },

  editButton: {
    borderColor: "#E7C0C0",
    backgroundColor: "#FFF7F7",
  },

  deleteButton: {
    borderColor: "#F5C2C7",
    backgroundColor: "#FFF1F2",
  },

  rowActionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A4A4A",
    marginLeft: 6,
  },

  deleteButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    marginLeft: 6,
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