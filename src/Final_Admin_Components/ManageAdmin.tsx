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

function getInitials(firstName: string, lastName: string): string {
  const a = firstName?.trim()?.[0] || "";
  const b = lastName?.trim()?.[0] || "";
  return (a + b).toUpperCase() || "?";
}

// Small deterministic palette so each admin gets a consistent avatar color
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
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

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
            <Ionicons name="search-outline" size={18} color="#A18888" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search admin ID, name, birthday, or email"
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
            setSelectedAdmin(null);
            setIsAddModalVisible(true);
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>Add Admin</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableCardInner}>
          <View style={styles.tableMetaRow}>
            <Text style={styles.tableMetaText}>
              {filteredAdmins.length} {filteredAdmins.length === 1 ? "admin" : "admins"}
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
                    <Text style={styles.emptyStateTitle}>Loading admins...</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Please wait while administrator records are fetched.
                    </Text>
                  </View>
                ) : filteredAdmins.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="account-cog-outline"
                      size={26}
                      color="#DC2626"
                    />
                    <Text style={styles.emptyStateTitle}>No admins found</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Try another search or add a new administrator record.
                    </Text>
                  </View>
                ) : (
                  filteredAdmins.map((item) => {
                    const avatarColors = getAvatarColors(item.id || item.email);
                    const isHovered = hoveredRowId === item.id;

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
                          <Text style={styles.codeBadge}>{item.adminId}</Text>
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
                            {item.firstName} {item.lastName}
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
                          <TouchableOpacity
                            style={styles.iconActionButton}
                            activeOpacity={0.7}
                            onPress={() => handleEdit(item)}
                          >
                            <Ionicons
                              name="create-outline"
                              size={16}
                              color="#57474A"
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.iconActionButton, styles.iconActionButtonDanger]}
                            activeOpacity={0.7}
                            onPress={() => openDeleteModal(item)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#DC2626"
                            />
                          </TouchableOpacity>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
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
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1E4E4",
  },

  tableBodyRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
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

  actionHeaderText: {
    textAlign: "right",
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
    width: 150,
    paddingRight: 12,
  },

  nameColumn: {
    width: 260,
    paddingRight: 12,
  },

  nameCell: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  avatarText: {
    fontSize: 12,
    fontWeight: "800",
  },

  birthdayColumn: {
    width: 160,
    paddingRight: 12,
  },

  emailColumn: {
    width: 300,
    paddingRight: 12,
  },

  actionColumn: {
    width: 100,
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
    marginLeft: 6,
    backgroundColor: "#F7F3F3",
  },

  iconActionButtonDanger: {
    backgroundColor: "#FEF2F2",
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