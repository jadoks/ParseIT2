import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

type BannerFile = {
  uri: string;
  name: string | null;
  mimeType: string | null;
};

export type AddClassModalPayload = {
  classCode: string;
  className: string;
  courseCode: string;
  semester: string;
  section: string;
  year?: string | null;
  instructorIdentifier: string;
  classMembers: number;
  schoolYear: string | null;
  description: string | null;
  bannerLocalUri: string | null;
  bannerFileName: string | null;
  bannerMimeType: string | null;
  units: number;
};

export type AddClassModalInitialData = {
  id?: string;
  classCode?: string;
  className?: string;
  courseCode?: string;
  semester?: string;
  section?: string;
  instructorIdentifier?: string | null;
  classMembers?: number;
  schoolYear?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  bannerFileName?: string | null;
  bannerMimeType?: string | null;
  units?: number | null;
};

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
    { id: "1C", label: "1C Amazon" },
  ],
  "2nd": [
    { id: "2A", label: "2A Algorithm" },
    { id: "2B", label: "2B Pseudocode" },
    { id: "2C", label: "2C Binary" },
  ],
  "3rd": [
    { id: "3A", label: "3A Python" },
    { id: "3B", label: "3B Java" },
    { id: "3C", label: "3C C++" },
  ],
  "4th": [
    { id: "4A", label: "4A Xamarin" },
    { id: "4B", label: "4B Laravel" },
    { id: "4C", label: "4C Flutter" },
  ],
};

const SEMESTER_OPTIONS: SemesterOption[] = [
  { id: "sem-1", label: "1st Semester" },
  { id: "sem-2", label: "2nd Semester" },
];

export default function AddClassModal({
  visible,
  onClose,
  isMobile,
  onCreateClass,
  initialData,
  isEditMode = false,
  isSubmitting = false,
}: {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onCreateClass: (payload: AddClassModalPayload) => void;
  initialData?: AddClassModalInitialData | null;
  isEditMode?: boolean;
  isSubmitting?: boolean;
}) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [isSemesterModalVisible, setIsSemesterModalVisible] = useState(false);

  const [instructorIdentifier, setInstructorIdentifier] = useState("");

  // Course details are now free-text input (matches Teacher Dashboard Create Class flow)
  const [courseCodeInput, setCourseCodeInput] = useState("");
  const [courseNameInput, setCourseNameInput] = useState("");
  const [courseUnitsInput, setCourseUnitsInput] = useState("");

  const [description, setDescription] = useState("");
  const [startYear, setStartYear] = useState("2025");
  const [endYear, setEndYear] = useState("2026");
  const [bannerFile, setBannerFile] = useState<BannerFile | null>(null);
  const [isBannerHovered, setIsBannerHovered] = useState(false);

  const selectedSemesterLabel = useMemo(() => {
    return (
      SEMESTER_OPTIONS.find((item) => item.id === selectedSemester)?.label ||
      "Select semester"
    );
  }, [selectedSemester]);

  const shouldShowBannerOverlay =
    !bannerFile?.uri || isMobile || Platform.OS !== "web" || isBannerHovered;

  useEffect(() => {
    const parsedStartYear = Number(startYear.trim());

    if (startYear.trim().length === 4 && Number.isFinite(parsedStartYear)) {
      setEndYear(String(parsedStartYear + 1));
    } else {
      setEndYear("");
    }
  }, [startYear]);

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

  const handleSelectSemester = (semesterId: string) => {
    setSelectedSemester(semesterId);
    setSelectedSection(null);
    closeSemesterDropdown();
  };

  const toggleYear = (yearId: string) => {
    if (selectedYear === yearId) {
      setSelectedYear(null);
      setSelectedSemester(null);
      setSelectedSection(null);
      return;
    }

    setSelectedYear(yearId);
    setSelectedSemester(null);
    setSelectedSection(null);
  };

  const toggleSection = (sectionId: string) => {
    if (selectedSection === sectionId) {
      setSelectedSection(null);
      return;
    }

    setSelectedSection(sectionId);
  };

  const handlePickBanner = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Upload Failed", "No file was selected.");
        return;
      }

      setBannerFile({
        uri: asset.uri,
        name: asset.name ?? null,
        mimeType: asset.mimeType ?? null,
      });
    } catch (error) {
      console.error("Banner pick error:", error);
      Alert.alert("Upload Failed", "Unable to open file picker.");
    }
  };

  const clearBanner = () => {
    setBannerFile(null);
    setIsBannerHovered(false);
  };

  const resetForm = () => {
    setInstructorIdentifier("");
    setDescription("");
    setStartYear("2025");
    setEndYear("2026");
    setSelectedYear(null);
    setSelectedSection(null);
    setSelectedSemester(null);
    setCourseCodeInput("");
    setCourseNameInput("");
    setCourseUnitsInput("");
    setBannerFile(null);
    setIsBannerHovered(false);
    closeSemesterDropdown();
  };

  useEffect(() => {
    if (!visible) return;

    if (!isEditMode || !initialData) {
      resetForm();
      return;
    }

    setInstructorIdentifier(initialData.instructorIdentifier || "");
    setDescription(initialData.description || "");

    if (initialData.schoolYear) {
      const [start, end] = initialData.schoolYear.split("-");
      setStartYear(start || "2025");
      setEndYear(end || "2026");
    } else {
      setStartYear("2025");
      setEndYear("2026");
    }

    const matchedSemester =
      SEMESTER_OPTIONS.find(
        (semester) => semester.label === initialData.semester
      )?.id || "sem-1";
    setSelectedSemester(matchedSemester);

    let matchedYear: string | null = null;

    if (initialData.section) {
      const yearEntry = Object.entries(SECTION_OPTIONS).find(([, sections]) =>
        sections.some((section) => section.label === initialData.section)
      );
      matchedYear = yearEntry?.[0] || null;
    }

    setSelectedYear(matchedYear);

    if (matchedYear) {
      const matchedSection =
        SECTION_OPTIONS[matchedYear]?.find(
          (section) => section.label === initialData.section
        )?.id || null;

      setSelectedSection(matchedSection);
    } else {
      setSelectedSection(null);
    }

    setCourseCodeInput(initialData.courseCode || "");
    setCourseNameInput(initialData.className || "");
    setCourseUnitsInput(
      typeof initialData.units === "number" ? String(initialData.units) : ""
    );

    if (initialData.bannerFileName || initialData.bannerUrl) {
      setBannerFile({
        uri: initialData.bannerUrl || "",
        name: initialData.bannerFileName ?? null,
        mimeType: initialData.bannerMimeType ?? null,
      });
    } else {
      setBannerFile(null);
    }

    setIsBannerHovered(false);
  }, [visible, isEditMode, initialData]);

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (isSubmitting) return;

    if (!selectedYear) {
      Alert.alert("Missing Field", "Please select a year.");
      return;
    }

    if (!selectedSemester) {
      Alert.alert("Missing Field", "Please select a semester.");
      return;
    }

    if (!selectedSection) {
      Alert.alert("Missing Field", "Please select a section.");
      return;
    }

    if (!courseCodeInput.trim()) {
      Alert.alert("Missing Field", "Please enter a course code.");
      return;
    }

    if (!courseNameInput.trim()) {
      Alert.alert("Missing Field", "Please enter a course name.");
      return;
    }

    if (!startYear.trim() || !endYear.trim()) {
      Alert.alert("Missing Field", "Please enter start year.");
      return;
    }

    if (!instructorIdentifier.trim()) {
      Alert.alert("Missing Field", "Please enter teacher ID.");
      return;
    }

    const selectedYearLabel =
      YEAR_OPTIONS.find((year) => year.id === selectedYear)?.label || null;

    const selectedSectionLabel =
      SECTION_OPTIONS[selectedYear]?.find(
        (section) => section.id === selectedSection
      )?.label || "Not set";

    const selectedCourseLabel = courseNameInput.trim();
    const selectedCourseCode = courseCodeInput.trim();
    const units = parseFloat(courseUnitsInput) || 0;

    const schoolYear = `${startYear.trim()}-${endYear.trim()}`;

    onCreateClass({
      classCode: isEditMode
        ? initialData?.classCode || generateRandomClassCode()
        : generateRandomClassCode(),
      className: selectedCourseLabel,
      courseCode: selectedCourseCode,
      semester: selectedSemesterLabel,
      section: selectedSectionLabel,
      year: selectedYearLabel,
      instructorIdentifier: instructorIdentifier.trim(),
      classMembers: isEditMode ? initialData?.classMembers ?? 0 : 0,
      schoolYear,
      description: description.trim() ? description.trim() : null,
      bannerLocalUri: bannerFile?.uri ?? null,
      bannerFileName: bannerFile?.name ?? null,
      bannerMimeType: bannerFile?.mimeType ?? null,
      units,
    });

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
                  <Text style={styles.modalTitle}>
                    {isEditMode ? "Edit Class" : "Add Class"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {isEditMode
                      ? "Update class details with existing values already selected."
                      : "Create a class by selecting year, semester, section, entering course code, course name, units, teacher ID, school year, optional description, and an optional banner file."}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  isSubmitting && styles.modalSecondaryButtonDisabled,
                ]}
                onPress={handleClose}
                activeOpacity={0.85}
                disabled={isSubmitting}
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
                        name="calendar-outline"
                        size={18}
                        color="#DC2626"
                      />
                      <Text style={styles.modalSectionTitle}>
                        Select Semester
                      </Text>
                    </View>

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
                  </View>
                )}

                {selectedYear && selectedSemester && (
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

                {selectedYear && selectedSemester && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeaderRow}>
                      <Ionicons name="book-outline" size={18} color="#DC2626" />
                      <Text style={styles.modalSectionTitle}>
                        Course Details
                      </Text>
                    </View>

                    <Text style={styles.fieldLabel}>Course Code</Text>
                    <View style={styles.inputField}>
                      <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color="#8A6F6F"
                      />
                      <TextInput
                        value={courseCodeInput}
                        onChangeText={setCourseCodeInput}
                        placeholder="e.g., CC 111"
                        placeholderTextColor="#B79A9A"
                        style={[styles.textInput, { marginBottom: 0 }]}
                      />
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                      Course Name
                    </Text>
                    <View style={styles.descriptionField}>
                      <TextInput
                        value={courseNameInput}
                        onChangeText={setCourseNameInput}
                        placeholder="e.g., INTRODUCTION TO COMPUTING"
                        placeholderTextColor="#B79A9A"
                        multiline
                        textAlignVertical="top"
                        style={[styles.descriptionInput, { minHeight: 60 }]}
                      />
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                      Units
                    </Text>
                    <View style={styles.inputField}>
                      <Ionicons
                        name="calculator-outline"
                        size={18}
                        color="#8A6F6F"
                      />
                      <TextInput
                        value={courseUnitsInput}
                        onChangeText={setCourseUnitsInput}
                        placeholder="e.g., 3.0"
                        placeholderTextColor="#B79A9A"
                        keyboardType="numeric"
                        style={[styles.textInput, { marginBottom: 0 }]}
                      />
                    </View>
                  </View>
                )}

                <View
                  style={[styles.modalRow, isMobile && styles.modalRowStack]}
                >
                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>Instructor ID</Text>
                    <Text style={styles.helperText}>
                      Enter only the teacher ID. The system will automatically fetch
                      the teacher name and email.
                    </Text>
                    <View style={styles.inputField}>
                      <Ionicons
                        name="card-outline"
                        size={18}
                        color="#8A6F6F"
                      />
                      <TextInput
                        value={instructorIdentifier}
                        onChangeText={setInstructorIdentifier}
                        placeholder="Enter teacher ID"
                        placeholderTextColor="#B79A9A"
                        style={styles.textInput}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </View>

                <View
                  style={[styles.modalRow, isMobile && styles.modalRowStack]}
                >
                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>Start Year</Text>
                    <View style={styles.inputField}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#8A6F6F"
                      />
                      <TextInput
                        value={startYear}
                        onChangeText={setStartYear}
                        placeholder="2025"
                        placeholderTextColor="#B79A9A"
                        keyboardType="number-pad"
                        maxLength={4}
                        style={styles.textInput}
                      />
                    </View>
                  </View>

                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>End Year</Text>
                    <View style={styles.inputField}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#8A6F6F"
                      />
                      <TextInput
                        value={endYear}
                        placeholder="Auto"
                        placeholderTextColor="#B79A9A"
                        editable={false}
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#DC2626"
                    />
                    <Text style={styles.modalSectionTitle}>
                      Description (Optional)
                    </Text>
                  </View>

                  <View style={styles.descriptionField}>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Enter class description"
                      placeholderTextColor="#B79A9A"
                      multiline
                      textAlignVertical="top"
                      style={styles.descriptionInput}
                    />
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="image-outline" size={18} color="#DC2626" />
                    <Text style={styles.modalSectionTitle}>
                      Select Class Banner Image
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.bannerUpload,
                      bannerFile && styles.bannerUploadSelected,
                      pressed && styles.bannerUploadPressed,
                    ]}
                    onPress={handlePickBanner}
                    onHoverIn={() => {
                      if (Platform.OS === "web") setIsBannerHovered(true);
                    }}
                    onHoverOut={() => {
                      if (Platform.OS === "web") setIsBannerHovered(false);
                    }}
                  >
                    {bannerFile?.uri ? (
                      <Image
                        source={{ uri: bannerFile.uri }}
                        style={styles.bannerUploadBackgroundImage}
                        resizeMode="cover"
                      />
                    ) : null}

                    {shouldShowBannerOverlay ? (
                      <View style={styles.bannerUploadOverlay} />
                    ) : null}

                    {shouldShowBannerOverlay ? (
                      <View style={styles.bannerUploadContent}>
                        <View style={styles.bannerUploadIcon}>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={24}
                            color="#DC2626"
                          />
                        </View>

                        <Text style={styles.bannerUploadTitle}>
                          {bannerFile
                            ? "Change Class Banner"
                            : "Upload Class Banner"}
                        </Text>

                        <Text style={styles.bannerUploadSubtitle}>
                          {bannerFile?.name
                            ? bannerFile.name
                            : "Tap to open your device file explorer"}
                        </Text>

                        {!!bannerFile?.mimeType && (
                          <Text style={styles.bannerMetaText}>
                            {bannerFile.mimeType}
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </Pressable>

                  {bannerFile && (
                    <TouchableOpacity
                      style={styles.removeBannerButton}
                      activeOpacity={0.85}
                      onPress={clearBanner}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={styles.removeBannerButtonText}>
                        Remove selected banner
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalSecondaryButton,
                  isSubmitting && styles.modalSecondaryButtonDisabled,
                ]}
                onPress={handleClose}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  isSubmitting && styles.modalPrimaryButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={isEditMode ? "save-outline" : "add-circle-outline"}
                    size={18}
                    color="#FFFFFF"
                  />
                )}

                <Text style={styles.modalPrimaryButtonText}>
                  {isSubmitting
                    ? isEditMode
                      ? "Updating..."
                      : "Creating..."
                    : isEditMode
                    ? "Update Class"
                    : "Create Class"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isSemesterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSemesterDropdown}
      >
        <View style={styles.dropdownModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeSemesterDropdown}
          />

          <View style={styles.dropdownModalCard}>
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
                    onPress={() => handleSelectSemester(semester.id)}
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
    </>
  );
}

const styles = StyleSheet.create({
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
  addClassModalBodyWrap: {
    flex: 1,
    position: "relative",
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
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#8A6F6F",
    marginTop: -2,
    marginBottom: 10,
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
  descriptionField: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descriptionInput: {
    minHeight: 100,
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "500",
  },
  bannerUpload: {
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E7B8B8",
    backgroundColor: "#FFF9F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    overflow: "hidden",
    position: "relative",
  },
  bannerUploadPressed: {
    backgroundColor: "#FFF7F7",
  },
  bannerUploadSelected: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF7F7",
  },
  bannerUploadBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  bannerUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 249, 249, 0.58)",
  },
  bannerUploadContent: {
    position: "relative",
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerUploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(254, 226, 226, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  bannerUploadTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
    textAlign: "center",
  },
  bannerUploadSubtitle: {
    fontSize: 13,
    color: "#8A6F6F",
    textAlign: "center",
  },
  bannerMetaText: {
    marginTop: 8,
    fontSize: 12,
    color: "#A05A5A",
    fontWeight: "600",
    textAlign: "center",
  },
  removeBannerButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  removeBannerButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
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
  modalPrimaryButtonDisabled: {
    opacity: 0.75,
  },
  modalSecondaryButtonDisabled: {
    opacity: 0.55,
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownModalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
    shadowColor: "#2B1111",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 12,
  },
  optionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8E3E3",
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