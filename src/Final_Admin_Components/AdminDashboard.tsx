import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useMemo, useRef, useState } from "react";
import {
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
import Chatbot from "./Chatbot";
import { addAdminRecord, getAdminCount } from "./adminStore";
import { addClassRecord, getClassCount } from "./classStore";
import { addStudentRecord, getStudentCount } from "./studentStore";
import { addTeacherRecord, getTeacherCount } from "./teacherStore";



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

type YearOption = {
  id: string;
  label: string;
};

type SectionOption = {
  id: string;
  label: string;
};

type SemesterOption = {
  id: string;
  label: string;
};

type CourseOption = {
  id: string;
  label: string;
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

function formatDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

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

function BirthdayField({
  value,
  onChange,
  isMobile,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  isMobile: boolean;
}) {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [showWebModal, setShowWebModal] = useState(false);

  const [tempMonth, setTempMonth] = useState(0);
  const [tempDay, setTempDay] = useState(1);
  const [tempYear, setTempYear] = useState(2000);

  const years = Array.from(
    { length: 100 },
    (_, i) => new Date().getFullYear() - i
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const openPicker = () => {
    const baseDate = value || new Date(2000, 0, 1);
    setTempMonth(baseDate.getMonth());
    setTempDay(baseDate.getDate());
    setTempYear(baseDate.getFullYear());

    if (Platform.OS === "web") {
      setShowWebModal(true);
      return;
    }

    setShowNativePicker(true);
  };

  const handleNativeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowNativePicker(false);
    }

    if (event.type === "dismissed") return;

    if (selectedDate) {
      onChange(selectedDate);
      setTempMonth(selectedDate.getMonth());
      setTempDay(selectedDate.getDate());
      setTempYear(selectedDate.getFullYear());
    }
  };

  const confirmWebBirthday = () => {
    const selected = new Date(tempYear, tempMonth, tempDay);
    onChange(selected);
    setShowWebModal(false);
  };

  return (
    <>
      <Text style={styles.fieldLabel}>Birthday</Text>
      <TouchableOpacity
        style={styles.selectField}
        activeOpacity={0.85}
        onPress={openPicker}
      >
        <Text
          style={[
            styles.selectFieldText,
            !value && styles.placeholderSelectText,
          ]}
        >
          {value ? formatDate(value) : "Select birthday"}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#8A6F6F" />
      </TouchableOpacity>

      {Platform.OS !== "web" && showNativePicker && (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={value || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={handleNativeChange}
          />

          {Platform.OS === "ios" && (
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerButtonSecondary}
                activeOpacity={0.85}
                onPress={() => setShowNativePicker(false)}
              >
                <Text style={styles.datePickerButtonSecondaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <Modal
        visible={showWebModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowWebModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowWebModal(false)}
          />

          <View style={styles.webDateModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="calendar-outline" size={22} color="#DC2626" />
                </View>

                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>Select Birthday</Text>
                  <Text style={styles.modalSubtitle}>
                    Choose month, day, and year.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowWebModal(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <View style={styles.webDateContent}>
              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Month</Text>
                  <ScrollView
                    style={styles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {months.map((month, index) => {
                      const active = tempMonth === index;

                      return (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            styles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            setTempMonth(index);
                            const maxDay = new Date(
                              tempYear,
                              index + 1,
                              0
                            ).getDate();
                            if (tempDay > maxDay) setTempDay(maxDay);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                            ]}
                          >
                            {month}
                          </Text>

                          {active && (
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

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Day</Text>
                  <ScrollView
                    style={styles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {days.map((day) => {
                      const active = tempDay === day;

                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            styles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setTempDay(day)}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                            ]}
                          >
                            {day}
                          </Text>

                          {active && (
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

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Year</Text>
                  <ScrollView
                    style={styles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {years.map((year) => {
                      const active = tempYear === year;

                      return (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            styles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            setTempYear(year);
                            const maxDay = new Date(
                              year,
                              tempMonth + 1,
                              0
                            ).getDate();
                            if (tempDay > maxDay) setTempDay(maxDay);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                            ]}
                          >
                            {year}
                          </Text>

                          {active && (
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
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowWebModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                activeOpacity={0.85}
                onPress={confirmWebBirthday}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.modalPrimaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function AddAdminModal({
  visible,
  onClose,
  isMobile,
  onSubmitAdmin,
}: {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onSubmitAdmin?: (payload: {
    adminId: string;
    firstName: string;
    lastName: string;
    birthday: string;
    email: string;
  }) => void;
}) {
  const [adminId, setAdminId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [email, setEmail] = useState("");

  const resetForm = () => {
    setAdminId("");
    setFirstName("");
    setLastName("");
    setBirthday(null);
    setEmail("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const payload = {
      adminId,
      firstName,
      lastName,
      birthday: birthday ? formatDate(birthday) : "",
      email,
    };

    if (onSubmitAdmin) {
      onSubmitAdmin(payload);
    } else {
      console.log("Admin ID:", payload.adminId);
      console.log("First Name:", payload.firstName);
      console.log("Last Name:", payload.lastName);
      console.log("Birthday:", payload.birthday);
      console.log("Email Address:", payload.email);
    }

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
                <MaterialCommunityIcons
                  name="account-cog-outline"
                  size={22}
                  color="#DC2626"
                />
              </View>

              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>Add Admin</Text>
                <Text style={styles.modalSubtitle}>
                  Add a new administrator by filling in the required details
                  below.
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
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color="#DC2626"
                />
                <Text style={styles.modalSectionTitle}>
                  Administrator Details
                </Text>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Admin ID</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="card-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={adminId}
                      onChangeText={setAdminId}
                      placeholder="Enter admin ID"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="person-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Enter first name"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="people-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter last name"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter email address"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <BirthdayField
                    value={birthday}
                    onChange={setBirthday}
                    isMobile={isMobile}
                  />
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
              <Text style={styles.modalPrimaryButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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

export function AddStudentModal({
  visible,
  onClose,
  isMobile,
  onSubmitStudent,
}: {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onSubmitStudent?: (payload: {
    studentId: string;
    firstName: string;
    lastName: string;
    birthday: string;
    email: string;
    studentType: "regular" | "irregular" | "";
  }) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [email, setEmail] = useState("");
  const [studentType, setStudentType] = useState<"regular" | "irregular" | "">(
    ""
  );

  const resetForm = () => {
    setStudentId("");
    setFirstName("");
    setLastName("");
    setBirthday(null);
    setEmail("");
    setStudentType("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const payload = {
      studentId,
      firstName,
      lastName,
      birthday: birthday ? formatDate(birthday) : "",
      email,
      studentType,
    };

    if (onSubmitStudent) {
      onSubmitStudent(payload);
    } else {
      console.log("Student ID:", payload.studentId);
      console.log("First Name:", payload.firstName);
      console.log("Last Name:", payload.lastName);
      console.log("Birthday:", payload.birthday);
      console.log("Email Address:", payload.email);
      console.log("Student Type:", payload.studentType);
    }

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
                <Ionicons name="people-outline" size={22} color="#DC2626" />
              </View>

              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>Add Student</Text>
                <Text style={styles.modalSubtitle}>
                  Add a new student by filling in the required profile details
                  below.
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
                <Ionicons name="school-outline" size={18} color="#DC2626" />
                <Text style={styles.modalSectionTitle}>Student Details</Text>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Student ID</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="card-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={studentId}
                      onChangeText={setStudentId}
                      placeholder="Enter student ID"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="person-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Enter first name"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="people-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter last name"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter email address"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <BirthdayField
                    value={birthday}
                    onChange={setBirthday}
                    isMobile={isMobile}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeaderRow}>
                <Ionicons
                  name="git-compare-outline"
                  size={18}
                  color="#DC2626"
                />
                <Text style={styles.modalSectionTitle}>Student Status</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.sectionRow,
                  studentType === "regular" && styles.sectionRowActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setStudentType("regular")}
              >
                <View
                  style={[
                    styles.checkboxBase,
                    studentType === "regular" && styles.checkboxChecked,
                  ]}
                >
                  {studentType === "regular" && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkText}>Regular</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sectionRow,
                  studentType === "irregular" && styles.sectionRowActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setStudentType("irregular")}
              >
                <View
                  style={[
                    styles.checkboxBase,
                    studentType === "irregular" && styles.checkboxChecked,
                  ]}
                >
                  {studentType === "irregular" && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkText}>Irregular</Text>
              </TouchableOpacity>
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
              <Text style={styles.modalPrimaryButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AddTeacherModal({
  visible,
  onClose,
  isMobile,
  onSubmitTeacher,
}: {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onSubmitTeacher?: (payload: {
    teacherId: string;
    firstName: string;
    lastName: string;
    birthday: string;
    email: string;
  }) => void;
}) {
  const [teacherId, setTeacherId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [email, setEmail] = useState("");

  const resetForm = () => {
    setTeacherId("");
    setFirstName("");
    setLastName("");
    setBirthday(null);
    setEmail("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const payload = {
      teacherId,
      firstName,
      lastName,
      birthday: birthday ? formatDate(birthday) : "",
      email,
    };

    if (onSubmitTeacher) {
      onSubmitTeacher(payload);
    } else {
      console.log("Teacher ID:", payload.teacherId);
      console.log("First Name:", payload.firstName);
      console.log("Last Name:", payload.lastName);
      console.log("Birthday:", payload.birthday);
      console.log("Email Address:", payload.email);
    }

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
                <FontAwesome5
                  name="chalkboard-teacher"
                  size={20}
                  color="#DC2626"
                />
              </View>

              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>Add Teacher</Text>
                <Text style={styles.modalSubtitle}>
                  Add a new teacher by filling in the required details below.
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
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color="#DC2626"
                />
                <Text style={styles.modalSectionTitle}>Teacher Details</Text>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Teacher ID</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="card-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={teacherId}
                      onChangeText={setTeacherId}
                      placeholder="Enter teacher ID"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="person-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Enter first name"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="people-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter last name"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter email address"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <BirthdayField
                    value={birthday}
                    onChange={setBirthday}
                    isMobile={isMobile}
                  />
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
              <Text style={styles.modalPrimaryButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddClassModal({
  visible,
  onClose,
  isMobile,
  onCreateClass,
}: {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onCreateClass: (payload: {
    classCode: string;
    className: string;
    semester: string;
    section: string;
    instructor: string;
    classMembers: number;
  }) => void;
}) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState("sem-1");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [isSemesterModalVisible, setIsSemesterModalVisible] = useState(false);
  const [instructor, setInstructor] = useState("");

  const YEAR_OPTIONS: YearOption[] = [
    { id: "1st", label: "1st Year" },
    { id: "2nd", label: "2nd Year" },
    { id: "3rd", label: "3rd Year" },
    { id: "4th", label: "4th Year" },
  ];

  const SECTION_OPTIONS: Record<string, SectionOption[]> = {
    "1st": [
      { id: "1A", label: "1A Microsoft" },
      { id: "1B", label: "1B Google" },
    ],
    "2nd": [
      { id: "2A", label: "2A Algorithm" },
      { id: "2B", label: "2B Pseudocode" },
    ],
    "3rd": [
      { id: "3A", label: "3A Python" },
      { id: "3B", label: "3B Java" },
    ],
    "4th": [
      { id: "4A", label: "4A Xamarin" },
      { id: "4B", label: "4B Laravel" },
    ],
  };

  const COURSE_OPTIONS: Record<string, CourseOption[]> = {
    "1st": [
      { id: "IT101", label: "IT101 - Introduction to Computing" },
      { id: "IT102", label: "IT102 - Computer Programming 1" },
    ],
    "2nd": [
      { id: "IT201", label: "IT201 - Data Structures and Algorithms" },
      { id: "IT202", label: "IT202 - Object-Oriented Programming" },
    ],
    "3rd": [
      { id: "IT301", label: "IT301 - Mobile Application Development" },
      { id: "IT302", label: "IT302 - Web Systems and Technologies" },
    ],
    "4th": [
      { id: "IT401", label: "IT401 - Capstone Project 1" },
      { id: "IT402", label: "IT402 - Systems Integration and Architecture" },
    ],
  };

  const SEMESTER_OPTIONS: SemesterOption[] = [
    { id: "sem-1", label: "1st Semester (2025-2026)" },
    { id: "sem-2", label: "2nd Semester (2025-2026)" },
    { id: "sem-3", label: "Summer (2025-2026)" },
  ];

  const selectedSemesterLabel = useMemo(() => {
    return (
      SEMESTER_OPTIONS.find((item) => item.id === selectedSemester)?.label ||
      "Select semester"
    );
  }, [selectedSemester]);

  const generateRandomClassCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "CLS-";

    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  };

  const openSemesterDropdown = () => {
    setIsSemesterModalVisible(true);
  };

  const closeSemesterDropdown = () => {
    setIsSemesterModalVisible(false);
  };

  const toggleYear = (yearId: string) => {
    if (selectedYear === yearId) {
      setSelectedYear(null);
      setSelectedSection(null);
      setSelectedCourse(null);
      return;
    }

    setSelectedYear(yearId);
    setSelectedSection(null);
    setSelectedCourse(null);
  };

  const toggleSection = (sectionId: string) => {
    if (selectedSection === sectionId) {
      setSelectedSection(null);
      return;
    }

    setSelectedSection(sectionId);
  };

  const toggleCourse = (courseId: string) => {
    if (selectedCourse === courseId) {
      setSelectedCourse(null);
      return;
    }

    setSelectedCourse(courseId);
  };

  const handleClose = () => {
    closeSemesterDropdown();
    onClose();
  };

  const handleCreateClass = () => {
    const selectedSectionLabel =
      selectedYear && selectedSection
        ? SECTION_OPTIONS[selectedYear].find(
            (section) => section.id === selectedSection
          )?.label || "Not set"
        : "Not set";

    const selectedCourseLabel =
      selectedYear && selectedCourse
        ? COURSE_OPTIONS[selectedYear].find(
            (course) => course.id === selectedCourse
          )?.label || "Untitled Course"
        : "Untitled Course";

    const generatedClassCode = generateRandomClassCode();
    const generatedClassName = `${selectedCourseLabel} - ${selectedSemesterLabel}`;

    onCreateClass({
      classCode: generatedClassCode,
      className: generatedClassName,
      semester: selectedSemesterLabel,
      section: selectedSectionLabel,
      instructor: instructor || "Not assigned",
      classMembers: 0,
    });

    setInstructor("");
    setSelectedYear(null);
    setSelectedSection(null);
    setSelectedCourse(null);
    setSelectedSemester("sem-1");

    handleClose();
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="school-outline" size={22} color="#DC2626" />
                </View>

                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>Add Class</Text>
                  <Text style={styles.modalSubtitle}>
                    Create a class by selecting year, section, course,
                    instructor, semester, and class banner image.
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

            <View style={styles.addClassModalBodyWrap}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.modalContent}
              >
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <MaterialCommunityIcons
                      name="google-classroom"
                      size={18}
                      color="#DC2626"
                    />
                    <Text style={styles.modalSectionTitle}>Select Year</Text>
                  </View>

                  {(selectedYear
                    ? YEAR_OPTIONS.filter((year) => year.id === selectedYear)
                    : YEAR_OPTIONS
                  ).map((year) => {
                    const isChecked = selectedYear === year.id;

                    return (
                      <TouchableOpacity
                        key={year.id}
                        style={[
                          styles.checkRow,
                          isChecked && styles.checkRowActive,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => toggleYear(year.id)}
                      >
                        <View
                          style={[
                            styles.checkboxBase,
                            isChecked && styles.checkboxChecked,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#FFFFFF"
                            />
                          )}
                        </View>

                        <Text style={styles.checkText}>{year.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedYear && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeaderRow}>
                      <Ionicons
                        name="layers-outline"
                        size={18}
                        color="#DC2626"
                      />
                      <Text style={styles.modalSectionTitle}>
                        Select Section
                      </Text>
                    </View>

                    {SECTION_OPTIONS[selectedYear].map((section) => {
                      const isChecked = selectedSection === section.id;

                      return (
                        <TouchableOpacity
                          key={section.id}
                          style={[
                            styles.sectionRow,
                            isChecked && styles.sectionRowActive,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => toggleSection(section.id)}
                        >
                          <View
                            style={[
                              styles.checkboxBase,
                              isChecked && styles.checkboxChecked,
                            ]}
                          >
                            {isChecked && (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#FFFFFF"
                              />
                            )}
                          </View>

                          <Text style={styles.checkText}>{section.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {selectedYear && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeaderRow}>
                      <Ionicons name="book-outline" size={18} color="#DC2626" />
                      <Text style={styles.modalSectionTitle}>
                        Select Course Code with Course Name
                      </Text>
                    </View>

                    {COURSE_OPTIONS[selectedYear].map((course) => {
                      const isChecked = selectedCourse === course.id;

                      return (
                        <TouchableOpacity
                          key={course.id}
                          style={[
                            styles.sectionRow,
                            isChecked && styles.sectionRowActive,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => toggleCourse(course.id)}
                        >
                          <View
                            style={[
                              styles.checkboxBase,
                              isChecked && styles.checkboxChecked,
                            ]}
                          >
                            {isChecked && (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#FFFFFF"
                              />
                            )}
                          </View>

                          <Text style={styles.checkText}>{course.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View
                  style={[styles.modalRow, isMobile && styles.modalRowStack]}
                >
                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>Instructor Name or ID</Text>
                    <View style={styles.inputField}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#8A6F6F"
                      />
                      <TextInput
                        value={instructor}
                        onChangeText={setInstructor}
                        placeholder="Enter instructor name or ID"
                        placeholderTextColor="#B79A9A"
                        style={styles.textInput}
                      />
                    </View>
                  </View>

                  <View
                    style={[
                      styles.modalCol,
                      !isMobile && styles.addClassSemesterFieldWrap,
                    ]}
                  >
                    <Text style={styles.fieldLabel}>Semester</Text>

                    <TouchableOpacity
                      style={styles.selectField}
                      activeOpacity={0.85}
                      onPress={openSemesterDropdown}
                    >
                      <Text style={styles.selectFieldText}>
                        {selectedSemesterLabel}
                      </Text>
                      <Ionicons
                        name={isMobile ? "chevron-forward" : "chevron-down"}
                        size={18}
                        color="#8A6F6F"
                      />
                    </TouchableOpacity>

                    {!isMobile && isSemesterModalVisible && (
                      <>
                        <Pressable
                          style={styles.addClassSemesterDismissLayer}
                          onPress={closeSemesterDropdown}
                        />
                        <View style={styles.addClassSemesterFloatingFront}>
                          <ScrollView
                            showsVerticalScrollIndicator={true}
                            style={styles.dropdownFloatingScroll}
                          >
                            {SEMESTER_OPTIONS.map((semester, index) => {
                              const isActive = selectedSemester === semester.id;
                              const isLast =
                                index === SEMESTER_OPTIONS.length - 1;

                              return (
                                <TouchableOpacity
                                  key={semester.id}
                                  style={[
                                    styles.dropdownItem,
                                    isActive && styles.dropdownItemActive,
                                    !isLast && styles.dropdownItemBorder,
                                  ]}
                                  activeOpacity={0.85}
                                  onPress={() => {
                                    setSelectedSemester(semester.id);
                                    closeSemesterDropdown();
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.dropdownItemText,
                                      isActive &&
                                        styles.dropdownItemTextActive,
                                    ]}
                                  >
                                    {semester.label}
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
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="image-outline" size={18} color="#DC2626" />
                    <Text style={styles.modalSectionTitle}>
                      Select Class Banner Image
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bannerUpload}
                    activeOpacity={0.85}
                  >
                    <View style={styles.bannerUploadIcon}>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={24}
                        color="#DC2626"
                      />
                    </View>
                    <Text style={styles.bannerUploadTitle}>
                      Upload Class Banner
                    </Text>
                    <Text style={styles.bannerUploadSubtitle}>
                      Recommended wide cover image for class header
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>

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
                onPress={handleCreateClass}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.modalPrimaryButtonText}>Create Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isMobile && (
        <Modal
          visible={isSemesterModalVisible}
          animationType="fade"
          transparent
          onRequestClose={closeSemesterDropdown}
        >
          <View style={styles.optionModalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeSemesterDropdown}
            />

            <View style={styles.optionModalCard}>
              <View style={styles.optionModalHeader}>
                <Text style={styles.optionModalTitle}>Select Semester</Text>
                <TouchableOpacity
                  onPress={closeSemesterDropdown}
                  activeOpacity={0.85}
                  style={styles.optionModalCloseButton}
                >
                  <Ionicons name="close" size={20} color="#7A4A4A" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={true}>
                {SEMESTER_OPTIONS.map((semester, index) => {
                  const isActive = selectedSemester === semester.id;
                  const isLast = index === SEMESTER_OPTIONS.length - 1;

                  return (
                    <TouchableOpacity
                      key={semester.id}
                      style={[
                        styles.optionModalItem,
                        isActive && styles.dropdownItemActive,
                        !isLast && styles.dropdownItemBorder,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedSemester(semester.id);
                        closeSemesterDropdown();
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isActive && styles.dropdownItemTextActive,
                        ]}
                      >
                        {semester.label}
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
          </View>
        </Modal>
      )}
    </>
  );
}

export default function AdminDashboard({
  width,
  onOpenManageClass,
  onOpenManageAdmin,
  onOpenManageStudent,
  onOpenManageTeacher,
}: AdminDashboardProps) {
const [teacherCount, setTeacherCount] = useState(getTeacherCount());

const handleAddSharedTeacher = (payload: {
  teacherId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
}) => {
  addTeacherRecord(payload);
  setTeacherCount(getTeacherCount());
};

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
  const [classCount, setClassCount] = useState(getClassCount());
  const [adminCount, setAdminCount] = useState(getAdminCount());
  const [studentCount, setStudentCount] = useState(getStudentCount());

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

  const handleAddSharedClass = (payload: {
    classCode: string;
    className: string;
    semester: string;
    section: string;
    instructor: string;
    classMembers: number;
  }) => {
    addClassRecord(payload);
    setClassCount(getClassCount());
  };

  const handleAddSharedAdmin = (payload: {
    adminId: string;
    firstName: string;
    lastName: string;
    birthday: string;
    email: string;
  }) => {
    addAdminRecord(payload);
    setAdminCount(getAdminCount());
  };

  const handleAddSharedStudent = (payload: {
    studentId: string;
    firstName: string;
    lastName: string;
    birthday: string;
    email: string;
    studentType: "regular" | "irregular" | "";
  }) => {
    addStudentRecord(payload);
    setStudentCount(getStudentCount());
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
          trend="+12.4% this month"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Teachers"
          value={`${teacherCount}`}
          trend="+4 new faculty"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Admins"
          value={`${adminCount}`}
          trend="2 pending approvals"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Classes"
          value={`${classCount}`}
          trend="Shared class records"
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

  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.12)",
    justifyContent: "flex-end",
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

  webDateModalCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
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

  addClassModalBodyWrap: {
    flex: 1,
    position: "relative",
  },

  addClassSemesterFieldWrap: {
    position: "relative",
    zIndex: 3000,
  },

  addClassSemesterFloatingFront: {
    position: "absolute",
    top: 74,
    left: 0,
    right: 0,
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
    elevation: 9999,
    zIndex: 9999,
  },

  addClassSemesterDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 2000,
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

  yearBlock: {
    marginBottom: 14,
  },

  checkRow: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },

  checkRowActive: {
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

  sectionContainer: {
    marginTop: 10,
    marginLeft: 14,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#F3D4D4",
  },

  subFieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A4A4A",
    marginBottom: 10,
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

  placeholderSelectText: {
    color: "#B79A9A",
  },

  datePickerWrap: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    padding: 8,
  },

  datePickerActions: {
    marginTop: 8,
    alignItems: "flex-end",
  },

  datePickerButtonSecondary: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7C0C0",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
  },

  datePickerButtonSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A4A4A",
  },

  webDateContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },

  webDateList: {
    maxHeight: 260,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
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

  bannerUpload: {
    minHeight: 180,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E7B8B8",
    backgroundColor: "#FFF9F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  bannerUploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  bannerUploadTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  bannerUploadSubtitle: {
    fontSize: 13,
    color: "#8A6F6F",
    textAlign: "center",
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

  optionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.45)",
    justifyContent: "flex-end",
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
});