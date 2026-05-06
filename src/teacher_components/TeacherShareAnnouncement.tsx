import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
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

const webNativeInputStyle =
  Platform.OS === 'web'
    ? {
        width: '100%',
        height: 40,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: '#222',
        fontSize: '14px',
        fontFamily: 'inherit',
      }
    : {};

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

export default function ShareAnnouncement({
  apiBaseUrl,
  currentTeacher,
  classes,
  onShared,
}: ShareAnnouncementProps) {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;
  const isWeb = Platform.OS === 'web';

  const [selectedBg, setSelectedBg] = useState(4);
  const [header, setHeader] = useState('');
  const [description, setDescription] = useState('');

  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  const [webDateValue, setWebDateValue] = useState('');
  const [webTimeValue, setWebTimeValue] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isHeaderFocused, setIsHeaderFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);

  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectAllClasses, setSelectAllClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setWebDateValue('');
    setWebTimeValue('');
    setSelectedBg(4);
    setShowDatePicker(false);
    setShowTimePicker(false);
    resetTargeting();
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') return;
    if (selected) {
      setExpiryDate(selected);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') return;
    if (selected) {
      setExpiryTime(selected);
    }
  };

  const handleWebDateChange = (value: string) => {
    setWebDateValue(value);

    if (!value) {
      setExpiryDate(null);
      return;
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      setExpiryDate(parsed);
    }
  };

  const handleWebTimeChange = (value: string) => {
    setWebTimeValue(value);

    if (!value) {
      setExpiryTime(null);
      return;
    }

    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (!match) {
      setExpiryTime(null);
      return;
    }

    const [, hh, mm] = match;
    const time = new Date();
    time.setHours(Number(hh), Number(mm), 0, 0);

    if (!Number.isNaN(time.getTime())) {
      setExpiryTime(time);
    }
  };

  const handleOpenTargetAudience = () => {
    const trimmedHeader = header.trim();
    const trimmedDesc = description.trim();

    if (!trimmedHeader || !trimmedDesc || !expiryDate || !expiryTime) {
      Alert.alert(
        'Missing Fields',
        'Please complete header, description, expiry date, and expiry time.'
      );
      return;
    }

    const expiresAt = buildExpiryIso(expiryDate, expiryTime);

    if (!expiresAt) {
      Alert.alert('Invalid Date/Time', 'Please enter a valid expiry date and time.');
      return;
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      Alert.alert('Invalid Expiry', 'Please choose a future date and time.');
      return;
    }

    if (!availableClasses.length) {
      Alert.alert(
        'No Classes Found',
        'There are no created classes available yet.'
      );
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
        Alert.alert('Invalid Date/Time', 'Please enter a valid expiry date and time.');
        return;
      }

      const targetClassIds = selectAllClasses
        ? availableClasses.map((item) => item.id)
        : selectedClassIds;

      if (!targetClassIds.length) {
        Alert.alert('Missing Selection', 'Please select a class or choose All Classes.');
        return;
      }

      setIsSubmitting(true);

      const response = await fetch(`${apiBaseUrl}/create-class-announcement`, {
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

      Alert.alert(
        'Success',
        selectAllClasses || targetClassIds.length > 1
          ? `Announcement shared successfully to ${targetClassIds.length} classes!`
          : `Announcement shared successfully to ${selectedClasses[0]?.label || 'the selected class'}!`
      );

      await onShared?.();
      resetAll();
    } catch (error: any) {
      Alert.alert(
        'Share Failed',
        error?.message || 'Unable to share announcement.'
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

          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeBox}>
              <Text style={styles.innerLabel}>Expiry Date</Text>

              {isWeb ? (
                <View style={styles.webInputWrap}>
                  <input
                    type="date"
                    value={webDateValue}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => handleWebDateChange(e.target.value)}
                    style={webNativeInputStyle as any}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickerButton}
                  activeOpacity={0.85}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !expiryDate && styles.pickerPlaceholderText,
                    ]}
                  >
                    {expiryDate ? formatDisplayDate(expiryDate) : 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#555" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dateTimeBox}>
              <Text style={styles.innerLabel}>Expiry Time</Text>

              {isWeb ? (
                <View style={styles.webInputWrap}>
                  <input
                    type="time"
                    value={webTimeValue}
                    onChange={(e) => handleWebTimeChange(e.target.value)}
                    style={webNativeInputStyle as any}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickerButton}
                  activeOpacity={0.85}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !expiryTime && styles.pickerPlaceholderText,
                    ]}
                  >
                    {expiryTime ? formatDisplayTime(expiryTime) : 'Select time'}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#555" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!isWeb && showDatePicker && (
            <DateTimePicker
              value={expiryDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {!isWeb && showTimePicker && (
            <DateTimePicker
              value={expiryTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
  },
  mobileContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  webContentContainer: {
    flexGrow: 1,
    paddingLeft: 25,
    paddingRight: 120,
    paddingTop: 10,
    paddingBottom: 32,
  },
  headerSpacer: {
    height: 10,
    marginBottom: 20,
  },
  formTitle: {
    fontWeight: 'bold',
    color: '#000',
    fontFamily,
    letterSpacing: -0.5,
  },
  formSubTitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 30,
    fontFamily,
  },
  inputOutlineBox: {
    borderWidth: 1.5,
    borderColor: '#718096',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#FFF',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  dateTimeBox: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1.5,
    borderColor: '#718096',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
  },
  inputOutlineBoxFocused: {
    borderColor: '#000',
  },
  selectorOutlineBox: {
    borderWidth: 1.5,
    borderColor: '#718096',
    borderRadius: 8,
    padding: 15,
    marginBottom: 35,
    backgroundColor: '#FFF',
  },
  innerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 5,
    fontFamily,
  },
  nakedInput: {
    fontSize: 14,
    color: '#222',
    padding: 0,
    margin: 0,
    fontFamily,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  pickerButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#222',
    fontFamily,
  },
  pickerPlaceholderText: {
    color: '#999',
  },
  webInputWrap: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  descriptionInput: {
    height: 80,
  },
  bgGrid: {
    marginTop: 10,
  },
  bgOption: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bgOptionSelected: {
    borderColor: '#B71C1C',
    borderWidth: 3,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(183, 28, 28, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#B71C1C',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    fontFamily,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  targetModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
  },
  targetModalCardMobile: {
    maxHeight: '92%',
  },
  targetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  targetModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    fontFamily,
  },
  targetModalScrollContent: {
    paddingBottom: 12,
  },
  targetSection: {
    marginBottom: 18,
  },
  targetSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
    fontFamily,
  },
  checkRow: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5CACA',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  compactCheckRow: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5CACA',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 7,
  },
  checkRowActive: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF7F7',
  },
  checkboxBase: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D8B4B4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  checkTextWrapper: {
    flex: 1,
  },
  checkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#202124',
    fontFamily,
  },
  compactCheckText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#202124',
    fontFamily,
  },
  checkSubText: {
    marginTop: 2,
    fontSize: 11.5,
    color: '#6B7280',
    fontFamily,
  },
  emptyClassesBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
  },
  emptyClassesText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    fontFamily,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
    fontFamily,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#B71C1C',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
    fontFamily,
  },
});