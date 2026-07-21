import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AdminDashboard from "./Final_Admin_Components/AdminDashboard";
import Analytics from "./Final_Admin_Components/Analytics";
import Header from "./Final_Admin_Components/Header";
import ManageAdmin from "./Final_Admin_Components/ManageAdmin";
import ManageClass from "./Final_Admin_Components/ManageClass";
import ManageStudent from "./Final_Admin_Components/ManageStudent";
import ManageTeacher from "./Final_Admin_Components/ManageTeacher";
import Settings from "./Final_Admin_Components/Settings";
import Sidebar from "./Final_Admin_Components/Sidebar";

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

type CurrentAdmin = {
  adminId: string;
  authUid?: string | null;
  firstName: string;
  lastName: string;
  email: string;
};

type Props = {
  onLogout: () => void;
  currentAdmin: CurrentAdmin;
};

// Snapshot of the navigation state we can jump back to.
type ScreenSnapshot = {
  activeTopNav: string;
  activeSideNav: string | null;
  activeContentScreen: string;
};

export default function AdminApp({ onLogout, currentAdmin }: Props) {
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const safeAreaEdges = ['top', 'right', 'bottom', 'left'] as const;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const adminName =
    `${currentAdmin.firstName || ""} ${currentAdmin.lastName || ""}`.trim() || "Admin";

  const [activeTopNav, setActiveTopNav] = useState("Dashboard");
  const [activeSideNav, setActiveSideNav] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeContentScreen, setActiveContentScreen] = useState("Dashboard");
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Remembers whatever screen the user was on right before we navigated
  // to Settings/Analytics, so "close" can send them back to it instead
  // of always hardcoding Dashboard.
  const [previousScreen, setPreviousScreen] = useState<ScreenSnapshot>({
    activeTopNav: "Dashboard",
    activeSideNav: null,
    activeContentScreen: "Dashboard",
  });

  const captureCurrentScreen = (): ScreenSnapshot => ({
    activeTopNav,
    activeSideNav,
    activeContentScreen,
  });

  const restoreScreen = (snapshot: ScreenSnapshot) => {
    setActiveTopNav(snapshot.activeTopNav);
    setActiveSideNav(snapshot.activeSideNav);
    setActiveContentScreen(snapshot.activeContentScreen);
    setSidebarVisible(false);
  };

  const handleTopNavChange = (item: string) => {
    setPreviousScreen(captureCurrentScreen());
    setActiveTopNav(item);
    setActiveSideNav(null);
    setActiveContentScreen(item);
    setSidebarVisible(false);
  };

  const confirmLogout = async () => {
    try {
      await apiFetch(`${API_BASE_URL}/auth/session-logout`, {
        method: "POST",
      });
    } catch {}

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

    // Save where the user currently is before jumping to Settings/Analytics.
    setPreviousScreen(captureCurrentScreen());

    setActiveTopNav("Dashboard");
    setActiveSideNav(item);
    setActiveContentScreen(item);
    setSidebarVisible(false);
  };

  // Pass this as onClose to Settings/Analytics — it returns the user to
  // whatever screen they were on right before opening it.
  const handleGoToLastPage = () => {
    restoreScreen(previousScreen);
  };

  const handleNavigateToManageClass = () => {
    setPreviousScreen(captureCurrentScreen());
    setActiveTopNav("Class");
    setActiveSideNav(null);
    setActiveContentScreen("Class");
    setSidebarVisible(false);
  };

  const handleNavigateToManageAdmin = () => {
    setPreviousScreen(captureCurrentScreen());
    setActiveTopNav("Admin");
    setActiveSideNav(null);
    setActiveContentScreen("Admin");
    setSidebarVisible(false);
  };

  const handleNavigateToManageStudent = () => {
    setPreviousScreen(captureCurrentScreen());
    setActiveTopNav("Student");
    setActiveSideNav(null);
    setActiveContentScreen("Student");
    setSidebarVisible(false);
  };

  const handleNavigateToManageTeacher = () => {
    setPreviousScreen(captureCurrentScreen());
    setActiveTopNav("Teacher");
    setActiveSideNav(null);
    setActiveContentScreen("Teacher");
    setSidebarVisible(false);
  };

  const handleNavigateToDashboard = () => {
    setPreviousScreen(captureCurrentScreen());
    setActiveTopNav("Dashboard");
    setActiveSideNav(null);
    setActiveContentScreen("Dashboard");
    setSidebarVisible(false);
  };

  const renderContent = () => {
    if (activeSideNav === "Analytics") {
      return (
        <Analytics
          width={width}
          apiBaseUrl={API_BASE_URL}
        />
      );
    }

    if (activeSideNav === "Settings") {
      return <Settings width={width} onClose={handleGoToLastPage} />;
    }

    if (activeTopNav === "Class" || activeContentScreen === "Class") {
      return <ManageClass width={width} currentAdmin={currentAdmin} />;
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
    <SafeAreaView
        style={styles.safeArea}
        edges={safeAreaEdges}
          >
      <Header
        activeItem={activeTopNav}
        onChange={handleTopNavChange}
        isMobile={isMobile}
        isTablet={isTablet}
        onMenuPress={() => setSidebarVisible((prev) => !prev)}
        isSidebarOpen={sidebarVisible || activeSideNav !== null}
        adminId={currentAdmin.adminId}
      />

      <View style={styles.body}>
        {!isMobile && (
          <Sidebar
            activeItem={activeSideNav}
            onChange={handleSideNavChange}
            isMobile={false}
            visible={true}
            onClose={() => {}}
            adminName={adminName}
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
          adminName={adminName}
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