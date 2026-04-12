import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { AddAdminModal } from "./AdminDashboard";
import {
    addAdminRecord,
    deleteAdminRecord,
    getAdminRecords,
    updateAdminRecord,
    type AdminItem,
} from "./adminStore";

type ManageAdminProps = {
  width: number;
};

export default function ManageAdmin({ width }: ManageAdminProps) {
  const [admins, setAdmins] = useState<AdminItem[]>(getAdminRecords());
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const tableMinWidth = isMobile ? 980 : isTablet ? 1080 : 1180;

  useEffect(() => {
    setAdmins([...getAdminRecords()]);
  }, []);

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

  const handleAddAdmin = (payload: {
    adminId: string;
    firstName: string;
    lastName: string;
    birthday: string;
    email: string;
  }) => {
    addAdminRecord(payload);
    setAdmins([...getAdminRecords()]);
    setIsAddModalVisible(false);
  };

  const handleEdit = (item: AdminItem) => {
    const updatedItem: AdminItem = {
      ...item,
      firstName: `${item.firstName} (Edited)`,
    };

    updateAdminRecord(updatedItem);
    setAdmins([...getAdminRecords()]);
  };

  const handleDelete = (id: string) => {
    deleteAdminRecord(id);
    setAdmins([...getAdminRecords()]);
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
          onPress={() => setIsAddModalVisible(true)}
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

              {filteredAdmins.map((item, index) => {
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
                        onPress={() => handleDelete(item.id)}
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
              })}

              {filteredAdmins.length === 0 && (
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
              )}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      <AddAdminModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        isMobile={isMobile}
        onSubmitAdmin={handleAddAdmin}
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

  idColumn: {
    width: 160,
    paddingRight: 12,
  },

  nameColumn: {
    width: 280,
    paddingRight: 12,
  },

  birthdayColumn: {
    width: 180,
    paddingRight: 12,
  },

  emailColumn: {
    width: 320,
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
});