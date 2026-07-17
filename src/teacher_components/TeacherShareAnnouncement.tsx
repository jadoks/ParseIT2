import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

// ✅ Reuses the same Toast component used in the Admin ManageStudent screen.
// Adjust this relative path to match where Toast.tsx actually lives
// relative to this file (e.g. "../Final_Admin_Components/Toast").
import Toast from '../Final_Admin_Components/Toast';

export type ShareAnnouncementClassItem = {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  section?: string;
  year?: string;
  semester?: string;
};

type TeacherIdentity = {
  teacherId?: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
};

interface ShareAnnouncementProps {
  apiBaseUrl: string;
  currentTeacher: TeacherIdentity;
  classes: ShareAnnouncementClassItem[];
  onShared?: () => Promise<void> | void;
}

type ToastType = 'success' | 'error' | 'info';

const BACKGROUNDS = [
  { id: 1, image: require('../../assets/images/Banner1.png') },
  { id: 2, image: require('../../assets/images/Banner2.png') },
  { id: 3, image: require('../../assets/images/Banner3.png') },
  { id: 4, image: require('../../assets/images/Banner4.png') },
];

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

const formatDisplayDate = (value: Date | null) => {
  if (!value) return '';
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const year = value.getFullYear();
  return `${month}/${day}/${year}`;
};

const formatDisplayTime = (value: Date | null) => {
  if (!value) return '';
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildExpiryIso = (dateValue: Date | null, timeValue: Date | null) => {
  if (!dateValue || !timeValue) return null;

  const merged = new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate(),
    timeValue.getHours(),
    timeValue.getMinutes(),
    0,
    0
  );

  if (Number.isNaN(merged.getTime())) return null;
  return merged.toISOString();
};

// ─── EXPIRY DATE PICKER COMPONENT ──────────────────────────────────────────────

function ExpiryDateField({
  value,
  onChange,
  isMobile,
  showToast,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  isMobile: boolean;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [showWebModal, setShowWebModal] = useState(false);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempDay, setTempDay] = useState(1);
  const [tempYear, setTempYear] = useState(2000);

  // ✅ FIX: Minimum allowed date is tomorrow at EXACTLY MIDNIGHT
  // This prevents time-of-day comparison bugs when validating the selected date
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const years = Array.from(
    { length: 10 },
    (_, i) => minDate.getFullYear() + i
  );
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    if (value) {
      setTempMonth(value.getMonth());
      setTempDay(value.getDate());
      setTempYear(value.getFullYear());
    } else {
      // Set to tomorrow by default
      const tomorrow = new Date(minDate);
      onChange(tomorrow);
      setTempMonth(tomorrow.getMonth());
      setTempDay(tomorrow.getDate());
      setTempYear(tomorrow.getFullYear());
    }
  }, []);

  const openPicker = () => {
    const baseDate = value || minDate;
    setTempMonth(baseDate.getMonth());
    setTempDay(baseDate.getDate());
    setTempYear(baseDate.getFullYear());

    if (Platform.OS === 'web') {
      setShowWebModal(true);
      return;
    }
    setShowNativePicker(true);
  };

  const handleNativeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') setShowNativePicker(false);
    if (event.type === 'dismissed') return;

    if (selectedDate) {
      // Reset selected date to midnight for fair comparison
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate >= minDate) {
        onChange(selectedDate);
        setTempMonth(selectedDate.getMonth());
        setTempDay(selectedDate.getDate());
        setTempYear(selectedDate.getFullYear());
      }
    }
  };

  const confirmWebDate = () => {
    const selected = new Date(tempYear, tempMonth, tempDay);
    selected.setHours(0, 0, 0, 0); // Ensure midnight comparison

    if (selected >= minDate) {
      onChange(selected);
      setShowWebModal(false);
    } else {
      showToast('Please select a future date.', 'error');
    }
  };

  return (
    <>
      <Text style={styles.fieldLabel}>Expiry Date</Text>
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
          {value ? formatDisplayDate(value) : 'Select date'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#7A7A7A" />
      </TouchableOpacity>

      {/* Native picker (iOS / Android) */}
      {Platform.OS !== 'web' && showNativePicker && (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={value || minDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={minDate}
            onChange={handleNativeChange}
          />

          {Platform.OS === 'ios' && (
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

      {/* Web / fallback modal picker */}
      <Modal
        visible={showWebModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowWebModal(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowWebModal(false)}
          />

          <View style={styles.webDateModalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="calendar-outline" size={22} color="#DC2626" />
                </View>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>Select Expiry Date</Text>
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

            {/* Scrollable columns */}
            <View style={styles.webDateContent}>
              <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                {/* Month */}
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Month</Text>
                  <ScrollView
                    style={styles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {months.map((month, index) => {
                      const active = tempMonth === index;
                      // Disable past months if the current year is the minimum year
                      const disabled = tempYear === minDate.getFullYear() && index < minDate.getMonth();

                      return (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            styles.dropdownItemBorder,
                            disabled && { opacity: 0.4 },
                          ]}
                          activeOpacity={0.85}
                          disabled={disabled}
                          onPress={() => {
                            if (disabled) return;
                            setTempMonth(index);
                            const maxDay = new Date(tempYear, index + 1, 0).getDate();
                            if (tempDay > maxDay) setTempDay(maxDay);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                              disabled && { color: '#9CA3AF' },
                            ]}
                          >
                            {month}
                          </Text>
                          {active && !disabled && (
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Day */}
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Day</Text>
                  <ScrollView
                    style={styles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {days.map((day) => {
                      const active = tempDay === day;
                      // Disable past days and today if the current month/year is the minimum month/year
                      const disabled =
                        tempYear === minDate.getFullYear() &&
                        tempMonth === minDate.getMonth() &&
                        day < minDate.getDate();

                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            styles.dropdownItemBorder,
                            disabled && { opacity: 0.4 },
                          ]}
                          activeOpacity={0.85}
                          disabled={disabled}
                          onPress={() => {
                            if (disabled) return;
                            setTempDay(day);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                              disabled && { color: '#9CA3AF' },
                            ]}
                          >
                            {day}
                          </Text>
                          {active && !disabled && (
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Year */}
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
                            const maxDay = new Date(year, tempMonth + 1, 0).getDate();
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
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Footer */}
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
                onPress={confirmWebDate}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalPrimaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── TIME PICKER COMPONENT ─────────────────────────────────────────────────────

function ExpiryTimeField({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (time: Date) => void;
}) {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [showWebModal, setShowWebModal] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  useEffect(() => {
    if (value) {
      setTempHour(value.getHours());
      setTempMinute(value.getMinutes());
    } else {
      // Default to 9:00 AM
      const now = new Date();
      now.setHours(9, 0, 0, 0);
      onChange(now);
      setTempHour(9);
      setTempMinute(0);
    }
  }, []);

  const openPicker = () => {
    const baseTime = value || new Date();
    setTempHour(baseTime.getHours());
    setTempMinute(baseTime.getMinutes());

    if (Platform.OS === 'web') {
      setShowWebModal(true);
      return;
    }
    setShowNativePicker(true);
  };

  const handleNativeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) => {
    if (Platform.OS === 'android') setShowNativePicker(false);
    if (event.type === 'dismissed') return;

    if (selectedTime) {
      onChange(selectedTime);
      setTempHour(selectedTime.getHours());
      setTempMinute(selectedTime.getMinutes());
    }
  };

  const confirmWebTime = () => {
    const selected = new Date();
    selected.setHours(tempHour, tempMinute, 0, 0);
    onChange(selected);
    setShowWebModal(false);
  };

  return (
    <>
      <Text style={styles.fieldLabel}>Expiry Time</Text>
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
          {value ? formatDisplayTime(value) : 'Select time'}
        </Text>
        <Ionicons name="time-outline" size={18} color="#7A7A7A" />
      </TouchableOpacity>

      {/* Native picker (iOS / Android) */}
      {Platform.OS !== 'web' && showNativePicker && (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={value || new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleNativeChange}
          />

          {Platform.OS === 'ios' && (
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

      {/* Web / fallback modal picker */}
      <Modal
        visible={showWebModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowWebModal(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowWebModal(false)}
          />

          <View style={styles.webDateModalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="time-outline" size={22} color="#DC2626" />
                </View>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>Select Expiry Time</Text>
                  <Text style={styles.modalSubtitle}>
                    Choose hour and minute.
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

            {/* Scrollable columns */}
            <View style={styles.webDateContent}>
              <View style={styles.modalRow}>
                {/* Hour */}
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Hour</Text>
                  <ScrollView
                    style={styles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {hours.map((hour) => {
                      const active = tempHour === hour;
                      return (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            styles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setTempHour(hour)}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                            ]}
                          >
                            {hour.toString().padStart(2, '0')}
                          </Text>
                          {active && (
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Minute */}
                <View style={styles.modalCol}>
                  <Text style={styles.fieldLabel}>Minute</Text>
                  <ScrollView
                    style={styles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {minutes.map((minute) => {
                      const active = tempMinute === minute;
                      return (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.dropdownItem,
                            active && styles.dropdownItemActive,
                            styles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setTempMinute(minute)}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              active && styles.dropdownItemTextActive,
                            ]}
                          >
                            {minute.toString().padStart(2, '0')}
                          </Text>
                          {active && (
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Footer */}
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
                onPress={confirmWebTime}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalPrimaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function ShareAnnouncement({
  apiBaseUrl,
  currentTeacher,
  classes = [],
  onShared,
}: ShareAnnouncementProps) {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;

  const [selectedBg, setSelectedBg] = useState(4);
  const [header, setHeader] = useState('');
  const [description, setDescription] = useState('');

  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  const [isHeaderFocused, setIsHeaderFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);

  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectAllClasses, setSelectAllClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Toast state (same shape/pattern as Admin's ManageStudent screen)
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const teacherName = useMemo(() => {
    const first = currentTeacher?.firstName?.trim() || '';
    const last = currentTeacher?.lastName?.trim() || '';
    return `${first} ${last}`.trim() || 'Teacher';
  }, [currentTeacher]);

  const availableClasses = useMemo(() => {
    return classes.map((course) => ({
      id: course.id,
      label: `${course.classCode} - ${course.name}`,
      subtitle: [course.section, course.year, course.semester]
        .filter(Boolean)
        .join(' • '),
    }));
  }, [classes]);

  const selectedClasses = useMemo(() => {
    return availableClasses.filter((course) => selectedClassIds.includes(course.id));
  }, [availableClasses, selectedClassIds]);

  const resetTargeting = () => {
    setSelectedClassIds([]);
    setSelectAllClasses(false);
  };

  const resetAll = () => {
    setHeader('');
    setDescription('');
    setExpiryDate(null);
    setExpiryTime(null);
    setSelectedBg(4);
    resetTargeting();
  };

  const handleOpenTargetAudience = () => {
    const trimmedHeader = header.trim();
    const trimmedDesc = description.trim();

    if (!trimmedHeader || !trimmedDesc || !expiryDate || !expiryTime) {
      showToast(
        'Please complete header, description, expiry date, and expiry time.',
        'error'
      );
      return;
    }

    const expiresAt = buildExpiryIso(expiryDate, expiryTime);

    if (!expiresAt) {
      showToast('Please enter a valid expiry date and time.', 'error');
      return;
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      showToast('Please choose a future date and time.', 'error');
      return;
    }

    if (!availableClasses.length) {
      showToast('There are no created classes available yet.', 'error');
      return;
    }

    setShowTargetModal(true);
  };

  const toggleAllClasses = () => {
    const next = !selectAllClasses;
    setSelectAllClasses(next);
    setSelectedClassIds(next ? availableClasses.map((item) => item.id) : []);
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const alreadySelected = prev.includes(classId);
      const nextSelected = alreadySelected
        ? prev.filter((id) => id !== classId)
        : [...prev, classId];

      setSelectAllClasses(
        availableClasses.length > 0 && nextSelected.length === availableClasses.length
      );

      return nextSelected;
    });
  };

  const handleDirectShare = async () => {
    try {
      const trimmedHeader = header.trim();
      const trimmedDesc = description.trim();
      const expiresAt = buildExpiryIso(expiryDate, expiryTime);

      if (!expiresAt) {
        showToast('Please enter a valid expiry date and time.', 'error');
        return;
      }

      const targetClassIds = selectAllClasses
        ? availableClasses.map((item) => item.id)
        : selectedClassIds;

      if (!targetClassIds.length) {
        showToast('Please select a class or choose All Classes.', 'error');
        return;
      }

      setIsSubmitting(true);

      const response = await fetch(`${apiBaseUrl}/create-class-announcement`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: targetClassIds,
          title: trimmedHeader,
          message: trimmedDesc,
          bannerKey: selectedBg,
          expiresAt,
          postedByUid: currentTeacher?.authUid || currentTeacher?.teacherId || null,
          postedByName: teacherName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to share announcement.');
      }

      setShowTargetModal(false);

      showToast(
        selectAllClasses || targetClassIds.length > 1
          ? `Announcement shared successfully to ${targetClassIds.length} classes!`
          : `Announcement shared successfully to ${selectedClasses[0]?.label || 'the selected class'}!`,
        'success'
      );

      await onShared?.();
      resetAll();
    } catch (error: any) {
      showToast(
        error?.message || 'Unable to share announcement.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCheckboxRow = (
    label: string,
    checked: boolean,
    onPress: () => void,
    subtitle?: string,
    compact = false
  ) => (
    <TouchableOpacity
      style={[
        compact ? styles.compactCheckRow : styles.checkRow,
        checked && styles.checkRowActive,
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.checkboxBase, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
      </View>

      <View style={styles.checkTextWrapper}>
        <Text style={compact ? styles.compactCheckText : styles.checkText}>
          {label}
        </Text>
        {!!subtitle && <Text style={styles.checkSubText}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={
            isMobile
              ? styles.mobileContentContainer
              : styles.webContentContainer
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSpacer} />

          <Text
            style={[
              styles.formTitle,
              { fontSize: isMobile ? 28 : 40 },
            ]}
          >
            Share an Announcement.
          </Text>

          <Text style={styles.formSubTitle}>
            Announcement will be available to selected classes.
          </Text>

          <View
            style={[
              styles.inputOutlineBox,
              isHeaderFocused && styles.inputOutlineBoxFocused,
            ]}
          >
            <Text style={styles.innerLabel}>Header</Text>
            <TextInput
              style={styles.nakedInput}
              value={header}
              onChangeText={setHeader}
              onFocus={() => setIsHeaderFocused(true)}
              onBlur={() => setIsHeaderFocused(false)}
              underlineColorAndroid="transparent"
              placeholder="Enter announcement header"
              placeholderTextColor="#999"
            />
          </View>

          <View
            style={[
              styles.inputOutlineBox,
              isDescFocused && styles.inputOutlineBoxFocused,
            ]}
          >
            <Text style={styles.innerLabel}>Description</Text>
            <TextInput
              style={[styles.nakedInput, styles.descriptionInput]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              onFocus={() => setIsDescFocused(true)}
              onBlur={() => setIsDescFocused(false)}
              underlineColorAndroid="transparent"
              placeholder="Enter announcement description"
              placeholderTextColor="#999"
            />
          </View>

          {/* ─── CUSTOM DATE & TIME FIELDS ─── */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeBox}>
              <ExpiryDateField
                value={expiryDate}
                onChange={setExpiryDate}
                isMobile={isMobile}
                showToast={showToast}
              />
            </View>

            <View style={styles.dateTimeBox}>
              <ExpiryTimeField
                value={expiryTime}
                onChange={setExpiryTime}
              />
            </View>
          </View>

          <View style={styles.selectorOutlineBox}>
            <Text style={styles.innerLabel}>Select Background Banner</Text>

            <View style={styles.bgGrid}>
              {BACKGROUNDS.map((bg) => (
                <TouchableOpacity
                  key={bg.id}
                  onPress={() => setSelectedBg(bg.id)}
                  style={[
                    styles.bgOption,
                    selectedBg === bg.id && styles.bgOptionSelected,
                  ]}
                  activeOpacity={0.85}
                >
                  <Image source={bg.image} style={styles.bgImage} />
                  {selectedBg === bg.id && (
                    <View style={styles.checkOverlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleOpenTargetAudience}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Processing...' : 'Proceed'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent
        visible={showTargetModal}
        onRequestClose={() => setShowTargetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.targetModalCard,
              isMobile && styles.targetModalCardMobile,
            ]}
          >
            <View style={styles.targetModalHeader}>
              <Text style={styles.targetModalTitle}>Select Target Audience</Text>
              <TouchableOpacity
                onPress={() => setShowTargetModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#222" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.targetModalScrollContent}
            >
              <View style={styles.targetSection}>
                <Text style={styles.targetSectionTitle}>Audience</Text>

                {renderCheckboxRow(
                  'All Classes',
                  selectAllClasses,
                  toggleAllClasses
                )}
              </View>

              <View style={styles.targetSection}>
                <Text style={styles.targetSectionTitle}>Created Classes</Text>

                {availableClasses.length ? (
                  availableClasses.map((course) =>
                    renderCheckboxRow(
                      course.label,
                      selectedClassIds.includes(course.id),
                      () => toggleClass(course.id),
                      course.subtitle,
                      true
                    )
                  )
                ) : (
                  <View style={styles.emptyClassesBox}>
                    <Text style={styles.emptyClassesText}>
                      No created classes available.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={() => setShowTargetModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, isSubmitting && styles.submitBtnDisabled]}
                activeOpacity={0.8}
                onPress={handleDirectShare}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmBtnText}>
                  {isSubmitting ? 'Sharing...' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1 },
  mobileContentContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
  webContentContainer: { flexGrow: 1, paddingLeft: 25, paddingRight: 120, paddingTop: 10, paddingBottom: 32 },
  headerSpacer: { height: 10, marginBottom: 20 },
  formTitle: { fontWeight: 'bold', color: '#000', fontFamily, letterSpacing: -0.5 },
  formSubTitle: { fontSize: 14, color: '#444', marginBottom: 30, fontFamily },

  inputOutlineBox: { borderWidth: 1.5, borderColor: '#718096', borderRadius: 8, padding: 12, marginBottom: 20, backgroundColor: '#FFF' },
  inputOutlineBoxFocused: { borderColor: '#000' },
  innerLabel: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 5, fontFamily },
  nakedInput: { fontSize: 14, color: '#222', padding: 0, margin: 0, fontFamily, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  descriptionInput: { height: 80 },

  dateTimeRow: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  dateTimeBox: { flex: 1, minWidth: 220 },

  selectorOutlineBox: { borderWidth: 1.5, borderColor: '#718096', borderRadius: 8, padding: 15, marginBottom: 35, backgroundColor: '#FFF' },
  bgGrid: { marginTop: 10 },
  bgOption: { width: '100%', height: 80, borderRadius: 8, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  bgOptionSelected: { borderColor: '#B71C1C', borderWidth: 3 },
  bgImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  checkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(183, 28, 28, 0.3)', justifyContent: 'center', alignItems: 'center' },

  submitBtn: { backgroundColor: '#B71C1C', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 40 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', fontFamily },

  // Target Audience Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.18)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  targetModalCard: { width: '100%', maxWidth: 520, maxHeight: '88%', backgroundColor: '#FFF', borderRadius: 18, padding: 20 },
  targetModalCardMobile: { maxHeight: '92%' },
  targetModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  targetModalTitle: { fontSize: 22, fontWeight: '700', color: '#222', fontFamily },
  targetModalScrollContent: { paddingBottom: 12 },
  targetSection: { marginBottom: 18 },
  targetSectionTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 10, fontFamily },

  checkRow: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5CACA', backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  compactCheckRow: { minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: '#E5CACA', backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, marginBottom: 7 },
  checkRowActive: { borderColor: '#D32F2F', backgroundColor: '#FFF7F7' },
  checkboxBase: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#D8B4B4', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  checkTextWrapper: { flex: 1 },
  checkText: { fontSize: 13, fontWeight: '600', color: '#202124', fontFamily },
  compactCheckText: { fontSize: 13, fontWeight: '700', color: '#202124', fontFamily },
  checkSubText: { marginTop: 2, fontSize: 11.5, color: '#6B7280', fontFamily },

  emptyClassesBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 16, paddingHorizontal: 14, backgroundColor: '#FAFAFA' },
  emptyClassesText: { color: '#6B7280', fontSize: 13, textAlign: 'center', fontFamily },

  modalButtonRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: '700', fontSize: 14, fontFamily },
  confirmBtn: { flex: 1, backgroundColor: '#B71C1C', paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14, fontFamily },

  // ─── DATE/TIME PICKER STYLES ───────────────────────────────────────────────────
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  selectField: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectFieldText: { fontSize: 16, fontWeight: '400', color: '#111827', flex: 1, marginRight: 10 },
  placeholderSelectText: { color: '#9E9E9E' },

  datePickerWrap: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', overflow: 'hidden' },
  datePickerActions: { paddingHorizontal: 14, paddingBottom: 14, alignItems: 'flex-end' },
  datePickerButtonSecondary: { minWidth: 88, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#E7C0C0', backgroundColor: '#FFF7F7', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  datePickerButtonSecondaryText: { fontSize: 13, fontWeight: '700', color: '#7A4A4A' },

  // ✅ RENAMED to avoid duplicate key error
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(43, 17, 17, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },

  webDateModalCard: { width: '100%', maxWidth: 860, maxHeight: '88%', backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#F3D4D4', overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#F8E3E3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalHeaderLeft: { flex: 1, flexDirection: 'row', paddingRight: 16 },
  modalHeaderTextWrap: { flex: 1 },
  modalIconBox: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#2B1111', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, lineHeight: 21, color: '#8A6F6F' },
  modalCloseButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center' },

  webDateContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  modalRow: { flexDirection: 'row', gap: 14, marginBottom: 22, zIndex: 20 },
  modalRowStack: { flexDirection: 'column', gap: 14 },
  modalCol: { flex: 1 },

  webDateList: { maxHeight: 260, borderRadius: 16, borderWidth: 1, borderColor: '#F1CACA', backgroundColor: '#FFF9F9' },
  dropdownItem: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#FAE9E9' },
  dropdownItemActive: { backgroundColor: '#FFF7F7' },
  dropdownItemText: { flex: 1, fontSize: 14, color: '#5F3B3B', fontWeight: '600', paddingRight: 10 },
  dropdownItemTextActive: { color: '#DC2626', fontWeight: '700' },

  modalFooter: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 22, borderTopWidth: 1, borderTopColor: '#F8E3E3', flexDirection: 'row', justifyContent: 'flex-end' },
  modalSecondaryButton: { height: 48, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: '#E7C0C0', backgroundColor: '#FFF7F7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalSecondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#7A4A4A' },
  modalPrimaryButton: { height: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  modalPrimaryButtonText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginLeft: 8 },
});