import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
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

function formatDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function parseDateString(value?: string | null): Date | null {
  if (!value) return null;

  const parts = value.split("/");
  if (parts.length !== 3) return null;

  const [month, day, year] = parts.map(Number);
  if (!month || !day || !year) return null;

  return new Date(year, month - 1, day);
}

export type AddStudentModalInitialData = {
  id?: string;
  studentId?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string | null;
  email?: string;
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
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
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
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
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
    if (Platform.OS === "android") setShowNativePicker(false);
    if (event.type === "dismissed") return;

    if (selectedDate) {
      onChange(selectedDate);
      setTempMonth(selectedDate.getMonth());
      setTempDay(selectedDate.getDate());
      setTempYear(selectedDate.getFullYear());
    }
  };

  const confirmWebBirthday = () => {
    onChange(new Date(tempYear, tempMonth, tempDay));
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

export default function AddStudentModal({
  visible,
  onClose,
  isMobile,
  onSubmitStudent,
  initialData,
  isEditMode = false,
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
  }) => void | Promise<void>;
  initialData?: AddStudentModalInitialData | null;
  isEditMode?: boolean;
}) {
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [email, setEmail] = useState("");

  const resetForm = () => {
    setStudentId("");
    setFirstName("");
    setLastName("");
    setBirthday(null);
    setEmail("");
  };

  useEffect(() => {
    if (!visible) return;

    if (isEditMode && initialData) {
      setStudentId(initialData.studentId || "");
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setBirthday(parseDateString(initialData.birthday));
      setEmail(initialData.email || "");

      return;
    }

    resetForm();
  }, [visible, isEditMode, initialData]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const payload = {
      studentId,
      firstName,
      lastName,
      birthday: birthday ? formatDate(birthday) : "",
      email,
    };

    try {
      if (onSubmitStudent) {
        await onSubmitStudent(payload);
      } else {
        console.log("Student ID:", payload.studentId);
        console.log("First Name:", payload.firstName);
        console.log("Last Name:", payload.lastName);
        console.log("Birthday:", payload.birthday);
        console.log("Email Address:", payload.email);
      }

      handleClose();
    } catch (error) {
      console.error("Error submitting student:", error);
    }
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
                <Text style={styles.modalTitle}>
                  {isEditMode ? "Edit Student" : "Add Student"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditMode
                    ? "Update student details with the current values already filled in."
                    : "Add a new student by filling in the required profile details below."}
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
                  <FormInput
                    icon="card-outline"
                    value={studentId}
                    onChangeText={setStudentId}
                    placeholder="Enter student ID"
                  />
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <FormInput
                    icon="person-outline"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter first name"
                  />
                </View>
              </View>

              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <FormInput
                    icon="people-outline"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter last name"
                  />
                </View>

                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <FormInput
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
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
                name={
                  isEditMode ? "create-outline" : "checkmark-circle-outline"
                }
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.modalPrimaryButtonText}>
                {isEditMode ? "Update Student" : "Add Student"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    overflow: "hidden",
  },

  datePickerActions: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    alignItems: "flex-end",
  },

  datePickerButtonSecondary: {
    minWidth: 88,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7C0C0",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  datePickerButtonSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A4A4A",
  },

  webDateModalCard: {
    width: "100%",
    maxWidth: 860,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
  },

  webDateContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },

  webDateList: {
    maxHeight: 260,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
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
});