import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  DimensionValue,
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

import AddAdminModal from "./AddAdminModal";
import AddClassModal from "./AddClassModal";
import AddStudentModal from "./AddStudentModal";
import AddTeacherModal from "./AddTeacherModal";
import Chatbot from "./Chatbot";

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

type AcademicYearOption = {
  id: string;
  label: string;
};

type DropdownAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
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

function AcademicYearCard({
  cardWidth,
  isMobile,
  currentSemester,
  semesterOptions,
  onSelectSemester,
  onCreate,
  isStarted,
  onToggleStartEnd,
}: {
  cardWidth: DimensionValue;
  isMobile: boolean;
  currentSemester: string;
  semesterOptions: AcademicYearOption[];
  onSelectSemester: (value: string) => void;
  onCreate: () => void;
  isStarted: boolean;
  onToggleStartEnd: () => void;
}) {
  const [isDropdownModalVisible, setIsDropdownModalVisible] = useState(false);
  const [dropdownAnchor, setDropdownAnchor] = useState<DropdownAnchor | null>(
    null
  );

  const dropdownRef = useRef<View | null>(null);

  const openDropdown = () => {
    if (isMobile) {
      setIsDropdownModalVisible(true);
      return;
    }

    dropdownRef.current?.measureInWindow((x, y, measuredWidth, height) => {
      setDropdownAnchor({
        x,
        y,
        width: measuredWidth,
        height,
      });
      setIsDropdownModalVisible(true);
    });
  };

  return (
    <>
      <View style={[styles.card, { width: cardWidth }]}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar-outline" size={24} color="#DC2626" />
          </View>

          <TouchableOpacity style={styles.moreButton} activeOpacity={0.85}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#B8A6A6" />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle}>Set Up Academic Year</Text>

        <View ref={dropdownRef} collapsable={false}>
          <TouchableOpacity
            style={styles.selectField}
            activeOpacity={0.85}
            onPress={openDropdown}
          >
            <Text style={styles.selectFieldText}>{currentSemester}</Text>
            <Ionicons
              name={isMobile ? "chevron-forward" : "chevron-down"}
              size={18}
              color="#8A6F6F"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.actionRowAcademic}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.actionButtonPrimary,
              styles.actionButtonAcademic,
              styles.actionButtonAcademicGap,
            ]}
            activeOpacity={0.85}
            onPress={onCreate}
          >
            <Text style={[styles.actionText, styles.actionTextPrimary]}>
              Create
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonAcademic]}
            activeOpacity={0.85}
            onPress={onToggleStartEnd}
          >
            <Text style={styles.actionText}>{isStarted ? "End" : "Start"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isDropdownModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setIsDropdownModalVisible(false);
          setDropdownAnchor(null);
        }}
      >
        <View style={styles.dropdownModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setIsDropdownModalVisible(false);
              setDropdownAnchor(null);
            }}
          />

          {isMobile ? (
            <View style={styles.optionModalCard}>
              <View style={styles.optionModalHeader}>
                <Text style={styles.optionModalTitle}>Select Semester</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsDropdownModalVisible(false);
                    setDropdownAnchor(null);
                  }}
                  activeOpacity={0.85}
                  style={styles.optionModalCloseButton}
                >
                  <Ionicons name="close" size={20} color="#7A4A4A" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {semesterOptions.map((option, index) => {
                  const isActive = option.label === currentSemester;
                  const isLast = index === semesterOptions.length - 1;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionModalItem,
                        isActive && styles.dropdownItemActive,
                        !isLast && styles.dropdownItemBorder,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        onSelectSemester(option.label);
                        setIsDropdownModalVisible(false);
                        setDropdownAnchor(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isActive && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>

                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#DC2626"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View
              style={[
                styles.dropdownFloatingCard,
                dropdownAnchor && {
                  top: dropdownAnchor.y + dropdownAnchor.height + 8,
                  left: dropdownAnchor.x,
                  width: dropdownAnchor.width,
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.dropdownFloatingScroll}
              >
                {semesterOptions.map((option, index) => {
                  const isActive = option.label === currentSemester;
                  const isLast = index === semesterOptions.length - 1;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownItem,
                        isActive && styles.dropdownItemActive,
                        !isLast && styles.dropdownItemBorder,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        onSelectSemester(option.label);
                        setIsDropdownModalVisible(false);
                        setDropdownAnchor(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isActive && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>

                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#DC2626"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </>
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

function SetAcademicYearModal({
  visible,
  onClose,
  isMobile,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onSave: (payload: {
    semester: "1st" | "2nd" | null;
    startYear: string;
    endYear: string;
  }) => void;
}) {
  const [selectedSemester, setSelectedSemester] = useState<"1st" | "2nd" | null>(
    "1st"
  );
  const [startYear, setStartYear] = useState("2026");
  const [endYear, setEndYear] = useState("2027");

  const handleClose = () => onClose();

  const handleSubmit = () => {
    onSave({
      semester: selectedSemester,
      startYear,
      endYear,
    });
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconBox}>
                <Ionicons name="calendar-outline" size={22} color="#DC2626" />
              </View>

              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>Create Semester</Text>
                <Text style={styles.modalSubtitle}>
                  Create a semester entry for the academic year. This is
                  temporary only and will reset after refresh.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#7A4A4A" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeaderRow}>
                <Ionicons name="book-outline" size={18} color="#DC2626" />
                <Text style={styles.modalSectionTitle}>Semester Selection</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.sectionRow,
                  selectedSemester === "1st" && styles.sectionRowActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedSemester("1st")}
              >
                <View
                  style={[
                    styles.checkboxBase,
                    selectedSemester === "1st" && styles.checkboxChecked,
                  ]}
                >
                  {selectedSemester === "1st" && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkText}>1st Semester</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sectionRow,
                  selectedSemester === "2nd" && styles.sectionRowActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedSemester("2nd")}
              >
                <View
                  style={[
                    styles.checkboxBase,
                    selectedSemester === "2nd" && styles.checkboxChecked,
                  ]}
                >
                  {selectedSemester === "2nd" && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkText}>2nd Semester</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeaderRow}>
                <Ionicons name="school-outline" size={18} color="#DC2626" />
                <Text style={styles.modalSectionTitle}>School Year</Text>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Start Year</Text>
                  <View style={styles.inputField}>
                    <Ionicons
                      name="calendar-clear-outline"
                      size={18}
                      color="#8A6F6F"
                    />
                    <TextInput
                      value={startYear}
                      onChangeText={setStartYear}
                      placeholder="Enter start year"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>End Year</Text>
                  <View style={styles.inputField}>
                    <Ionicons
                      name="calendar-number-outline"
                      size={18}
                      color="#8A6F6F"
                    />
                    <TextInput
                      value={endYear}
                      onChangeText={setEndYear}
                      placeholder="Enter end year"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              activeOpacity={0.85}
              onPress={handleSubmit}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.modalPrimaryButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  const [isAcademicYearModalVisible, setIsAcademicYearModalVisible] =
    useState(false);
  const [isAcademicYearStarted, setIsAcademicYearStarted] = useState(false);
  const [isChatbotModalVisible, setIsChatbotModalVisible] = useState(false);
  const [classCount, setClassCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  const [academicYearOptions, setAcademicYearOptions] = useState<
    AcademicYearOption[]
  >([
    {
      id: "default-1",
      label: "1st Semester - S.Y. 2026 - 2027",
    },
    {
      id: "default-2",
      label: "2nd Semester - S.Y. 2026 - 2027",
    },
  ]);

  const [selectedAcademicSemester, setSelectedAcademicSemester] = useState(
    "1st Semester - S.Y. 2026 - 2027"
  );

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

  const handleCreateAcademicYear = (payload: {
    semester: "1st" | "2nd" | null;
    startYear: string;
    endYear: string;
  }) => {
    if (!payload.semester || !payload.startYear || !payload.endYear) return;

    const newLabel = `${payload.semester} Semester - S.Y. ${payload.startYear} - ${payload.endYear}`;

    const existing = academicYearOptions.find(
      (item) => item.label.toLowerCase() === newLabel.toLowerCase()
    );

    if (!existing) {
      const newOption: AcademicYearOption = {
        id: `${payload.semester}-${payload.startYear}-${payload.endYear}-${Date.now()}`,
        label: newLabel,
      };

      setAcademicYearOptions((prev) => [newOption, ...prev]);
    }

    setSelectedAcademicSemester(newLabel);
    console.log("Academic Year Setup:", payload);
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
        <AcademicYearCard
          cardWidth={cardWidth}
          isMobile={isMobile}
          currentSemester={selectedAcademicSemester}
          semesterOptions={academicYearOptions}
          onSelectSemester={setSelectedAcademicSemester}
          onCreate={() => setIsAcademicYearModalVisible(true)}
          isStarted={isAcademicYearStarted}
          onToggleStartEnd={() =>
            setIsAcademicYearStarted((prevValue) => !prevValue)
          }
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
            { label: "Modify" },
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
      </View>

      <SetAcademicYearModal
        visible={isAcademicYearModalVisible}
        onClose={() => setIsAcademicYearModalVisible(false)}
        isMobile={isMobile}
        onSave={handleCreateAcademicYear}
      />

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
    justifyContent: "space-between",
  },

  card: {
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 20,
    marginBottom: 18,
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

  actionRowAcademic: {
    flexDirection: "row",
    marginTop: 16,
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

  actionButtonAcademic: {
    flex: 1,
  },

  actionButtonAcademicGap: {
    marginRight: 12,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 920,
    maxHeight: "92%",
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
    paddingBottom: 12,
  },

  modalSection: {
    marginBottom: 22,
  },

  modalSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  modalSectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#2B1111",
  },

  modalRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 22,
    zIndex: 20,
  },

  modalRowStack: {
    flexDirection: "column",
    gap: 14,
  },

  modalCol: {
    flex: 1,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5F3B3B",
    marginBottom: 10,
  },

  inputField: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
  },

  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#F8E3E3",
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  modalSecondaryButton: {
    height: 48,
    paddingHorizontal: 18,
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

  modalPrimaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.12)",
    justifyContent: "flex-end",
  },

  dropdownFloatingCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1CACA",
    overflow: "hidden",
    shadowColor: "#2B1111",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
    zIndex: 5000,
  },

  dropdownFloatingScroll: {
    maxHeight: 260,
  },

  optionModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 20,
    maxHeight: "65%",
    borderTopWidth: 1,
    borderColor: "#F3D4D4",
  },

  optionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  optionModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B1111",
  },

  optionModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  optionModalItem: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },

  selectField: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectFieldText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2B1111",
    flex: 1,
    marginRight: 10,
  },

  dropdownItem: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#FAE9E9",
  },

  dropdownItemActive: {
    backgroundColor: "#FFF7F7",
  },

  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: "#5F3B3B",
    fontWeight: "600",
    paddingRight: 10,
  },

  dropdownItemTextActive: {
    color: "#DC2626",
    fontWeight: "700",
  },

  sectionRow: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },

  sectionRowActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF7F7",
  },

  checkboxBase: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#D8B4B4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  checkboxChecked: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },

  checkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2B1111",
    flex: 1,
  },
});