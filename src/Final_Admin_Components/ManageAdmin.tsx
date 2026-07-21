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

import AddAdminModal, { AddAdminModalInitialData } from "./AddAdminModal";
import type { AdminFormPayload } from "./adminTypes";
import Toast from "./Toast";

type ManageAdminProps = {
  width: number;
};

type BackendAdminItem = {
  id: string;
  adminId: string;
  firstName: string;
  lastName: string;
  birthday?: string | { _seconds?: number; seconds?: number } | null;
  email: string;
};

type TableAdminItem = {
  id: string;
  adminId: string;
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

function formatBirthday(value: BackendAdminItem["birthday"]): string {
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

function mapBackendAdmin(item: BackendAdminItem): TableAdminItem {
  return {
    id: item.id,
    adminId: item.adminId || "",
    firstName: item.firstName || "",
    lastName: item.lastName || "",
    birthday: formatBirthday(item.birthday),
    email: item.email || "",
  };
}

export default function ManageAdmin({ width }: ManageAdminProps) {
  const [admins, setAdmins] = useState<TableAdminItem[]>([]);
  const [rawAdmins, setRawAdmins] = useState<BackendAdminItem[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAdmin, setSelectedAdmin] =
    useState<AddAdminModalInitialData | null>(null);
  const [searchText, setSearchText] = useState("");
  const [adminToDelete, setAdminToDelete] = useState<TableAdminItem | null>(
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

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const tableMinWidth = isMobile ? 980 : isTablet ? 1080 : 1180;

  const loadAdmins = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await apiFetch(`${API_BASE_URL}/admins`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch admins");
      }

      const raw = Array.isArray(data) ? data : [];
      setRawAdmins(raw);
      setAdmins(raw.map(mapBackendAdmin));
    } catch (error) {
      console.error("Error loading admins:", error);
      showToast("Failed to load admins.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const filteredAdmins = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return admins;

    return admins.filter((item) => {
      const searchable = [
        item.adminId,
        item.firstName,
        item.lastName,
        item.birthday,
        item.email,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [admins, searchText]);

  const resetModalState = () => {
    setIsAddModalVisible(false);
    setIsEditMode(false);
    setSelectedAdmin(null);
  };

  const handleSubmitAdmin = async (payload: AdminFormPayload) => {
    const isCreating = !isEditMode;
    let tempId: string | null = null;

    if (isCreating) {
      // 1. Build a temporary local entry from what the admin just typed
      tempId = `temp-${Date.now()}`;
      const optimisticRaw: BackendAdminItem = {
        id: tempId,
        adminId: (payload as any).adminId || "",
        firstName: (payload as any).firstName || "",
        lastName: (payload as any).lastName || "",
        birthday: (payload as any).birthday || "",
        email: (payload as any).email || "",
      };

      // 2. Show it in the table immediately
      setRawAdmins((prev) => [optimisticRaw, ...prev]);
      setAdmins((prev) => [mapBackendAdmin(optimisticRaw), ...prev]);

      // 3. Close the modal right away so it feels instant
      resetModalState();
    }

    try {
      if (isEditMode && selectedAdmin?.id) {
        const response = await apiFetch(`${API_BASE_URL}/update-admin/${selectedAdmin.id}`,
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
          throw new Error(data.error || "Failed to update admin");
        }

        resetModalState();
        await loadAdmins();
        showToast("Admin updated successfully.", "success");
        return;
      }

      const response = await apiFetch(`${API_BASE_URL}/create-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin");
      }

      // 4. Swap the temp row for the real backend data
      await loadAdmins();
      showToast("Admin created successfully.", "success");
    } catch (error) {
      console.error("Error saving admin:", error);

      if (isCreating && tempId) {
        // 5. Roll back the optimistic row if the backend call failed
        setRawAdmins((prev) => prev.filter((item) => item.id !== tempId));
        setAdmins((prev) => prev.filter((item) => item.id !== tempId));
      }

      showToast(
        error instanceof Error ? error.message : "Failed to save admin.",
        "error"
      );
    }
  };

  const handleEdit = (item: TableAdminItem) => {
    const fullAdmin = rawAdmins.find((row) => row.id === item.id);

    if (!fullAdmin) {
      showToast("Admin details not found.", "error");
      return;
    }

    setSelectedAdmin({
      id: fullAdmin.id,
      adminId: fullAdmin.adminId,
      firstName: fullAdmin.firstName,
      lastName: fullAdmin.lastName,
      birthday: formatBirthday(fullAdmin.birthday),
      email: fullAdmin.email,
    });

    setIsEditMode(true);
    setIsAddModalVisible(true);
  };

  const openDeleteModal = (item: TableAdminItem) => {
    setAdminToDelete(item);
    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setAdminToDelete(null);
    setIsDeleteModalVisible(false);
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;

    try {
      const response = await apiFetch(`${API_BASE_URL}/delete-admin/${adminToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete admin");
      }

      closeDeleteModal();
      await loadAdmins();
      showToast("Admin deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting admin:", error);
      showToast("Failed to delete admin.", "error");
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
        <View
          style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
        >
          <Text style={styles.heroEyebrow}>ADMIN MANAGEMENT</Text>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Manage Admin
          </Text>
          <Text style={styles.heroSubtitle}>
            View all administrators, manage records, and maintain admin details
            in one place.
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
              placeholder="Search admin ID, name, birthday, or email"
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
            setSelectedAdmin(null);
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
                <Text style={[styles.tableHeaderText, styles.idColumn]}>
                  Admin ID
                </Text>
                <Text style={[styles.tableHeaderText, styles.nameColumn]}>
                  Full Name
                </Text>
                <Text style={[styles.tableHeaderText, styles.birthdayColumn]}>
                  Birthday
                </Text>
                <Text style={[styles.tableHeaderText, styles.emailColumn]}>
                  Email
                </Text>
                <Text style={[styles.tableHeaderText, styles.actionColumn]}>
                  Action
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="sync-outline" size={28} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>Loading admins...</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Please wait while administrator records are fetched.
                  </Text>
                </View>
              ) : filteredAdmins.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="account-cog-outline"
                    size={28}
                    color="#DC2626"
                  />
                  <Text style={styles.emptyStateTitle}>No admins found</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Try another search or add a new administrator record.
                  </Text>
                </View>
              ) : (
                filteredAdmins.map((item, index) => {
                  const isLast = index === filteredAdmins.length - 1;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.tableBodyRow,
                        !isLast && styles.tableRowBorder,
                      ]}
                    >
                      <View style={styles.idColumn}>
                        <Text style={styles.codeBadge}>{item.adminId}</Text>
                      </View>

                      <View style={styles.nameColumn}>
                        <Text style={styles.tablePrimaryText}>
                          {item.firstName} {item.lastName}
                        </Text>
                      </View>

                      <View style={styles.birthdayColumn}>
                        <Text style={styles.tablePrimaryText}>
                          {item.birthday}
                        </Text>
                      </View>

                      <View style={styles.emailColumn}>
                        <Text style={styles.tablePrimaryText}>{item.email}</Text>
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

      <AddAdminModal
        visible={isAddModalVisible}
        onClose={resetModalState}
        isMobile={isMobile}
        onSubmitAdmin={handleSubmitAdmin}
        initialData={selectedAdmin}
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

            <Text style={styles.confirmTitle}>Delete Admin</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to delete{" "}
              <Text style={styles.confirmHighlight}>
                {adminToDelete
                  ? `${adminToDelete.firstName} ${adminToDelete.lastName}`
                  : "this admin"}
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
    flex: 1,
    minHeight: 0,
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

  idColumn: {
    width: 160,
    paddingRight: 12,
  },

  nameColumn: {
    width: 260,
    paddingRight: 12,
  },

  birthdayColumn: {
    width: 180,
    paddingRight: 12,
  },

  emailColumn: {
    width: 300,
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