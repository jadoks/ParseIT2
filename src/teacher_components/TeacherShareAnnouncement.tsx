import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

// ✅ Shape of an announcement as returned by the backend
// (GET /teacher-announcements/:teacherUid, POST/PUT/DELETE ...-class-announcement).
export type TeacherAnnouncementItem = {
  id: string;
  title: string;
  message: string;
  bannerKey?: number;
  expiresAt?: any;
  classIds?: string[];
  postedByUid?: string | null;
  postedByName?: string;
  createdAt?: any;
  updatedAt?: any;
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

// ✅ Safely turns an expiresAt value into a Date, handling every shape it
// can arrive in:
//  - a real Firestore Timestamp instance (has .toDate()) — e.g. server-side
//  - the JSON-serialized form of a Firestore Timestamp once it's crossed
//    res.json(): { _seconds, _nanoseconds } (or { seconds, nanoseconds })
//  - a plain ISO string / number
const toDateSafe = (value?: any): Date | null => {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === 'number') {
    const nanoseconds = value?._nanoseconds ?? value?.nanoseconds ?? 0;
    const parsed = new Date(seconds * 1000 + Math.round(nanoseconds / 1e6));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// ✅ Whether an announcement's expiry has already passed.
const isAnnouncementExpired = (value?: any) => {
  const parsed = toDateSafe(value);
  if (!parsed) return false;
  return parsed.getTime() <= Date.now();
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
  const [showDateModal, setShowDateModal] = useState(false);
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

  // Same custom Month/Day/Year modal is used on every platform now, so
  // opening the picker just shows this component's own modal — no more
  // branching to the native @react-native-community/datetimepicker
  // spinner on iOS/Android.
  const openPicker = () => {
    const baseDate = value || minDate;
    setTempMonth(baseDate.getMonth());
    setTempDay(baseDate.getDate());
    setTempYear(baseDate.getFullYear());
    setShowDateModal(true);
  };

  const confirmDate = () => {
    const selected = new Date(tempYear, tempMonth, tempDay);
    selected.setHours(0, 0, 0, 0); // Ensure midnight comparison

    if (selected >= minDate) {
      onChange(selected);
      setShowDateModal(false);
    } else {
      showToast('Please select a future date.', 'error');
    }
  };

  // ─── Reusable column renderers (shared by desktop row / mobile scroll stack) ──

  const renderMonthColumn = () => (
    <View style={styles.modalCol}>
      <Text style={styles.fieldLabel}>Month</Text>
      <ScrollView
        style={[styles.webDateList, isMobile && styles.webDateListMobile]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
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
  );

  const renderDayColumn = () => (
    <View style={styles.modalCol}>
      <Text style={styles.fieldLabel}>Day</Text>
      <ScrollView
        style={[styles.webDateList, isMobile && styles.webDateListMobile]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
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
  );

  const renderYearColumn = () => (
    <View style={styles.modalCol}>
      <Text style={styles.fieldLabel}>Year</Text>
      <ScrollView
        style={[styles.webDateList, isMobile && styles.webDateListMobile]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
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
  );

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

      {/* Custom Date picker modal — same component on web, iOS, and Android */}
      <Modal
        visible={showDateModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDateModal(false)}
          />

          <View
            style={[
              styles.webDateModalCard,
              isMobile && styles.webDateModalCardMobile,
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconBox,
                    isMobile && styles.modalIconBoxMobile,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={isMobile ? 18 : 22}
                    color="#DC2626"
                  />
                </View>
                <View style={styles.modalHeaderTextWrap}>
                  <Text
                    style={[
                      styles.modalTitle,
                      isMobile && styles.modalTitleMobile,
                    ]}
                  >
                    Select Expiry Date
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      isMobile && styles.modalSubtitleMobile,
                    ]}
                  >
                    Choose month, day, and year.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDateModal(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            {/* Scrollable columns */}
            <View
              style={[
                styles.webDateContent,
                isMobile && styles.webDateContentMobile,
              ]}
            >
              {isMobile ? (
                // ✅ On mobile: Month sits full-width on its own row, and
                // Day + Year sit side by side in the row below. Wrapping
                // everything in a ScrollView (capped height) keeps the
                // footer (Cancel/Apply) always reachable instead of being
                // pushed off-screen.
                <ScrollView
                  style={styles.mobileColumnsScroll}
                  contentContainerStyle={styles.mobileColumnsStack}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled
                >
                  <View style={styles.mobileMonthRow}>
                    {renderMonthColumn()}
                  </View>
                  <View style={styles.mobileDayYearRow}>
                    {renderDayColumn()}
                    {renderYearColumn()}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.modalRow}>
                  {renderMonthColumn()}
                  {renderDayColumn()}
                  {renderYearColumn()}
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowDateModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                activeOpacity={0.85}
                onPress={confirmDate}
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

// ─── MERGED "TIME" INPUT (typed HH:MM digits + AM/PM) ─────────────────────────
// Same single-field pattern used elsewhere (Teacher Dashboard's Create Class
// schedule blocks, TeacherCourseDetail2's due date/time picker) instead of
// separate scrollable Hour / Minute lists.
const clampTimeInputDigits = (raw: string): string => {
  let out = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (out.length >= 2) {
    let hh = parseInt(out.slice(0, 2), 10);
    if (Number.isNaN(hh)) hh = 0;
    if (hh > 12) hh = 12;
    if (hh < 1 && out.length >= 2) hh = 1;
    out = String(hh).padStart(2, '0') + out.slice(2);
  }
  if (out.length >= 4) {
    let mm = parseInt(out.slice(2, 4), 10);
    if (Number.isNaN(mm)) mm = 0;
    if (mm > 59) mm = 59;
    out = out.slice(0, 2) + String(mm).padStart(2, '0');
  }
  return out;
};

const formatTimeInputDigitsForDisplay = (digits: string): string =>
  digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;

// Typed 12-hour digits ("0930") + AM/PM -> 24-hour { hour, minute }, or null
// while the typed value is incomplete/invalid.
const timeInputDigitsAndMeridiemToHourMinute = (
  digits: string,
  meridiem: 'AM' | 'PM'
): { hour: number; minute: number } | null => {
  if (digits.length !== 4) return null;
  const hour12 = parseInt(digits.slice(0, 2), 10);
  const minute = parseInt(digits.slice(2, 4), 10);
  if (Number.isNaN(hour12) || Number.isNaN(minute) || hour12 < 1 || hour12 > 12 || minute > 59) return null;
  let hour = hour12 % 12;
  if (meridiem === 'PM') hour += 12;
  return { hour, minute };
};

// 24-hour { hour, minute } -> typed 12-hour digits + AM/PM, so opening the
// picker on an existing time shows the right starting value.
const hourMinuteToTimeInputDigits = (hour: number, minute: number): { digits: string; meridiem: 'AM' | 'PM' } => {
  const meridiem: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;
  return { digits: `${String(hour12).padStart(2, '0')}${String(minute).padStart(2, '0')}`, meridiem };
};

// Single merged "Time" field: one text input for HH:MM digits plus an
// AM/PM toggle, replacing separate scrollable Hour / Minute columns.
function MergedTimeInput({
  hour,
  minute,
  onChangeHourMinute,
}: {
  hour: number;
  minute: number;
  onChangeHourMinute: (hour: number, minute: number) => void;
}) {
  const initial = hourMinuteToTimeInputDigits(hour, minute);
  const [digits, setDigits] = useState(initial.digits);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(initial.meridiem);
  const [isFocused, setIsFocused] = useState(false);

  // Keep the typed value in sync if the parent's hour/minute changes from
  // elsewhere (e.g. reopening the modal).
  useEffect(() => {
    const next = hourMinuteToTimeInputDigits(hour, minute);
    setDigits(next.digits);
    setMeridiem(next.meridiem);
  }, [hour, minute]);

  const commit = (nextDigits: string, nextMeridiem: 'AM' | 'PM') => {
    const result = timeInputDigitsAndMeridiemToHourMinute(nextDigits, nextMeridiem);
    if (result) onChangeHourMinute(result.hour, result.minute);
  };

  const handleChangeText = (text: string) => {
    const clamped = clampTimeInputDigits(text);
    setDigits(clamped);
    commit(clamped, meridiem);
  };

  const handleMeridiemPress = (nextMeridiem: 'AM' | 'PM') => {
    setMeridiem(nextMeridiem);
    commit(digits, nextMeridiem);
  };

  return (
    <View style={styles.timeInputRow}>
      <View style={[styles.timeTextInputWrap, isFocused && styles.timeTextInputWrapFocused]}>
        <TextInput
          value={formatTimeInputDigitsForDisplay(digits)}
          onChangeText={handleChangeText}
          placeholder="09:30"
          placeholderTextColor="#9AA0A6"
          keyboardType="number-pad"
          maxLength={5}
          style={styles.timeTextInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      <View style={styles.meridiemToggle}>
        <TouchableOpacity
          style={[styles.meridiemBtn, meridiem === 'AM' && styles.meridiemBtnActive]}
          onPress={() => handleMeridiemPress('AM')}
        >
          <Text style={[styles.meridiemBtnText, meridiem === 'AM' && styles.meridiemBtnTextActive]}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.meridiemBtn, meridiem === 'PM' && styles.meridiemBtnActive]}
          onPress={() => handleMeridiemPress('PM')}
        >
          <Text style={[styles.meridiemBtnText, meridiem === 'PM' && styles.meridiemBtnTextActive]}>PM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExpiryTimeField({
  value,
  onChange,
  isMobile,
}: {
  value: Date | null;
  onChange: (time: Date) => void;
  isMobile: boolean;
}) {
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);

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

  // Same custom Time field (typed HH:MM + AM/PM) is used on every platform
  // now, so opening the picker just shows this component's own modal —
  // no more branching to the native @react-native-community/datetimepicker
  // spinner on iOS/Android.
  const openPicker = () => {
    const baseTime = value || new Date();
    setTempHour(baseTime.getHours());
    setTempMinute(baseTime.getMinutes());
    setShowTimeModal(true);
  };

  const confirmTime = () => {
    const selected = new Date();
    selected.setHours(tempHour, tempMinute, 0, 0);
    onChange(selected);
    setShowTimeModal(false);
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

      {/* Custom Time picker modal — same component on web, iOS, and Android */}
      <Modal
        visible={showTimeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowTimeModal(false)}
          />

          <View
            style={[
              styles.webDateModalCard,
              styles.webTimeModalCard,
              isMobile && styles.webDateModalCardMobile,
            ]}
          >
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
                onPress={() => setShowTimeModal(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            {/* Merged Time field (typed HH:MM + AM/PM) */}
            <View style={styles.webDateContent}>
              <Text style={styles.fieldLabel}>Time</Text>
              <MergedTimeInput
                hour={tempHour}
                minute={tempMinute}
                onChangeHourMinute={(hour, minute) => {
                  setTempHour(hour);
                  setTempMinute(minute);
                }}
              />
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowTimeModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                activeOpacity={0.85}
                onPress={confirmTime}
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
  const isLargeScreen = width >= 1024;

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

  // ─── "See All Announcements" (manage: edit/delete) state ───
  const [showManageModal, setShowManageModal] = useState(false);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [myAnnouncements, setMyAnnouncements] = useState<TeacherAnnouncementItem[]>([]);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<TeacherAnnouncementItem | null>(null);
  const [editHeader, setEditHeader] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState<Date | null>(null);
  const [editExpiryTime, setEditExpiryTime] = useState<Date | null>(null);
  const [editBg, setEditBg] = useState(4);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditAudienceModal, setShowEditAudienceModal] = useState(false);
  const [editSelectedClassIds, setEditSelectedClassIds] = useState<string[]>([]);
  const [editSelectAllClasses, setEditSelectAllClasses] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<TeacherAnnouncementItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // ✅ Identifier used to look up "my" announcements on the backend.
  const teacherUid = currentTeacher?.authUid || currentTeacher?.teacherId || null;

  // ✅ Maps a classId -> readable label so the manage list can show
  // "Shared to: CS101 - Intro to Programming" instead of raw ids.
  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((course) => {
      map[course.id] = `${course.classCode} - ${course.name}`;
    });
    return map;
  }, [classes]);

  const getClassNames = (ids?: string[]) => {
    if (!ids || !ids.length) return 'No classes';
    return ids.map((id) => classNameById[id] || id).join(', ');
  };

  // ─── FETCH: "See All My Announcements" ───
  const fetchMyAnnouncements = async () => {
    if (!teacherUid) {
      setAnnouncementsError('Unable to identify your teacher account.');
      setIsLoadingAnnouncements(false);
      return;
    }

    try {
      setIsLoadingAnnouncements(true);
      setAnnouncementsError(null);

      const response = await fetch(`${apiBaseUrl}/teacher-announcements/${teacherUid}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load your announcements.');
      }

      setMyAnnouncements(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setAnnouncementsError(error?.message || 'Unable to load your announcements.');
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const openManageModal = () => {
    setShowManageModal(true);
    fetchMyAnnouncements();
  };

  // ─── EDIT ───
  const openEditModal = (item: TeacherAnnouncementItem) => {
    const expiry = toDateSafe(item.expiresAt);
    const itemClassIds = Array.isArray(item.classIds) ? item.classIds : [];

    setEditTarget(item);
    setEditHeader(item.title || '');
    setEditDescription(item.message || '');
    setEditExpiryDate(expiry);
    setEditExpiryTime(expiry);
    setEditBg(item.bannerKey || 4);
    setEditSelectedClassIds(itemClassIds);
    setEditSelectAllClasses(
      availableClasses.length > 0 && itemClassIds.length === availableClasses.length
    );
  };

  const closeEditModal = () => {
    if (isUpdating) return;
    setEditTarget(null);
    setShowEditAudienceModal(false);
  };

  const toggleEditAllClasses = () => {
    const next = !editSelectAllClasses;
    setEditSelectAllClasses(next);
    setEditSelectedClassIds(next ? availableClasses.map((item) => item.id) : []);
  };

  const toggleEditClass = (classId: string) => {
    setEditSelectedClassIds((prev) => {
      const alreadySelected = prev.includes(classId);
      const nextSelected = alreadySelected
        ? prev.filter((id) => id !== classId)
        : [...prev, classId];

      setEditSelectAllClasses(
        availableClasses.length > 0 && nextSelected.length === availableClasses.length
      );

      return nextSelected;
    });
  };

  const editSelectedClasses = useMemo(() => {
    return availableClasses.filter((course) => editSelectedClassIds.includes(course.id));
  }, [availableClasses, editSelectedClassIds]);

  const handleUpdateAnnouncement = async () => {
    if (!editTarget) return;

    const trimmedHeader = editHeader.trim();
    const trimmedDesc = editDescription.trim();

    if (!trimmedHeader || !trimmedDesc || !editExpiryDate || !editExpiryTime) {
      showToast(
        'Please complete header, description, expiry date, and expiry time.',
        'error'
      );
      return;
    }

    const expiresAt = buildExpiryIso(editExpiryDate, editExpiryTime);

    if (!expiresAt) {
      showToast('Please enter a valid expiry date and time.', 'error');
      return;
    }

    const targetClassIds = editSelectAllClasses
      ? availableClasses.map((item) => item.id)
      : editSelectedClassIds;

    if (!targetClassIds.length) {
      showToast('Please select at least one class, or choose All Classes.', 'error');
      return;
    }

    try {
      setIsUpdating(true);

      const response = await fetch(
        `${apiBaseUrl}/update-class-announcement/${editTarget.id}`,
        {
          credentials: 'include',
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trimmedHeader,
            message: trimmedDesc,
            bannerKey: editBg,
            expiresAt,
            classIds: targetClassIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update announcement.');
      }

      showToast('Announcement updated successfully!', 'success');
      setEditTarget(null);
      setShowEditAudienceModal(false);
      await fetchMyAnnouncements();
    } catch (error: any) {
      showToast(error?.message || 'Unable to update announcement.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── DELETE ───
  const confirmDeleteAnnouncement = (item: TeacherAnnouncementItem) => {
    setDeleteTarget(item);
  };

  const cancelDeleteAnnouncement = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  const handleDeleteAnnouncement = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        `${apiBaseUrl}/delete-class-announcement/${deleteTarget.id}`,
        {
          credentials: 'include',
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete announcement.');
      }

      showToast('Announcement deleted successfully!', 'success');
      setDeleteTarget(null);
      await fetchMyAnnouncements();
    } catch (error: any) {
      showToast(error?.message || 'Unable to delete announcement.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

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
              : [styles.webContentContainer, isLargeScreen && styles.webContentContainerLarge]
          }
          showsVerticalScrollIndicator={true}
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

          <TouchableOpacity
            style={styles.manageLink}
            activeOpacity={0.8}
            onPress={openManageModal}
          >
            <Ionicons name="megaphone-outline" size={18} color="#B71C1C" />
            <Text style={styles.manageLinkText}>See All My Announcements</Text>
            <Ionicons name="chevron-forward" size={16} color="#B71C1C" />
          </TouchableOpacity>

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
                isMobile={isMobile}
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
              showsVerticalScrollIndicator={true}
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

      {/* ─── "SEE ALL MY ANNOUNCEMENTS" MODAL ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={showManageModal}
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.manageModalCard,
              isMobile && styles.manageModalCardMobile,
            ]}
          >
            <View style={styles.targetModalHeader}>
              <Text style={styles.targetModalTitle}>My Announcements</Text>
              <TouchableOpacity
                onPress={() => setShowManageModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#222" />
              </TouchableOpacity>
            </View>

            {isLoadingAnnouncements ? (
              <View style={styles.manageStateBox}>
                <ActivityIndicator size="large" color="#B71C1C" />
                <Text style={styles.manageStateText}>
                  Loading your announcements...
                </Text>
              </View>
            ) : announcementsError ? (
              <View style={styles.manageStateBox}>
                <Ionicons name="alert-circle-outline" size={30} color="#B71C1C" />
                <Text style={styles.manageStateText}>{announcementsError}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  activeOpacity={0.85}
                  onPress={fetchMyAnnouncements}
                >
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : myAnnouncements.length === 0 ? (
              <View style={styles.manageStateBox}>
                <Ionicons name="megaphone-outline" size={30} color="#9CA3AF" />
                <Text style={styles.manageStateText}>
                  You haven't created any announcements yet.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.manageListContent}
              >
                {myAnnouncements.map((item) => {
                  const expired = isAnnouncementExpired(item.expiresAt);
                  const expiryDateObj = toDateSafe(item.expiresAt);

                  return (
                    <View key={item.id} style={styles.manageItemCard}>
                      <View style={styles.manageItemHeaderRow}>
                        <Text style={styles.manageItemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View
                          style={[
                            styles.statusPill,
                            expired ? styles.statusPillExpired : styles.statusPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              expired
                                ? styles.statusPillTextExpired
                                : styles.statusPillTextActive,
                            ]}
                          >
                            {expired ? 'Expired' : 'Active'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.manageItemMessage} numberOfLines={3}>
                        {item.message}
                      </Text>

                      <Text style={styles.manageItemMeta} numberOfLines={2}>
                        Shared to: {getClassNames(item.classIds)}
                      </Text>

                      {!!expiryDateObj && (
                        <Text style={styles.manageItemMeta}>
                          Expires: {formatDisplayDate(expiryDateObj)} at{' '}
                          {formatDisplayTime(expiryDateObj)}
                        </Text>
                      )}

                      <View style={styles.manageItemActions}>
                        <TouchableOpacity
                          style={styles.editActionBtn}
                          activeOpacity={0.85}
                          onPress={() => openEditModal(item)}
                        >
                          <Ionicons name="create-outline" size={16} color="#1D4ED8" />
                          <Text style={styles.editActionText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteActionBtn}
                          activeOpacity={0.85}
                          onPress={() => confirmDeleteAnnouncement(item)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#B71C1C" />
                          <Text style={styles.deleteActionText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── EDIT ANNOUNCEMENT MODAL ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={!!editTarget}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.targetModalCard,
              isMobile && styles.targetModalCardMobile,
            ]}
          >
            <View style={styles.targetModalHeader}>
              <Text style={styles.targetModalTitle}>Edit Announcement</Text>
              <TouchableOpacity onPress={closeEditModal} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#222" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.targetModalScrollContent}
            >
              <View style={styles.inputOutlineBox}>
                <Text style={styles.innerLabel}>Header</Text>
                <TextInput
                  style={styles.nakedInput}
                  value={editHeader}
                  onChangeText={setEditHeader}
                  underlineColorAndroid="transparent"
                  placeholder="Enter announcement header"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputOutlineBox}>
                <Text style={styles.innerLabel}>Description</Text>
                <TextInput
                  style={[styles.nakedInput, styles.descriptionInput]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  textAlignVertical="top"
                  underlineColorAndroid="transparent"
                  placeholder="Enter announcement description"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeBox}>
                  <ExpiryDateField
                    value={editExpiryDate}
                    onChange={setEditExpiryDate}
                    isMobile={isMobile}
                    showToast={showToast}
                  />
                </View>

                <View style={styles.dateTimeBox}>
                  <ExpiryTimeField value={editExpiryTime} onChange={setEditExpiryTime} isMobile={isMobile} />
                </View>
              </View>

              <View style={styles.selectorOutlineBox}>
                <Text style={styles.innerLabel}>Select Background Banner</Text>

                <View style={styles.bgGrid}>
                  {BACKGROUNDS.map((bg) => (
                    <TouchableOpacity
                      key={bg.id}
                      onPress={() => setEditBg(bg.id)}
                      style={[
                        styles.bgOption,
                        editBg === bg.id && styles.bgOptionSelected,
                      ]}
                      activeOpacity={0.85}
                    >
                      <Image source={bg.image} style={styles.bgImage} />
                      {editBg === bg.id && (
                        <View style={styles.checkOverlay}>
                          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.selectorOutlineBox}>
                <Text style={styles.innerLabel}>Target Classes</Text>

                <Text style={styles.editAudienceSummary} numberOfLines={3}>
                  {editSelectAllClasses
                    ? 'All Classes'
                    : editSelectedClasses.length
                    ? editSelectedClasses.map((course) => course.label).join(', ')
                    : 'No classes selected'}
                </Text>

                <TouchableOpacity
                  style={styles.changeClassesBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowEditAudienceModal(true)}
                >
                  <Ionicons name="people-outline" size={16} color="#B71C1C" />
                  <Text style={styles.changeClassesBtnText}>Change Target Classes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={closeEditModal}
                disabled={isUpdating}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, isUpdating && styles.submitBtnDisabled]}
                activeOpacity={0.8}
                onPress={handleUpdateAnnouncement}
                disabled={isUpdating}
              >
                <Text style={styles.confirmBtnText}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EDIT: CHANGE TARGET CLASSES MODAL ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={showEditAudienceModal}
        onRequestClose={() => setShowEditAudienceModal(false)}
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
                onPress={() => setShowEditAudienceModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#222" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.targetModalScrollContent}
            >
              <View style={styles.targetSection}>
                <Text style={styles.targetSectionTitle}>Audience</Text>

                {renderCheckboxRow(
                  'All Classes',
                  editSelectAllClasses,
                  toggleEditAllClasses
                )}
              </View>

              <View style={styles.targetSection}>
                <Text style={styles.targetSectionTitle}>Created Classes</Text>

                {availableClasses.length ? (
                  availableClasses.map((course) =>
                    renderCheckboxRow(
                      course.label,
                      editSelectedClassIds.includes(course.id),
                      () => toggleEditClass(course.id),
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
                onPress={() => setShowEditAudienceModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                activeOpacity={0.8}
                onPress={() => {
                  if (!editSelectAllClasses && !editSelectedClassIds.length) {
                    showToast('Please select a class or choose All Classes.', 'error');
                    return;
                  }
                  setShowEditAudienceModal(false);
                }}
              >
                <Text style={styles.confirmBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={!!deleteTarget}
        onRequestClose={cancelDeleteAnnouncement}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmDeleteCard}>
            <View style={styles.confirmDeleteIconBox}>
              <Ionicons name="trash-outline" size={26} color="#B71C1C" />
            </View>

            <Text style={styles.confirmDeleteTitle}>Delete this announcement?</Text>
            <Text style={styles.confirmDeleteMessage}>
              "{deleteTarget?.title}" will be permanently removed from all
              classes it was shared to. This action cannot be undone.
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={cancelDeleteAnnouncement}
                disabled={isDeleting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteConfirmBtn, isDeleting && styles.submitBtnDisabled]}
                activeOpacity={0.8}
                onPress={handleDeleteAnnouncement}
                disabled={isDeleting}
              >
                <Text style={styles.confirmBtnText}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
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
  webContentContainerLarge: { paddingLeft: 150, paddingRight: 150 },
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


  // ✅ RENAMED to avoid duplicate key error
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(43, 17, 17, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },

  webDateModalCard: { width: '100%', maxWidth: 860, maxHeight: '88%', backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#F3D4D4', overflow: 'hidden' },
  // Time-only modal (hour/minute + AM/PM) needs far less width than the
  // full calendar-grid date modal it shares a base style with — narrower
  // on large screens; falls back to full-width mobile sizing below.
  webTimeModalCard: { maxWidth: 480 },
  // ✅ NEW: mobile card sizing for the Date picker modal
  webDateModalCardMobile: { maxWidth: '100%', maxHeight: '92%', borderRadius: 20 },

  modalHeader: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#F8E3E3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalHeaderLeft: { flex: 1, flexDirection: 'row', paddingRight: 16 },
  modalHeaderTextWrap: { flex: 1 },
  modalIconBox: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  // ✅ NEW: smaller icon box on mobile
  modalIconBoxMobile: { width: 40, height: 40, borderRadius: 12, marginRight: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#2B1111', marginBottom: 4 },
  // ✅ NEW: smaller title on mobile
  modalTitleMobile: { fontSize: 17, marginBottom: 2 },
  modalSubtitle: { fontSize: 14, lineHeight: 21, color: '#8A6F6F' },
  // ✅ NEW: smaller subtitle on mobile
  modalSubtitleMobile: { fontSize: 12.5, lineHeight: 17 },
  modalCloseButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center' },

  // ✅ Merged Time field (typed HH:MM + AM/PM), replacing the old separate
  // scrollable Hour / Minute columns — same pattern used for the Due Date &
  // Time picker elsewhere in the app.
  timeInputRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  timeTextInputWrap: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#F1CACA',
    borderRadius: 14,
    backgroundColor: '#FFF9F9',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  timeTextInputWrapFocused: { borderColor: '#DC2626', borderWidth: 1.5 },
  timeTextInput: {
    fontSize: 16,
    color: '#2B1111',
    fontWeight: '600',
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  meridiemToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#F1CACA',
    borderRadius: 14,
    backgroundColor: '#FFF9F9',
    overflow: 'hidden',
  },
  meridiemBtn: { paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  meridiemBtnActive: { backgroundColor: '#DC2626' },
  meridiemBtnText: { fontSize: 13, fontWeight: '800', color: '#B98A8A' },
  meridiemBtnTextActive: { color: '#FFFFFF' },

  webDateContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  // ✅ NEW: tighter padding on mobile
  webDateContentMobile: { paddingHorizontal: 16, paddingTop: 14 },
  modalRow: { flexDirection: 'row', gap: 14, marginBottom: 22, zIndex: 20 },
  modalRowStack: { flexDirection: 'column', gap: 14 },
  modalCol: { flex: 1 },

  // ✅ NEW: caps the combined Month/Day/Year stack so the footer
  // (Cancel/Apply) always stays visible instead of being pushed off-screen.
  mobileColumnsScroll: { maxHeight: 380 },
  // ✅ NEW: outer vertical stack — Month row, then Day/Year row
  mobileColumnsStack: { flexDirection: 'column', gap: 14 },
  // ✅ NEW: Month takes the full row on its own
  mobileMonthRow: { flexDirection: 'row' },
  // ✅ NEW: Day and Year sit side by side in the same row
  mobileDayYearRow: { flexDirection: 'row', gap: 14 },

  webDateList: { maxHeight: 260, borderRadius: 16, borderWidth: 1, borderColor: '#F1CACA', backgroundColor: '#FFF9F9' },
  // ✅ NEW: shorter individual list height on mobile since 3 lists stack
  webDateListMobile: { maxHeight: 150 },
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

  // ─── SEE ALL / MANAGE ANNOUNCEMENTS ────────────────────────────────────────
  manageLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: '#F3D0D0', backgroundColor: '#FFF7F7', marginBottom: 24 },
  manageLinkText: { fontSize: 13, fontWeight: '700', color: '#B71C1C', fontFamily },

  manageModalCard: { width: '100%', maxWidth: 560, maxHeight: '85%', backgroundColor: '#FFF', borderRadius: 18, padding: 20 },
  manageModalCardMobile: { maxHeight: '90%' },

  manageStateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  manageStateText: { marginTop: 10, fontSize: 13.5, color: '#6B7280', textAlign: 'center', fontFamily, lineHeight: 19 },
  retryBtn: { marginTop: 14, backgroundColor: '#B71C1C', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily },

  manageListContent: { paddingBottom: 6 },
  manageItemCard: { borderWidth: 1, borderColor: '#EEE', borderRadius: 14, padding: 14, marginBottom: 12, backgroundColor: '#FAFAFA' },
  manageItemHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  manageItemTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#222', fontFamily },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillActive: { backgroundColor: '#E8F5E9' },
  statusPillExpired: { backgroundColor: '#F3F4F6' },
  statusPillText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  statusPillTextActive: { color: '#2E7D32' },
  statusPillTextExpired: { color: '#9CA3AF' },

  manageItemMessage: { fontSize: 13, color: '#444', lineHeight: 18, marginBottom: 8, fontFamily },
  manageItemMeta: { fontSize: 11.5, color: '#8A8A8A', marginBottom: 3, fontFamily },

  manageItemActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  editActionText: { fontSize: 12.5, fontWeight: '700', color: '#1D4ED8', fontFamily },
  deleteActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#F3D0D0', backgroundColor: '#FFF5F5' },
  deleteActionText: { fontSize: 12.5, fontWeight: '700', color: '#B71C1C', fontFamily },

  changeClassesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F3D0D0', backgroundColor: '#FFF7F7' },
  changeClassesBtnText: { fontSize: 12.5, fontWeight: '700', color: '#B71C1C', fontFamily },
  editAudienceSummary: { fontSize: 13, color: '#444', lineHeight: 18, fontFamily },

  // ─── DELETE CONFIRMATION ────────────────────────────────────────────────────
  confirmDeleteCard: { width: '100%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 18, padding: 22, alignItems: 'center' },
  confirmDeleteIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmDeleteTitle: { fontSize: 17, fontWeight: '800', color: '#222', marginBottom: 8, textAlign: 'center', fontFamily },
  confirmDeleteMessage: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 18, fontFamily },
  deleteConfirmBtn: { flex: 1, backgroundColor: '#B71C1C', paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});