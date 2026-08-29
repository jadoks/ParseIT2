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
  useWindowDimensions,
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

// One recurring weekly time block for a class (e.g. "Mon/Wed 08:00-09:30, Room 301").
// A class can have several of these (e.g. a lecture block + a separate lab block).
// Mirrors the shape used by the Teacher Dashboard's Create Class flow so the
// same `schedule` array can be sent straight to the backend.
export type ClassScheduleEntry = {
  days: string[]; // subset of DAY_OPTIONS, e.g. ['Mon', 'Wed']
  startTime: string; // 24-hour 'HH:MM'
  endTime: string; // 24-hour 'HH:MM'
  room?: string | null;
};

// Same shape as ClassScheduleEntry, plus a local `id` used only for
// React keys / editing state in this form.
type ClassScheduleFormBlock = ClassScheduleEntry & { id: string };

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
  schedule: ClassScheduleEntry[];
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
  schedule?: ClassScheduleEntry[] | null;
};

/**
 * Small helper component so every text field gets consistent
 * focus behavior (highlighted container border instead of the
 * browser's default clipped outline on web).
 */
function FormInput({
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
  editable,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  onChangeText?: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
  editable?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[styles.inputField, isFocused && styles.inputFieldFocused]}
    >
      <Ionicons name={icon} size={18} color="#8A6F6F" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B79A9A"
        style={styles.textInput}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        editable={editable}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

/**
 * Multiline sibling of FormInput. Same focus-highlight behavior
 * (border lights up on focus) but sized/styled for free-text blocks
 * like Course Name and Description. Having this as its own component
 * (instead of an inline TextInput per field) is what makes the focus
 * state actually work — a raw TextInput dropped into a static View
 * never gets a way to know it's focused.
 */
function FormTextArea({
  value,
  onChangeText,
  placeholder,
  minHeight = 100,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder: string;
  minHeight?: number;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.descriptionField,
        isFocused && styles.descriptionFieldFocused,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B79A9A"
        multiline
        textAlignVertical="top"
        style={[styles.descriptionInput, { minHeight }]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

/**
 * Icon-less sibling of FormInput, used for fields that sit right next to
 * a dropdown trigger or inside a schedule block (Course Name, Room, the
 * digit-only time fields) — mirrors the Teacher Dashboard's plain
 * "DashboardTextField" look instead of the icon-prefixed inputs above.
 */
function PlainField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  editable,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "numeric";
  maxLength?: number;
  editable?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.plainInputWrap, isFocused && styles.plainInputWrapFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B79A9A"
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        style={styles.plainInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ── Google-Classroom-style time input helpers (matches Teacher Dashboard) ──
// The user types plain digits (e.g. "0930"); we auto-insert the ":" once
// the hour (first 2 digits) is entered, and clamp to a valid 12-hour time.
// A separate AM/PM toggle sits next to the field. Internally everything is
// still stored/validated as 24-hour 'HH:MM'.
const pad2 = (n: number) => String(n).padStart(2, "0");

const clampTimeDigits = (raw: string): string => {
  let out = raw.replace(/[^0-9]/g, "").slice(0, 4);
  if (out.length >= 2) {
    let hh = parseInt(out.slice(0, 2), 10);
    if (Number.isNaN(hh)) hh = 0;
    if (hh > 12) hh = 12;
    if (hh === 0) hh = 1;
    out = pad2(hh) + out.slice(2);
  }
  if (out.length === 4) {
    let mm = parseInt(out.slice(2, 4), 10);
    if (Number.isNaN(mm)) mm = 0;
    if (mm > 59) mm = 59;
    out = out.slice(0, 2) + pad2(mm);
  }
  return out;
};

const formatTimeDigitsForDisplay = (digits: string): string =>
  digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;

const timeDigitsAndMeridiemTo24h = (digits: string, meridiem: "AM" | "PM"): string => {
  if (digits.length !== 4) return "";
  const hour12 = parseInt(digits.slice(0, 2), 10);
  const minute = parseInt(digits.slice(2, 4), 10);
  if (Number.isNaN(hour12) || Number.isNaN(minute) || hour12 < 1 || hour12 > 12 || minute > 59) return "";
  let hour24 = hour12 % 12;
  if (meridiem === "PM") hour24 += 12;
  return `${pad2(hour24)}:${pad2(minute)}`;
};

// Converts a stored 24-hour 'HH:MM' value back into typed digits + AM/PM,
// so editing an existing schedule shows the right starting values.
const parse24hToTimeDigits = (time24: string): { digits: string; meridiem: "AM" | "PM" } => {
  const match = TIME_24H_REGEX.exec((time24 || "").trim());
  if (!match) return { digits: "", meridiem: "AM" };
  const hour24 = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { digits: `${pad2(hour12)}${pad2(minute)}`, meridiem };
};

function TimeInputField({
  value,
  onChangeValue,
  placeholder,
}: {
  value: string; // 24-hour 'HH:MM' or ''
  onChangeValue: (value24h: string) => void;
  placeholder?: string;
}) {
  const initial = useMemo(() => parse24hToTimeDigits(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [digits, setDigits] = useState(initial.digits);
  const [meridiem, setMeridiem] = useState<"AM" | "PM">(initial.meridiem);
  const [isFocused, setIsFocused] = useState(false);

  const commit = (nextDigits: string, nextMeridiem: "AM" | "PM") => {
    onChangeValue(timeDigitsAndMeridiemTo24h(nextDigits, nextMeridiem));
  };

  const handleChangeText = (text: string) => {
    const clamped = clampTimeDigits(text);
    setDigits(clamped);
    commit(clamped, meridiem);
  };

  const handleMeridiemPress = (nextMeridiem: "AM" | "PM") => {
    setMeridiem(nextMeridiem);
    commit(digits, nextMeridiem);
  };

  return (
    <View style={styles.timeInputRow}>
      <View style={[styles.plainInputWrap, styles.timeInputWrap, isFocused && styles.plainInputWrapFocused]}>
        <TextInput
          value={formatTimeDigitsForDisplay(digits)}
          onChangeText={handleChangeText}
          placeholder={placeholder || "09:30"}
          placeholderTextColor="#B79A9A"
          keyboardType="number-pad"
          maxLength={5}
          style={styles.plainInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      <View style={styles.meridiemToggle}>
        <TouchableOpacity
          style={[styles.meridiemBtn, meridiem === "AM" && styles.meridiemBtnActive]}
          onPress={() => handleMeridiemPress("AM")}
        >
          <Text style={[styles.meridiemBtnText, meridiem === "AM" && styles.meridiemBtnTextActive]}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.meridiemBtn, meridiem === "PM" && styles.meridiemBtnActive]}
          onPress={() => handleMeridiemPress("PM")}
        >
          <Text style={[styles.meridiemBtnText, meridiem === "PM" && styles.meridiemBtnTextActive]}>PM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createEmptyScheduleBlock = (): ClassScheduleFormBlock => ({
  id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  days: [],
  startTime: "",
  endTime: "",
  room: "",
});

// Returns an error message for the first invalid block, or null if all blocks are valid.
const validateScheduleBlocks = (blocks: ClassScheduleFormBlock[]): string | null => {
  for (const block of blocks) {
    if (block.days.length === 0) return "Select at least one day for each schedule block.";
    if (!TIME_24H_REGEX.test(block.startTime.trim())) return "Enter a valid start time (e.g., 08:00) for each schedule block.";
    if (!TIME_24H_REGEX.test(block.endTime.trim())) return "Enter a valid end time (e.g., 09:30) for each schedule block.";
    if (block.startTime.trim() >= block.endTime.trim()) return "End time must be after start time for each schedule block.";
  }
  return null;
};

// Strips the local `id` and trims text fields before sending to the backend.
const serializeScheduleBlocks = (blocks: ClassScheduleFormBlock[]): ClassScheduleEntry[] =>
  blocks.map(({ days, startTime, endTime, room }) => ({
    days,
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    room: room && room.trim() ? room.trim() : null,
  }));

// Converts stored ClassScheduleEntry[] (from initialData, edit mode) back into
// form blocks with local ids for React keys / editing state.
const hydrateScheduleBlocks = (entries?: ClassScheduleEntry[] | null): ClassScheduleFormBlock[] => {
  if (!entries || entries.length === 0) return [createEmptyScheduleBlock()];
  return entries.map((entry) => ({
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    days: Array.isArray(entry.days) ? entry.days : [],
    startTime: entry.startTime || "",
    endTime: entry.endTime || "",
    room: entry.room || "",
  }));
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
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1200;
  const isTabletUp = width >= 768;
  const optionGridItemStyle = !isTabletUp
    ? styles.optionGridItemMobile
    : isLargeScreen
    ? styles.optionGridItemLarge
    : styles.optionGridItemTablet;

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [isSemesterDropdownVisible, setIsSemesterDropdownVisible] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState<ClassScheduleFormBlock[]>([
    createEmptyScheduleBlock(),
  ]);

  const [instructorIdentifier, setInstructorIdentifier] = useState("");

  // Course details are now free-text input (matches Teacher Dashboard Create Class flow)
  const [courseCodeInput, setCourseCodeInput] = useState("");
  const [courseNameInput, setCourseNameInput] = useState("");
  const [courseUnitsInput, setCourseUnitsInput] = useState("");

  const [description, setDescription] = useState("");
  const [startYear, setStartYear] = useState("2025");
  const [endYear, setEndYear] = useState("2026");
  const [bannerFile, setBannerFile] = useState<BannerFile | null>(null);

  const selectedSemesterLabel = useMemo(() => {
    return (
      SEMESTER_OPTIONS.find((item) => item.id === selectedSemester)?.label ||
      "Select semester"
    );
  }, [selectedSemester]);

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

  const toggleSemesterDropdown = () => {
    setIsSemesterDropdownVisible((prev) => !prev);
  };

  const closeSemesterDropdown = () => {
    setIsSemesterDropdownVisible(false);
  };

  const handleSelectSemester = (semesterId: string) => {
    setSelectedSemester(semesterId);
    setSelectedSection(null);
    closeSemesterDropdown();
  };

  // ── Class schedule block editors ──────────────────────────────────────
  const addScheduleBlock = () => setScheduleBlocks((prev) => [...prev, createEmptyScheduleBlock()]);
  const removeScheduleBlock = (blockId: string) =>
    setScheduleBlocks((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== blockId) : prev));
  const toggleScheduleDay = (blockId: string, day: string) =>
    setScheduleBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, days: b.days.includes(day) ? b.days.filter((d) => d !== day) : [...b.days, day] }
          : b
      )
    );
  const updateScheduleField = (blockId: string, field: "startTime" | "endTime" | "room", value: string) =>
    setScheduleBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)));

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
    setScheduleBlocks([createEmptyScheduleBlock()]);
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

    setScheduleBlocks(hydrateScheduleBlocks(initialData.schedule));

    if (initialData.bannerFileName || initialData.bannerUrl) {
      setBannerFile({
        uri: initialData.bannerUrl || "",
        name: initialData.bannerFileName ?? null,
        mimeType: initialData.bannerMimeType ?? null,
      });
    } else {
      setBannerFile(null);
    }
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

    const scheduleError = validateScheduleBlocks(scheduleBlocks);
    if (scheduleError) {
      Alert.alert("Missing Field", scheduleError);
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
      schedule: serializeScheduleBlocks(scheduleBlocks),
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

                  <View style={styles.optionsGrid}>
                    {YEAR_OPTIONS.map((year) => {
                      const isChecked = selectedYear === year.id;

                      return (
                        <View key={year.id} style={optionGridItemStyle}>
                          <TouchableOpacity
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
                                  size={12}
                                  color="#FFFFFF"
                                />
                              )}
                            </View>

                            <Text style={styles.checkText}>{year.label}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {selectedYear && (
                  <View
                    style={[
                      styles.modalSection,
                      isTabletUp && styles.formGridRow,
                      styles.semesterRowWrap,
                    ]}
                  >
                    <View
                      style={[
                        styles.semesterFieldWrap,
                        isTabletUp && styles.formGridCol,
                      ]}
                    >
                      <Text style={styles.fieldLabel}>Semester Selection</Text>
                      <TouchableOpacity
                        style={styles.selectField}
                        activeOpacity={0.85}
                        onPress={toggleSemesterDropdown}
                      >
                        <Text style={styles.selectFieldText}>
                          {selectedSemesterLabel}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color="#8A6F6F"
                        />
                      </TouchableOpacity>

                      {isSemesterDropdownVisible && (
                        <>
                          <Pressable
                            style={styles.floatingDropdownDismiss}
                            onPress={closeSemesterDropdown}
                          />
                          <View style={styles.floatingDropdownMenu}>
                            {SEMESTER_OPTIONS.map((semester, index) => {
                              const isActive = selectedSemester === semester.id;
                              const isLast = index === SEMESTER_OPTIONS.length - 1;

                              return (
                                <TouchableOpacity
                                  key={semester.id}
                                  style={[
                                    styles.dropdownItem,
                                    isActive && styles.dropdownItemActive,
                                    !isLast && styles.dropdownItemBorder,
                                  ]}
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
                          </View>
                        </>
                      )}
                    </View>

                    <View style={isTabletUp ? styles.formGridCol : undefined}>
                      <Text style={styles.fieldLabel}>Course Name</Text>
                      <PlainField
                        value={courseNameInput}
                        onChangeText={setCourseNameInput}
                        placeholder="e.g., INTRODUCTION TO COMPUTING"
                      />
                    </View>
                  </View>
                )}

                {selectedYear && selectedSemester && (
                  <View style={[styles.modalSection, styles.sectionBelowDropdown]}>
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

                    <View style={styles.optionsGrid}>
                      {SECTION_OPTIONS[selectedYear].map((section) => {
                        const isChecked = selectedSection === section.id;

                        return (
                          <View key={section.id} style={optionGridItemStyle}>
                            <TouchableOpacity
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
                                    size={12}
                                    color="#FFFFFF"
                                  />
                                )}
                              </View>

                              <Text style={styles.checkText}>{section.label}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {selectedYear && selectedSemester && (
                  <View style={[styles.modalSection, styles.sectionBelowDropdown]}>
                    <View style={styles.modalSectionHeaderRow}>
                      <Ionicons name="time-outline" size={18} color="#DC2626" />
                      <Text style={styles.modalSectionTitle}>Class Schedule</Text>
                    </View>

                    {scheduleBlocks.map((block, index) => (
                      <View key={block.id} style={styles.scheduleBlockCard}>
                        <View style={styles.scheduleBlockHeaderRow}>
                          <Text style={styles.scheduleBlockTitle}>
                            Schedule {index + 1}
                          </Text>
                          {scheduleBlocks.length > 1 && (
                            <TouchableOpacity
                              style={styles.scheduleRemoveBtn}
                              onPress={() => removeScheduleBlock(block.id)}
                            >
                              <MaterialCommunityIcons
                                name="trash-can-outline"
                                size={18}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text style={styles.fieldLabel}>Days</Text>
                        <View style={styles.dayChipRow}>
                          {DAY_OPTIONS.map((day) => {
                            const isActive = block.days.includes(day);
                            return (
                              <TouchableOpacity
                                key={day}
                                style={[styles.dayChip, isActive && styles.dayChipActive]}
                                onPress={() => toggleScheduleDay(block.id, day)}
                              >
                                <Text
                                  style={[
                                    styles.dayChipText,
                                    isActive && styles.dayChipTextActive,
                                  ]}
                                >
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <View style={styles.scheduleTimeRow}>
                          <View style={styles.scheduleTimeCol}>
                            <Text style={styles.fieldLabel}>Start Time</Text>
                            <TimeInputField
                              value={block.startTime}
                              onChangeValue={(text) =>
                                updateScheduleField(block.id, "startTime", text)
                              }
                              placeholder="09:00"
                            />
                          </View>
                          <View style={styles.scheduleTimeCol}>
                            <Text style={styles.fieldLabel}>End Time</Text>
                            <TimeInputField
                              value={block.endTime}
                              onChangeValue={(text) =>
                                updateScheduleField(block.id, "endTime", text)
                              }
                              placeholder="10:30"
                            />
                          </View>
                        </View>

                        <Text style={styles.fieldLabel}>Room (Optional)</Text>
                        <PlainField
                          value={block.room || ""}
                          onChangeText={(text) => updateScheduleField(block.id, "room", text)}
                          placeholder="e.g., Room 301"
                        />
                      </View>
                    ))}

                    <TouchableOpacity style={styles.addScheduleBtn} onPress={addScheduleBlock}>
                      <Ionicons name="add-circle-outline" size={18} color="#DC2626" />
                      <Text style={styles.addScheduleBtnText}>Add another schedule</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View
                  style={[styles.modalRow, isMobile && styles.modalRowStack]}
                >
                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>Course Code</Text>
                    <FormInput
                      icon="pricetag-outline"
                      value={courseCodeInput}
                      onChangeText={setCourseCodeInput}
                      placeholder="e.g., CC 111"
                    />
                  </View>

                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>Instructor ID</Text>
                    <Text style={styles.helperText}>
                      Enter only the teacher ID. The system will automatically fetch
                      the teacher name and email.
                    </Text>
                    <FormInput
                      icon="card-outline"
                      value={instructorIdentifier}
                      onChangeText={setInstructorIdentifier}
                      placeholder="Enter teacher ID"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View
                  style={[styles.modalRow, isMobile && styles.modalRowStack]}
                >
                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>Start Year</Text>
                    <FormInput
                      icon="calendar-outline"
                      value={startYear}
                      onChangeText={setStartYear}
                      placeholder="2025"
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>

                  <View style={styles.modalCol}>
                    <Text style={styles.fieldLabel}>End Year</Text>
                    <FormInput
                      icon="calendar-outline"
                      value={endYear}
                      onChangeText={() => {}}
                      placeholder="Auto"
                      editable={false}
                    />
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

                  <FormTextArea
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter class description"
                    minHeight={100}
                  />
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="image-outline" size={18} color="#DC2626" />
                    <Text style={styles.modalSectionTitle}>
                      Select Class Banner Image
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.uploadBtn}
                    activeOpacity={0.85}
                    onPress={handlePickBanner}
                  >
                    <Ionicons name="image-outline" size={20} color="#DC2626" />
                    <Text style={styles.uploadBtnText}>
                      {bannerFile ? "Change Banner Photo" : "Upload Banner Photo"}
                    </Text>
                  </TouchableOpacity>

                  {bannerFile?.uri ? (
                    <View style={styles.bannerPreview}>
                      <Image
                        source={{ uri: bannerFile.uri }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                      <View style={styles.previewOverlay}>
                        <Text style={styles.previewText}>Banner Preview</Text>
                      </View>
                    </View>
                  ) : null}

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
  // ✅ Grid wrapper for Select Year / Select Section so large screens use
  // the extra horizontal room instead of stacking every option full-width
  // (matches TeacherDashboard's Create Class layout).
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
  },
  optionGridItemMobile: { width: "100%" },
  optionGridItemTablet: { width: "48%" },
  optionGridItemLarge: { width: "31.5%" },
  formGridRow: { flexDirection: "row", gap: 16 },
  formGridCol: { flex: 1 },
  checkRow: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  checkRowActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF7F7",
  },
  checkboxBase: {
    width: 18,
    height: 18,
    borderRadius: 6,
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
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
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
  // ✅ Ensures the Semester Selection dropdown menu (which floats absolutely)
  // stacks above later sections like "Select Section" instead of behind them.
  semesterRowWrap: { zIndex: 30, position: "relative" },
  sectionBelowDropdown: { zIndex: 1, position: "relative" },
  semesterFieldWrap: { marginBottom: 16, zIndex: 20 },
  floatingDropdownDismiss: { ...StyleSheet.absoluteFillObject, zIndex: 25 },
  floatingDropdownMenu: {
    position: "absolute",
    top: 84,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    shadowColor: "#2B1111",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
    zIndex: 30,
    overflow: "hidden",
  },
  // Icon-less field style (Course Name, Room, schedule time digits) —
  // mirrors TeacherDashboard's plain "DashboardTextField" look.
  plainInputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#F1CACA",
    borderRadius: 16,
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  plainInputWrapFocused: {
    borderColor: "#DC2626",
    borderWidth: 1.5,
  },
  plainInput: {
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
    paddingVertical: 10,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  // ── Class Schedule section ────────────────────────────────────────────
  scheduleBlockCard: {
    borderWidth: 1,
    borderColor: "#F3D4D4",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#FFFBFB",
  },
  scheduleBlockHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scheduleBlockTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2B1111",
  },
  scheduleRemoveBtn: { padding: 4 },
  dayChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  dayChip: {
    minWidth: 42,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  dayChipActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A4A4A",
  },
  dayChipTextActive: { color: "#FFFFFF" },
  scheduleTimeRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  scheduleTimeCol: { flex: 1 },
  timeInputRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  timeInputWrap: { flex: 1 },
  meridiemToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#F1CACA",
    borderRadius: 14,
    backgroundColor: "#FFF9F9",
    overflow: "hidden",
  },
  meridiemBtn: { paddingHorizontal: 12, justifyContent: "center", alignItems: "center" },
  meridiemBtnActive: { backgroundColor: "#DC2626" },
  meridiemBtnText: { fontSize: 12, fontWeight: "800", color: "#B79A9A" },
  meridiemBtnTextActive: { color: "#FFFFFF" },
  addScheduleBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DC2626",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  addScheduleBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 13 },
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
  // Applied alongside inputField when the inner TextInput is focused.
  // Gives a visible highlighted border on the whole rounded container
  // instead of relying on the browser's default (clipped) outline.
  inputFieldFocused: {
    borderColor: "#DC2626",
    borderWidth: 1.5,
  },
  textInput: {
    flex: 1,
    height: "100%",
    marginLeft: 10,
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
    // Remove the native browser focus ring on web so it doesn't clip
    // to the input's own small box; inputFieldFocused handles focus styling.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  descriptionField: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  // Applied alongside descriptionField when the inner multiline TextInput
  // (Course Name / Description, via FormTextArea) is focused. Mirrors
  // inputFieldFocused so all fields — single-line or multiline — share
  // the same highlighted-border behavior.
  descriptionFieldFocused: {
    borderColor: "#DC2626",
    borderWidth: 1.5,
  },
  descriptionInput: {
    minHeight: 100,
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "500",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  uploadBtn: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#F1CACA",
    borderRadius: 16,
    backgroundColor: "#FFF9F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  uploadBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 14 },
  bannerPreview: {
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    position: "relative",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
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
});