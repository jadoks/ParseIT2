import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  Alert,
  DimensionValue,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AddAdminModal from "./AddAdminModal";
import AddClassModal from "./AddClassModal";
import AddStudentModal from "./AddStudentModal";
import AddTeacherModal from "./AddTeacherModal";
import Chatbot from "./Chatbot";
import ModifyChatbotModal from "./ModifyChatbotModal";

import type { AdminFormPayload } from "./adminTypes";
import type { StudentFormPayload } from "./studentTypes";
import type { TeacherFormPayload } from "./teacherTypes";

type QuickAction = {
  label: string;
  primary?: boolean;
  onPress?: () => void;
};

type DashboardCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  actions: QuickAction[];
  cardWidth: DimensionValue;
};

type AdminDashboardProps = {
  width: number;
  onOpenManageClass: () => void;
  onOpenManageAdmin: () => void;
  onOpenManageStudent: () => void;
  onOpenManageTeacher: () => void;
  onBackToDashboard?: () => void;
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

function DashboardCard({
  title,
  subtitle,
  icon,
  actions,
  cardWidth,
}: DashboardCardProps) {
  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>{icon}</View>

        <TouchableOpacity style={styles.moreButton} activeOpacity={0.85}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#B8A6A6" />
        </TouchableOpacity>
      </View>

      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>

      <View style={styles.actionRow}>
        {actions.map((action, index) => {
          const isSingle = actions.length === 1;
          const isLast = index === actions.length - 1;

          return (
            <TouchableOpacity
              key={`${action.label}-${index}`}
              style={[
                styles.actionButton,
                action.primary && styles.actionButtonPrimary,
                isSingle && styles.singleButton,
                !isSingle && !isLast && styles.actionButtonSpacing,
              ]}
              activeOpacity={0.85}
              onPress={action.onPress}
            >
              <Text
                style={[
                  styles.actionText,
                  action.primary && styles.actionTextPrimary,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  trend,
  widthValue,
}: {
  label: string;
  value: string;
  trend: string;
  widthValue: DimensionValue;
}) {
  return (
    <View style={[styles.summaryCard, { width: widthValue }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTrend}>{trend}</Text>
    </View>
  );
}

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

export default function AdminDashboard({
  width,
  onOpenManageClass,
  onOpenManageAdmin,
  onOpenManageStudent,
  onOpenManageTeacher,
}: AdminDashboardProps) {
  const [teacherCount, setTeacherCount] = useState(0);
  const [isAddAdminModalVisible, setIsAddAdminModalVisible] = useState(false);
  const [isAddStudentModalVisible, setIsAddStudentModalVisible] =
    useState(false);
  const [isAddTeacherModalVisible, setIsAddTeacherModalVisible] =
    useState(false);
  const [isAddClassModalVisible, setIsAddClassModalVisible] = useState(false);
  const [isChatbotModalVisible, setIsChatbotModalVisible] = useState(false);
  const [isModifyChatbotModalVisible, setIsModifyChatbotModalVisible] =
    useState(false);
  const [classCount, setClassCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const summaryWidth: DimensionValue = isMobile
    ? "100%"
    : isTablet
    ? "48.5%"
    : "23.5%";

  const cardWidth: DimensionValue = isMobile
    ? "100%"
    : isTablet
    ? "48.5%"
    : "31.8%";

  const loadDashboardCounts = async () => {
    try {
      const [studentsRes, teachersRes, adminsRes, classesRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/students`),
          fetch(`${API_BASE_URL}/teachers`),
          fetch(`${API_BASE_URL}/admins`),
          fetch(`${API_BASE_URL}/classes`),
        ]);

      const [studentsData, teachersData, adminsData, classesData] =
        await Promise.all([
          studentsRes.json(),
          teachersRes.json(),
          adminsRes.json(),
          classesRes.json(),
        ]);

      if (studentsRes.ok) {
        setStudentCount(Array.isArray(studentsData) ? studentsData.length : 0);
      }

      if (teachersRes.ok) {
        setTeacherCount(Array.isArray(teachersData) ? teachersData.length : 0);
      }

      if (adminsRes.ok) {
        setAdminCount(Array.isArray(adminsData) ? adminsData.length : 0);
      }

      if (classesRes.ok) {
        setClassCount(Array.isArray(classesData) ? classesData.length : 0);
      }
    } catch (error) {
      console.error("Error loading dashboard counts:", error);
    }
  };

  useEffect(() => {
    loadDashboardCounts();
  }, []);

  const handleAddSharedTeacher = async (payload: TeacherFormPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/create-teacher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create teacher");
      }

      await loadDashboardCounts();
      setIsAddTeacherModalVisible(false);
      console.log("Teacher saved to Firebase:", data);
    } catch (error) {
      console.error("Error saving teacher:", error);
    }
  };

  const handleAddSharedClass = async (payload: {
    classCode: string;
    className: string;
    courseCode: string;
    semester: string;
    section: string;
    instructor: string;
    instructorEmail: string | null;
    instructorIdentifier: string | null;
    classMembers: number;
    schoolYear: string | null;
    description: string | null;
    bannerLocalUri: string | null;
    bannerFileName: string | null;
    bannerMimeType: string | null;
  }) => {
    try {
      let bannerBase64 = null;

      if (payload.bannerLocalUri) {
        bannerBase64 = await fileUriToBase64(payload.bannerLocalUri);
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
          instructorEmail: payload.instructorEmail,
          instructorIdentifier: payload.instructorIdentifier,

          createdByUid: "admin_uid_001",
          createdByRole: "admin",
          createdByName: "Jadoks",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create class");
      }

      await loadDashboardCounts();
      setIsAddClassModalVisible(false);

      Alert.alert(
        "Success",
        `Class created successfully.\nClass Code: ${
          data?.data?.classCode || payload.classCode
        }`
      );

      console.log("Class saved to Firebase:", data);
    } catch (error) {
      console.error("Error saving class:", error);
      Alert.alert("Error", "Failed to create class.");
    }
  };

  const handleAddSharedAdmin = async (payload: AdminFormPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/create-admin`, {
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

      await loadDashboardCounts();
      setIsAddAdminModalVisible(false);
      console.log("Admin saved to Firebase:", data);
    } catch (error) {
      console.error("Error saving admin:", error);
    }
  };

  const handleAddSharedStudent = async (payload: StudentFormPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/create-student`, {
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

      await loadDashboardCounts();
      setIsAddStudentModalVisible(false);
      console.log("Student saved to Firebase:", data);
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  return (
    <View>
      <View style={styles.heroRow}>
        <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
          <View
            style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
          >
            <Text style={styles.heroEyebrow}>OVERVIEW</Text>
            <Text
              style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}
            >
              Welcome back, Admin
            </Text>
            <Text style={styles.heroSubtitle}>
              Monitor academic operations, manage users, and configure system
              tools from your central dashboard.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard
          label="Students"
          value={`${studentCount}`}
          trend="Current enrolled total"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Teachers"
          value={`${teacherCount}`}
          trend="Active faculty records"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Admins"
          value={`${adminCount}`}
          trend="System administrator count"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Classes"
          value={`${classCount}`}
          trend="Published class records"
          widthValue={summaryWidth}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Administrative Modules</Text>
          <Text style={styles.sectionSubtitle}>
            Manage core academic and system operations
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <DashboardCard
          title="Manage Class"
          subtitle={`${classCount} classes available`}
          icon={<Ionicons name="school-outline" size={24} color="#DC2626" />}
          actions={[
            {
              label: "+ Add",
              primary: true,
              onPress: () => setIsAddClassModalVisible(true),
            },
            {
              label: "View",
              onPress: onOpenManageClass,
            },
          ]}
          cardWidth={cardWidth}
        />

        <DashboardCard
          title="Manage Student"
          subtitle={`${studentCount} undergraduate students`}
          icon={<Ionicons name="people-outline" size={24} color="#DC2626" />}
          actions={[
            {
              label: "+ Add",
              primary: true,
              onPress: () => setIsAddStudentModalVisible(true),
            },
            {
              label: "View",
              onPress: onOpenManageStudent,
            },
          ]}
          cardWidth={cardWidth}
        />

        <DashboardCard
          title="Manage Teacher"
          subtitle={`${teacherCount} registered faculty members`}
          icon={
            <FontAwesome5
              name="chalkboard-teacher"
              size={22}
              color="#DC2626"
            />
          }
          actions={[
            {
              label: "+ Add",
              primary: true,
              onPress: () => setIsAddTeacherModalVisible(true),
            },
            {
              label: "View",
              onPress: onOpenManageTeacher,
            },
          ]}
          cardWidth={cardWidth}
        />

        <DashboardCard
          title="Manage Admin"
          subtitle={`${adminCount} active administrators`}
          icon={
            <MaterialCommunityIcons
              name="account-cog-outline"
              size={24}
              color="#DC2626"
            />
          }
          actions={[
            {
              label: "+ Add",
              primary: true,
              onPress: () => setIsAddAdminModalVisible(true),
            },
            {
              label: "View",
              onPress: onOpenManageAdmin,
            },
          ]}
          cardWidth={cardWidth}
        />

        <DashboardCard
          title="Manage Chatbot"
          subtitle="AI tutor training and configuration"
          icon={
            <MaterialCommunityIcons
              name="robot-outline"
              size={24}
              color="#DC2626"
            />
          }
          actions={[
            {
              label: "Train",
              primary: true,
              onPress: () => setIsChatbotModalVisible(true),
            },
            {
              label: "Modify",
              onPress: () => setIsModifyChatbotModalVisible(true),
            },
          ]}
          cardWidth={cardWidth}
        />
      </View>

      <AddAdminModal
        visible={isAddAdminModalVisible}
        onClose={() => setIsAddAdminModalVisible(false)}
        isMobile={isMobile}
        onSubmitAdmin={handleAddSharedAdmin}
      />

      <AddStudentModal
        visible={isAddStudentModalVisible}
        onClose={() => setIsAddStudentModalVisible(false)}
        isMobile={isMobile}
        onSubmitStudent={handleAddSharedStudent}
      />

      <AddTeacherModal
        visible={isAddTeacherModalVisible}
        onClose={() => setIsAddTeacherModalVisible(false)}
        isMobile={isMobile}
        onSubmitTeacher={handleAddSharedTeacher}
      />

      <AddClassModal
        visible={isAddClassModalVisible}
        onClose={() => setIsAddClassModalVisible(false)}
        isMobile={isMobile}
        onCreateClass={handleAddSharedClass}
      />

      <Chatbot
        visible={isChatbotModalVisible}
        onClose={() => setIsChatbotModalVisible(false)}
        isMobile={isMobile}
      />

      <ModifyChatbotModal
        visible={isModifyChatbotModalVisible}
        onClose={() => setIsModifyChatbotModalVisible(false)}
        isMobile={isMobile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    marginBottom: 20,
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
    marginBottom: 16,
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

  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  summaryCard: {
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 18,
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#A07C7C",
    fontWeight: "600",
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  summaryTrend: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },

  sectionHeader: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },

  card: {
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 20,
    marginBottom: 18,
    marginRight: 16,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  cardSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
    lineHeight: 20,
    marginBottom: 20,
    minHeight: 40,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
  },

  actionButtonSpacing: {
    marginRight: 10,
  },

  singleButton: {},

  actionButtonPrimary: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },

  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A4A4A",
  },

  actionTextPrimary: {
    color: "#FFFFFF",
  },
});