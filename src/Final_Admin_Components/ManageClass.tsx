import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    addClassRecord,
    deleteClassRecord,
    getClassRecords,
    updateClassRecord,
    type ClassItem,
} from "./classStore";

type ManageClassProps = {
  width: number;
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

  const resetForm = () => {
    setInstructor("");
    setSelectedYear(null);
    setSelectedSection(null);
    setSelectedCourse(null);
    setSelectedSemester("sem-1");
    closeSemesterDropdown();
  };

  const handleClose = () => {
    resetForm();
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

    resetForm();
    onClose();
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

            <ScrollView
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
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
                    <Text style={styles.modalSectionTitle}>Select Section</Text>
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

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
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

export default function ManageClass({ width }: ManageClassProps) {
  const [classes, setClasses] = useState<ClassItem[]>(getClassRecords());
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const tableMinWidth = isMobile ? 980 : isTablet ? 1080 : 1180;

  useEffect(() => {
    setClasses([...getClassRecords()]);
  }, []);

  const filteredClasses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return classes;

    return classes.filter((item) => {
      const searchable = [
        item.classCode,
        item.className,
        item.semester,
        item.section,
        item.instructor,
        `${item.classMembers}`,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [classes, searchText]);

  const handleAddClass = (payload: {
    classCode: string;
    className: string;
    semester: string;
    section: string;
    instructor: string;
    classMembers: number;
  }) => {
    addClassRecord(payload);
    setClasses([...getClassRecords()]);
    setIsAddModalVisible(false);
  };

  const handleEdit = (item: ClassItem) => {
    const updatedItem: ClassItem = {
      ...item,
      className: `${item.className} (Edited)`,
    };

    updateClassRecord(updatedItem);
    setClasses([...getClassRecords()]);
  };

  const handleDelete = (id: string) => {
    deleteClassRecord(id);
    setClasses([...getClassRecords()]);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
        <View
          style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
        >
          <Text style={styles.heroEyebrow}>CLASS MANAGEMENT</Text>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Manage Class
          </Text>
          <Text style={styles.heroSubtitle}>
            View all added classes, manage records, and maintain class details in
            one place.
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
              placeholder="Search class, section, semester, or instructor"
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
                <Text style={[styles.tableHeaderText, styles.codeColumn]}>
                  Class Code
                </Text>
                <Text style={[styles.tableHeaderText, styles.classNameColumn]}>
                  Class Name with Semester
                </Text>
                <Text style={[styles.tableHeaderText, styles.sectionColumn]}>
                  Section
                </Text>
                <Text style={[styles.tableHeaderText, styles.instructorColumn]}>
                  Instructor
                </Text>
                <Text style={[styles.tableHeaderText, styles.memberColumn]}>
                  Number of Class Member
                </Text>
                <Text style={[styles.tableHeaderText, styles.actionColumn]}>
                  Action
                </Text>
              </View>

              {filteredClasses.map((item, index) => {
                const isLast = index === filteredClasses.length - 1;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.tableBodyRow,
                      !isLast && styles.tableRowBorder,
                    ]}
                  >
                    <View style={styles.codeColumn}>
                      <Text style={styles.codeBadge}>{item.classCode}</Text>
                    </View>

                    <View style={styles.classNameColumn}>
                      <Text style={styles.tablePrimaryText}>{item.className}</Text>
                    </View>

                    <View style={styles.sectionColumn}>
                      <Text style={styles.tablePrimaryText}>{item.section}</Text>
                    </View>

                    <View style={styles.instructorColumn}>
                      <Text style={styles.tablePrimaryText}>
                        {item.instructor}
                      </Text>
                    </View>

                    <View style={styles.memberColumn}>
                      <Text style={styles.tablePrimaryText}>
                        {item.classMembers}
                      </Text>
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

              {filteredClasses.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="albums-outline" size={28} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>No classes found</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Try another search or add a new class record.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      <AddClassModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        isMobile={isMobile}
        onCreateClass={handleAddClass}
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

  tableSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8A6F6F",
    marginTop: 4,
  },

  codeColumn: {
    width: 140,
    paddingRight: 12,
  },

  classNameColumn: {
    width: 300,
    paddingRight: 12,
  },

  sectionColumn: {
    width: 170,
    paddingRight: 12,
  },

  instructorColumn: {
    width: 240,
    paddingRight: 12,
  },

  memberColumn: {
    width: 190,
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

  dropdownFloatingScroll: {
    maxHeight: 260,
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