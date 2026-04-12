import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type SidebarProps = {
  activeItem: string | null;
  onChange: (item: string) => void;
  isMobile: boolean;
  visible: boolean;
  onClose: () => void;
  adminName: string;
};

const MENU_ITEMS = [
  {
    label: "Analytics",
    icon: (color: string) => (
      <Ionicons name="analytics-outline" size={18} color={color} />
    ),
  },
  {
    label: "Settings",
    icon: (color: string) => (
      <Feather name="settings" size={18} color={color} />
    ),
  },
  {
    label: "Logout",
    icon: (color: string) => (
      <MaterialCommunityIcons name="logout" size={18} color={color} />
    ),
  },
];

function MenuContent({
  activeItem,
  onChange,
  adminName,
  isMobileMenu = false,
}: {
  activeItem: string | null;
  onChange: (item: string) => void;
  adminName: string;
  isMobileMenu?: boolean;
}) {
  const topItems = MENU_ITEMS.filter((item) => item.label !== "Logout");
  const logoutItem = MENU_ITEMS.find((item) => item.label === "Logout");

  const firstLetter = adminName?.trim()?.charAt(0)?.toUpperCase() || "A";

  return (
    <View style={[styles.sidebar, isMobileMenu && styles.mobileSidebar]}>
      <View>
        <View style={styles.logoArea}>
          <View style={styles.logoMini}>
            <Text style={styles.logoMiniText}>{firstLetter}</Text>
          </View>

          <View style={styles.workspaceTextWrap}>
            <Text style={styles.workspaceTitle}>{adminName}</Text>
            <Text style={styles.workspaceSubtitle}>Admin Workspace</Text>
          </View>
        </View>

        <Text style={styles.panelLabel}>TOOLS</Text>

        {topItems.map((item) => {
          const isActive = activeItem === item.label;
          const iconColor = isActive ? "#DC2626" : "#667085";

          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuButton, isActive && styles.menuButtonActive]}
              onPress={() => onChange(item.label)}
              activeOpacity={0.85}
            >
              <View style={styles.iconWrap}>{item.icon(iconColor)}</View>

              <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                {item.label}
              </Text>

              {isActive ? (
                <View style={styles.activeDot} />
              ) : (
                <Ionicons name="chevron-forward" size={15} color="#98A2B3" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {logoutItem && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => onChange(logoutItem.label)}
          activeOpacity={0.85}
        >
          <View style={styles.iconWrap}>{logoutItem.icon("#EF4444")}</View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Sidebar({
  activeItem,
  onChange,
  isMobile,
  visible,
  onClose,
  adminName,
}: SidebarProps) {
  if (!isMobile) {
    return (
      <MenuContent
        activeItem={activeItem}
        onChange={onChange}
        adminName={adminName}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconBox}>
                <Feather name="menu" size={22} color="#DC2626" />
              </View>

              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>Admin Tools</Text>
                <Text style={styles.modalSubtitle}>
                  Navigate analytics, settings, and account actions.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#7A4A4A" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            <MenuContent
              activeItem={activeItem}
              onChange={onChange}
              adminName={adminName}
              isMobileMenu={true}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 16,
    margin: 16,
    borderRadius: 24,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F3D4D4",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },

  mobileSidebar: {
    width: "100%",
    margin: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    backgroundColor: "transparent",
  },

  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  workspaceTextWrap: {
    flex: 1,
  },

  logoMini: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  logoMiniText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },

  workspaceTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },

  workspaceSubtitle: {
    color: "#667085",
    fontSize: 12,
    marginTop: 2,
  },

  panelLabel: {
    color: "#98A2B3",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 14,
    marginLeft: 4,
  },

  menuButton: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  menuButtonActive: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  iconWrap: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  menuText: {
    flex: 1,
    color: "#344054",
    fontSize: 15,
    fontWeight: "600",
  },

  menuTextActive: {
    color: "#DC2626",
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 12,
    justifyContent: "center",
  },

  logoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
  },

  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F8E3E3",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  modalHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    paddingRight: 16,
  },

  modalHeaderTextWrap: {
    flex: 1,
  },

  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#8A6F6F",
  },

  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    padding: 24,
    paddingBottom: 22,
  },
});