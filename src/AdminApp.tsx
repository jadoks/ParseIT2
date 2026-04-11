import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import AdminDashboard from "./Final_Admin_Components/AdminDashboard";
import Header from "./Final_Admin_Components/Header";
import ManageClass from "./Final_Admin_Components/ManageClass";
import Sidebar from "./Final_Admin_Components/Sidebar";

export default function AdminApp() {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const [activeTopNav, setActiveTopNav] = useState("Dashboard");
  const [activeSideNav, setActiveSideNav] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeContentScreen, setActiveContentScreen] = useState("Dashboard");

  const handleTopNavChange = (item: string) => {
    setActiveTopNav(item);
    setActiveSideNav(null);
    setActiveContentScreen(item);
    setSidebarVisible(false);
  };

  const handleSideNavChange = (item: string) => {
    if (item === "Logout") {
      setSidebarVisible(false);
      Alert.alert("Logout", "You pressed logout.");
      return;
    }

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

  const handleNavigateToDashboard = () => {
    setActiveTopNav("Dashboard");
    setActiveSideNav(null);
    setActiveContentScreen("Dashboard");
    setSidebarVisible(false);
  };

  const renderContent = () => {
    if (activeTopNav === "Class" || activeContentScreen === "Class") {
      return <ManageClass width={width} />;
    }

    if (activeSideNav === "Analytics") {
      return (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Analytics</Text>
          <Text style={styles.placeholderSubtitle}>
            Analytics screen is active.
          </Text>
        </View>
      );
    }

    if (activeSideNav === "Settings") {
      return (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Settings</Text>
          <Text style={styles.placeholderSubtitle}>
            Settings screen is active.
          </Text>
        </View>
      );
    }

    if (activeTopNav === "Dashboard" || activeContentScreen === "Dashboard") {
      return (
        <AdminDashboard
          width={width}
          onOpenManageClass={handleNavigateToManageClass}
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
});