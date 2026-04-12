import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AdminDashboard from "./Final_Admin_Components/AdminDashboard";
import Analytics from "./Final_Admin_Components/Analytics";
import Header from "./Final_Admin_Components/Header";
import ManageAdmin from "./Final_Admin_Components/ManageAdmin";
import ManageClass from "./Final_Admin_Components/ManageClass";
import ManageStudent from "./Final_Admin_Components/ManageStudent";
import ManageTeacher from "./Final_Admin_Components/ManageTeacher";
import Settings from "./Final_Admin_Components/Settings";
import Sidebar from "./Final_Admin_Components/Sidebar";

type Props = {
  onLogout: () => void;
};

export default function AdminApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const [activeTopNav, setActiveTopNav] = useState("Dashboard");
  const [activeSideNav, setActiveSideNav] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeContentScreen, setActiveContentScreen] = useState("Dashboard");
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const handleTopNavChange = (item: string) => {
    setActiveTopNav(item);
    setActiveSideNav(null);
    setActiveContentScreen(item);
    setSidebarVisible(false);
  };

  const confirmLogout = () => {
    setIsLogoutModalVisible(false);
    setActiveTopNav("Dashboard");
    setActiveSideNav(null);
    setActiveContentScreen("Dashboard");
    setSidebarVisible(false);
    onLogout();
  };

  const handleSideNavChange = (item: string) => {
    if (item === "Logout") {
      setSidebarVisible(false);
      setIsLogoutModalVisible(true);
      return;
    }

    setActiveTopNav("Dashboard");
    setActiveSideNav(item);
    setActiveContentScreen(item);
    setSidebarVisible(false);
  };

  const handleNavigateToManageClass = () => {
    setActiveTopNav("Class");
    setActiveSideNav(null);
    setActiveContentScreen("Class");
    setSidebarVisible(false);
  };

  const handleNavigateToManageAdmin = () => {
    setActiveTopNav("Admin");
    setActiveSideNav(null);
    setActiveContentScreen("Admin");
    setSidebarVisible(false);
  };

  const handleNavigateToManageStudent = () => {
    setActiveTopNav("Student");
    setActiveSideNav(null);
    setActiveContentScreen("Student");
    setSidebarVisible(false);
  };

  const handleNavigateToManageTeacher = () => {
    setActiveTopNav("Teacher");
    setActiveSideNav(null);
    setActiveContentScreen("Teacher");
    setSidebarVisible(false);
  };

  const handleNavigateToDashboard = () => {
    setActiveTopNav("Dashboard");
    setActiveSideNav(null);
    setActiveContentScreen("Dashboard");
    setSidebarVisible(false);
  };

  const renderContent = () => {
    if (activeSideNav === "Analytics") {
      return <Analytics width={width} />;
    }

    if (activeSideNav === "Settings") {
      return <Settings width={width} />;
    }

    if (activeTopNav === "Class" || activeContentScreen === "Class") {
      return <ManageClass width={width} />;
    }

    if (activeTopNav === "Admin" || activeContentScreen === "Admin") {
      return <ManageAdmin width={width} />;
    }

    if (activeTopNav === "Student" || activeContentScreen === "Student") {
      return <ManageStudent width={width} />;
    }

    if (activeTopNav === "Teacher" || activeContentScreen === "Teacher") {
      return <ManageTeacher width={width} />;
    }

    if (activeTopNav === "Dashboard" || activeContentScreen === "Dashboard") {
      return (
        <AdminDashboard
          width={width}
          onOpenManageClass={handleNavigateToManageClass}
          onOpenManageAdmin={handleNavigateToManageAdmin}
          onOpenManageStudent={handleNavigateToManageStudent}
          onOpenManageTeacher={handleNavigateToManageTeacher}
          onBackToDashboard={handleNavigateToDashboard}
        />
      );
    }

    return (
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderTitle}>{activeTopNav}</Text>
        <Text style={styles.placeholderSubtitle}>
          This section is ready for your next screen.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        activeItem={activeTopNav}
        onChange={handleTopNavChange}
        isMobile={isMobile}
        isTablet={isTablet}
        onMenuPress={() => setSidebarVisible((prev) => !prev)}
        isSidebarOpen={sidebarVisible || activeSideNav !== null}
      />

      <View style={styles.body}>
        {!isMobile && (
          <Sidebar
            activeItem={activeSideNav}
            onChange={handleSideNavChange}
            isMobile={false}
            visible={true}
            onClose={() => {}}
            adminName="John"
          />
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            isMobile && styles.contentContainerMobile,
            styles.contentContainerGrow,
          ]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>
      </View>

      {isMobile && (
        <Sidebar
          activeItem={activeSideNav}
          onChange={handleSideNavChange}
          isMobile={true}
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          adminName="John"
        />
      )}

      <Modal
        visible={isLogoutModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsLogoutModalVisible(false)}
          />

          <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                </View>

                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>Confirm Logout</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsLogoutModalVisible(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

          <View style={styles.modalContent}>
          <Text style={styles.simpleMessage}>
            Are you sure you want to logout?
          </Text>
        </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setIsLogoutModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDangerButton}
                onPress={confirmLogout}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalDangerButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  body: {
    flex: 1,
    flexDirection: "row",
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    padding: 24,
    paddingBottom: 80,
  },

  contentContainerMobile: {
    padding: 16,
    paddingBottom: 28,
  },

  contentContainerGrow: {
    flexGrow: 1,
  },

  placeholderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
  },

  placeholderTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2B1111",
    marginBottom: 8,
  },

  placeholderSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
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
    maxWidth: 640,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
  },

  modalCardMobile: {
    maxWidth: "100%",
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
    justifyContent: "center",
    alignContent: "center",
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
    paddingBottom: 12,
  },
simpleMessage: {
  fontSize: 18,
  color: "#7A4A4A",
  lineHeight: 22,
},
  messageBox: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFF9F9",
    padding: 16,
    justifyContent: "center",
  },

  messageTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#7A4A4A",
  },

  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "center",
  },

  modalSecondaryButton: {
    height: 48,
    paddingHorizontal: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7C0C0",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A4A4A",
  },

  modalDangerButton: {
    height: 48,
    paddingHorizontal: 38,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  modalDangerButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});