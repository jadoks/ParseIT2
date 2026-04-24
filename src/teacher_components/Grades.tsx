import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const JourneyHeader = require('../../assets/images/myjourney-header-template-1.png');

const API_BASE_URL =
  Platform.OS === 'web' ? 'http://localhost:5000' : 'http://192.168.1.5:5000';

const semesters = ['First Semester', 'Second Semester'];

const buildSchoolYear = (startYear: string) => {
  const cleanStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
  const parsedStartYear = Number(cleanStartYear);

  if (!Number.isInteger(parsedStartYear) || cleanStartYear.length !== 4) {
    return '';
  }

  return `S.Y ${parsedStartYear} - ${parsedStartYear + 1}`;
};

const normalizeSchoolYear = (value?: string | null) => {
  if (!value) return '';

  const match = String(value).match(/(\d{4})\D+(\d{4})/);

  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  return String(value)
    .replace(/S\.?Y\.?/gi, '')
    .replace(/\s+/g, '')
    .trim();
};

const normalizeSemester = (value?: string | null) => {
  const text = String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

  if (
    text.includes('first') ||
    text.includes('1st') ||
    text === '1' ||
    text.includes('semester 1')
  ) {
    return 'first';
  }

  if (
    text.includes('second') ||
    text.includes('2nd') ||
    text === '2' ||
    text.includes('semester 2')
  ) {
    return 'second';
  }

  return text;
};

const formatGrade = (value: number) => {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(3);
};

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const removeCourseCodeFromDetail = (courseDetail: string, courseCode: string) => {
  const detail = String(courseDetail || '').trim();
  const code = String(courseCode || '').trim();

  if (!detail || !code || code === 'N/A') {
    return detail || 'Untitled Course';
  }

  return detail
    .replace(new RegExp(`^\\s*${escapeRegExp(code)}\\s*[-–—:]\\s*`, 'i'), '')
    .trim() || detail;
};

type GradeItem = {
  code: string;
  desc: string;
  unit: number;
  grade: number;
};

type StudentRecord = {
  studentId: string;
  fullName: string;
  schoolYear: string;
  semester: string;
  grades: GradeItem[];
  totalUnits: number;
  gwa: number;
};

type JoinedClass = {
  id: string;
  name?: string;
  courseCode?: string;
  schoolYear?: string;
  semester?: string;
  section?: string;
  year?: string;
  units?: number | string;
};

type FinalGradeRecord = {
  id?: string;
  classId?: string;
  studentId?: string;
  studentName?: string;
  finalGrade?: string | number;
  className?: string;
  courseCode?: string;
};

type DropdownKey = 'semester' | null;

type InlineDropdownProps = {
  options: string[];
  selectedValue: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  fullWidth?: boolean;
  width?: number;
  isPhone?: boolean;
};

type TableCellProps = {
  width?: number;
  flex?: number;
  text: string;
  isHeader?: boolean;
  isLast?: boolean;
  centered?: boolean;
  bold?: boolean;
  numberOfLines?: number;
  mobile?: boolean;
};

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

const InlineDropdown = ({
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
  fullWidth = false,
  width = 190,
  isPhone = false,
}: InlineDropdownProps) => {
  return (
    <View
      style={[
        styles.dropdownWrapper,
        fullWidth ? styles.dropdownWrapperFull : { width },
        isOpen && styles.dropdownWrapperActive,
      ]}
    >
      <TouchableOpacity
        style={[styles.dropdown, isPhone && styles.dropdownMobile]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>
          {selectedValue}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#3B332E"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.dropdownMenu, isPhone && styles.dropdownMenuMobile]}>
          <View style={styles.dropdownMenuContent}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownItem,
                  index === options.length - 1 && styles.lastDropdownItem,
                ]}
                onPress={() => onSelect(option)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const TableCell = ({
  width,
  flex,
  text,
  isHeader = false,
  isLast = false,
  centered = false,
  bold = false,
  numberOfLines,
  mobile = false,
}: TableCellProps) => {
  return (
    <View
      style={[
        styles.tableCell,
        isHeader ? styles.tableHeaderCell : styles.tableBodyCell,
        width ? { width } : null,
        flex ? { flex } : null,
        isLast ? styles.tableCellLast : styles.tableCellDivider,
        centered && styles.tableCellCentered,
      ]}
    >
      <Text
        numberOfLines={numberOfLines}
        style={[
          isHeader ? styles.headerText : styles.cellText,
          mobile && (isHeader ? styles.mobileHeaderText : styles.mobileCellText),
          centered && styles.centerText,
          bold && styles.gradeText,
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const Grades = () => {
  const { width } = useWindowDimensions();

  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;
  const isStackedLayout = width < 760;

  const contentHorizontalPadding = isPhone ? 16 : isTablet ? 28 : 40;
  const titleSize = isPhone ? 32 : isTablet ? 36 : 36;

  const mobileReportWidth = Math.max(320, width - 32);
  const webTableWidth = 940;
  const mobileTableMinWidth = 640;

  const [studentId, setStudentId] = useState('');
  const [startYear, setStartYear] = useState('2025');
  const [selectedSemester, setSelectedSemester] = useState('First Semester');
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [showGrades, setShowGrades] = useState(false);
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const schoolYear = useMemo(() => buildSchoolYear(startYear), [startYear]);

  const closeDropdowns = () => {
    if (openDropdown !== null) {
      setOpenDropdown(null);
    }
  };

  const handleStartYearChange = (value: string) => {
    setStartYear(value.replace(/[^0-9]/g, '').slice(0, 4));
  };

  const loadStudentGradesFromDatabase = async () => {
    const trimmedId = studentId.trim();
    const normalizedStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
    const parsedStartYear = Number(normalizedStartYear);

    if (!trimmedId) {
      Alert.alert('Missing Student ID', 'Please enter a student ID.');
      setShowGrades(false);
      setStudentRecord(null);
      return;
    }

    if (!Number.isInteger(parsedStartYear) || normalizedStartYear.length !== 4) {
      Alert.alert('Invalid Start Year', 'Please enter a valid 4-digit academic start year. Example: 2025');
      setShowGrades(false);
      setStudentRecord(null);
      return;
    }

    try {
      setIsLoading(true);
      setOpenDropdown(null);

      const joinedResponse = await fetch(
        `${API_BASE_URL}/student-joined-classes/${encodeURIComponent(trimmedId)}`
      );

      const joinedData = await joinedResponse.json();

      if (!joinedResponse.ok) {
        throw new Error(joinedData?.error || 'Failed to load student classes.');
      }

      const joinedClasses: JoinedClass[] = Array.isArray(joinedData)
        ? joinedData
        : Array.isArray(joinedData?.data)
        ? joinedData.data
        : [];

      const targetSchoolYear = `${parsedStartYear}-${parsedStartYear + 1}`;
      const targetSemester = normalizeSemester(selectedSemester);

      const matchingClasses = joinedClasses.filter((item) => {
        return (
          normalizeSchoolYear(item.schoolYear) === targetSchoolYear &&
          normalizeSemester(item.semester) === targetSemester
        );
      });

      if (!matchingClasses.length) {
        Alert.alert(
          'No Record Found',
          `No enrolled classes found for ${buildSchoolYear(normalizedStartYear)} - ${selectedSemester}.`
        );
        setShowGrades(false);
        setStudentRecord(null);
        return;
      }

      const finalGradeGroups = await Promise.all(
        matchingClasses.map(async (classItem) => {
          const response = await fetch(
            `${API_BASE_URL}/final-grades/${encodeURIComponent(classItem.id)}`
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || `Failed to load grades for ${classItem.name || classItem.courseCode || 'class'}.`);
          }

          return {
            classItem,
            grades: Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
          };
        })
      );

      const gradeItems: GradeItem[] = [];
      let resolvedStudentName = '';

      finalGradeGroups.forEach(({ classItem, grades }) => {
        const matchedGrade = (grades as FinalGradeRecord[]).find(
          (grade) => String(grade.studentId || '').trim() === trimmedId
        );

        if (!matchedGrade) return;

        const finalGrade = Number(matchedGrade.finalGrade);
        const units = Number(classItem.units || 0);

        if (!Number.isFinite(finalGrade)) return;

        if (!resolvedStudentName && matchedGrade.studentName) {
          resolvedStudentName = String(matchedGrade.studentName);
        }

        const courseCode = String(classItem.courseCode || matchedGrade.courseCode || 'N/A');
        const courseDetail = String(classItem.name || matchedGrade.className || 'Untitled Course');

        gradeItems.push({
          code: courseCode,
          desc: removeCourseCodeFromDetail(courseDetail, courseCode),
          unit: Number.isFinite(units) ? units : 0,
          grade: finalGrade,
        });
      });

      if (!gradeItems.length) {
        Alert.alert(
          'No Final Grades Found',
          `No submitted final grades found for this student in ${buildSchoolYear(normalizedStartYear)} - ${selectedSemester}.`
        );
        setShowGrades(false);
        setStudentRecord(null);
        return;
      }

      gradeItems.sort((a, b) => a.code.localeCompare(b.code));

      const totalUnits = gradeItems.reduce((sum, item) => sum + item.unit, 0);
      const weightedGradeTotal = gradeItems.reduce(
        (sum, item) => sum + item.grade * item.unit,
        0
      );
      const gwa = totalUnits > 0 ? weightedGradeTotal / totalUnits : 0;

      setStudentRecord({
        studentId: trimmedId,
        fullName: resolvedStudentName || 'Student Name Not Available',
        schoolYear: buildSchoolYear(normalizedStartYear),
        semester: selectedSemester,
        grades: gradeItems,
        totalUnits,
        gwa,
      });
      setShowGrades(true);
    } catch (error: any) {
      Alert.alert('Load Failed', error?.message || 'Unable to load student grades.');
      setShowGrades(false);
      setStudentRecord(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowJourney = () => {
    loadStudentGradesFromDatabase();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.flexOne}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={Platform.OS === 'ios'}
          overScrollMode="always"
          onScrollBeginDrag={closeDropdowns}
          scrollEventThrottle={16}
        >
          <View
            style={[
              styles.leftAlignWrapper,
              { paddingHorizontal: contentHorizontalPadding },
            ]}
          >
            <View style={[styles.headerBlock, isPhone && styles.headerBlockMobile]}>
              <Text style={[styles.mainTitle, { fontSize: titleSize }]}>Grades</Text>
              <Text style={styles.subTitle}>
                Generate an official academic grade report from database records.
              </Text>
            </View>

            <View style={[styles.controlsCard, isPhone && styles.controlsCardMobile]}>
              <Text style={styles.controlsTitle}>Academic Record Lookup</Text>
              <Text style={styles.controlsSubtitle}>
                Enter the student ID, academic start year, and semester to retrieve submitted final grades.
              </Text>

              {isStackedLayout ? (
                <View style={styles.stackedControls}>
                  <View style={styles.academicFieldFull}>
                    <Text style={styles.academicLabel}>Student ID</Text>
                    <TextInput
                      placeholder="Enter Student ID"
                      placeholderTextColor="#8A8A8A"
                      value={studentId}
                      onChangeText={setStudentId}
                      style={[styles.mainInputFull, isPhone && styles.mainInputMobile]}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.academicFieldFull}>
                    <Text style={styles.academicLabel}>Academic Start Year</Text>
                    <TextInput
                      placeholder="e.g. 2025"
                      placeholderTextColor="#8A8A8A"
                      value={startYear}
                      onChangeText={handleStartYearChange}
                      style={[styles.mainInputFull, isPhone && styles.mainInputMobile]}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>

                  <View style={[styles.schoolYearBadge, styles.schoolYearBadgeMobile]}>
                    <Text style={styles.schoolYearBadgeLabel}>Computed School Year</Text>
                    <Text style={styles.schoolYearBadgeValue}>
                      {schoolYear || 'S.Y ---- - ----'}
                    </Text>
                  </View>

                  <View style={styles.academicFieldFull}>
                    <Text style={styles.academicLabel}>Semester</Text>
                    <InlineDropdown
                      options={semesters}
                      selectedValue={selectedSemester}
                      isOpen={openDropdown === 'semester'}
                      fullWidth
                      isPhone={isPhone}
                      onToggle={() =>
                        setOpenDropdown(openDropdown === 'semester' ? null : 'semester')
                      }
                      onSelect={(value) => {
                        setSelectedSemester(value);
                        setOpenDropdown(null);
                      }}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.journeyButtonFull,
                      isPhone && styles.journeyButtonMobile,
                      isLoading && styles.journeyButtonDisabled,
                    ]}
                    onPress={handleShowJourney}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.journeyButtonText,
                          isPhone && styles.journeyButtonTextMobile,
                        ]}
                      >
                        Generate Grade Report
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.controlsGrid}>
                  <View style={[styles.controlsGridRow, styles.controlsGridRowTop]}>
                    <View style={styles.academicField}>
                      <Text style={styles.academicLabel}>Student ID</Text>
                      <TextInput
                        placeholder="Enter Student ID"
                        placeholderTextColor="#8A8A8A"
                        value={studentId}
                        onChangeText={setStudentId}
                        style={styles.mainInput}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.academicField}>
                      <Text style={styles.academicLabel}>Academic Start Year</Text>
                      <TextInput
                        placeholder="e.g. 2025"
                        placeholderTextColor="#8A8A8A"
                        value={startYear}
                        onChangeText={handleStartYearChange}
                        style={styles.mainInput}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>

                    <View style={styles.academicSchoolYearField}>
                      <Text style={styles.academicLabel}>Computed School Year</Text>
                      <View style={styles.schoolYearBadge}>
                        <Text style={styles.schoolYearBadgeValue}>
                          {schoolYear || 'S.Y ---- - ----'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.academicSemesterField}>
                      <Text style={styles.academicLabel}>Semester</Text>
                      <InlineDropdown
                        options={semesters}
                        selectedValue={selectedSemester}
                        isOpen={openDropdown === 'semester'}
                        onToggle={() =>
                          setOpenDropdown(openDropdown === 'semester' ? null : 'semester')
                        }
                        onSelect={(value) => {
                          setSelectedSemester(value);
                          setOpenDropdown(null);
                        }}
                        width={190}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.journeyButton,
                        isLoading && styles.journeyButtonDisabled,
                      ]}
                      onPress={handleShowJourney}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.journeyButtonText}>
                          Generate Grade Report
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {showGrades && studentRecord && (
            <View
              style={[
                styles.centeredResultWrapper,
                { paddingHorizontal: isPhone ? 16 : 20 },
              ]}
            >
              <View
                style={[
                  isPhone
                    ? [styles.mobileReportCard, { width: mobileReportWidth }]
                    : [styles.reportCard, isLargeScreen && styles.reportCardLarge],
                ]}
              >
                <View
                  style={[
                    styles.uniHeader,
                    !isPhone && styles.webHeaderWrap,
                    !isPhone && { width: webTableWidth },
                  ]}
                >
                  <Image
                    source={JourneyHeader}
                    style={[
                      styles.headerImage,
                      isPhone ? styles.headerImageMobile : styles.headerImageWeb,
                    ]}
                    resizeMode="contain"
                  />
                </View>

                <View style={[styles.reportTitleBlock, !isPhone && { width: webTableWidth }]}>
                  <Text style={styles.reportTitle}>OFFICIAL GRADE REPORT</Text>
                  <Text style={styles.reportSubtitle}>
                    Academic Year {studentRecord.schoolYear} | {studentRecord.semester}
                  </Text>
                </View>

                <View
                  style={[
                    styles.studentInfoPanel,
                    !isPhone && { width: webTableWidth },
                    isLargeScreen && styles.studentInfoPanelLarge,
                  ]}
                >
                  <View style={[styles.studentInfoRow, isLargeScreen && styles.studentInfoRowLarge]}>
                    <Text style={styles.studentInfoLabel}>Student ID</Text>
                    <Text style={styles.studentInfoValue}>{studentRecord.studentId}</Text>
                  </View>

                  <View style={[styles.studentInfoRow, isLargeScreen && styles.studentInfoRowLarge]}>
                    <Text style={styles.studentInfoLabel}>Student Name</Text>
                    <Text style={styles.studentInfoValue}>{studentRecord.fullName}</Text>
                  </View>

                  <View style={[styles.studentInfoRow, isLargeScreen && styles.studentInfoRowLarge]}>
                    <Text style={styles.studentInfoLabel}>Total Units</Text>
                    <Text style={styles.studentInfoValue}>
                      {studentRecord.totalUnits.toFixed(1)}
                    </Text>
                  </View>

                  <View style={[styles.studentInfoRow, isLargeScreen && styles.studentInfoRowLarge]}>
                    <Text style={styles.studentInfoLabel}>GWA</Text>
                    <Text style={[styles.studentInfoValue, styles.gwaValue]}>
                      {formatGrade(studentRecord.gwa)}
                    </Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={isPhone}
                  style={styles.tableScroll}
                  contentContainerStyle={styles.tableScrollContent}
                >
                  <View
                    style={[
                      styles.table,
                      { width: isPhone ? mobileTableMinWidth : webTableWidth },
                    ]}
                  >
                    <View style={styles.tableHeader}>
                      <TableCell width={110} text="Course Code" isHeader mobile={isPhone} />
                      <TableCell flex={1} text="Course Detail" isHeader mobile={isPhone} />
                      <TableCell width={90} text="Units" isHeader centered mobile={isPhone} />
                      <TableCell width={110} text="Final Grade" isHeader centered isLast mobile={isPhone} />
                    </View>

                    {studentRecord.grades.map((item, index) => (
                      <View
                        key={`${item.code}-${index}`}
                        style={[
                          isPhone ? styles.tableRow : styles.tableRowWeb,
                          index === studentRecord.grades.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <TableCell
                          width={110}
                          text={item.code}
                          mobile={isPhone}
                          numberOfLines={1}
                        />
                        <TableCell
                          flex={1}
                          text={item.desc}
                          mobile={isPhone}
                          numberOfLines={2}
                        />
                        <TableCell
                          width={90}
                          text={item.unit.toFixed(1)}
                          mobile={isPhone}
                          centered
                          numberOfLines={1}
                        />
                        <TableCell
                          width={110}
                          text={formatGrade(item.grade)}
                          mobile={isPhone}
                          centered
                          bold
                          numberOfLines={1}
                          isLast
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>

              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexOne: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    paddingBottom: 60,
    flexGrow: 1,
  },

  leftAlignWrapper: {
    alignItems: 'flex-start',
    overflow: 'visible',
    zIndex: 5000,
  },

  headerBlock: {
    marginTop: 30,
    marginBottom: 26,
  },

  headerBlockMobile: {
    marginTop: 20,
    marginBottom: 18,
  },

  mainTitle: {
    fontWeight: 'bold',
    color: '#000',
    fontFamily,
  },

  subTitle: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
    lineHeight: 20,
    fontFamily,
  },

  controlsCard: {
    marginBottom: 26,
    width: '100%',
    maxWidth: 980,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    backgroundColor: '#FFFDF9',
    zIndex: 5000,
    elevation: 50,
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  controlsCardMobile: {
    maxWidth: '100%',
    padding: 14,
    borderRadius: 14,
  },

  controlsTitle: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily,
  },

  controlsSubtitle: {
    color: '#5E5650',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
    fontFamily,
  },

  controlsGrid: {
    width: '100%',
  },

  controlsGridRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    flexWrap: 'wrap',
  },

  controlsGridRowTop: {
    zIndex: 3000,
    elevation: 0,
  },

  stackedControls: {
    width: '100%',
    gap: 12,
    zIndex: 999,
  },

  academicField: {
    width: 180,
  },

  academicFieldFull: {
    width: '100%',
  },

  academicSchoolYearField: {
    width: 220,
  },

  academicSemesterField: {
    width: 190,
    zIndex: 4000,
    elevation: 0,
  },

  academicLabel: {
    color: '#3B332E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 7,
    textTransform: 'uppercase',
    fontFamily,
  },

  schoolYearBadge: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#D8D0C8',
    borderRadius: 10,
    backgroundColor: '#F7F2EC',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  schoolYearBadgeMobile: {
    minHeight: 52,
    borderRadius: 12,
  },

  schoolYearBadgeLabel: {
    color: '#7A6E66',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.35,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontFamily,
  },

  schoolYearBadgeValue: {
    color: '#2D2926',
    fontSize: 14,
    fontWeight: '800',
    fontFamily,
  },

  dropdownWrapper: {
    position: 'relative',
    width: '100%',
    zIndex: 1,
    elevation: 0,
  },

  dropdownWrapperActive: {
    zIndex: 9999,
    elevation: 100,
  },

  dropdownWrapperFull: {
    width: '100%',
  },

  dropdown: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderColor: '#B8AFA7',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    zIndex: 4001,
    elevation: 0,
  },

  dropdownMobile: {
    height: 48,
    borderRadius: 12,
  },

  dropdownText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 8,
    fontFamily,
  },

  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8D0C8',
    overflow: 'hidden',
    zIndex: 5000,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },

  dropdownMenuMobile: {
    top: 52,
    borderRadius: 12,
  },

  dropdownMenuContent: {
    backgroundColor: '#FFFFFF',
  },

  dropdownItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },

  lastDropdownItem: {
    borderBottomWidth: 0,
  },

  dropdownItemText: {
    fontSize: 13,
    color: '#111',
    fontWeight: '600',
    fontFamily,
  },

  mainInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#B8AFA7',
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#FFF',
    fontWeight: '700',
    fontFamily,
  },

  mainInputFull: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#B8AFA7',
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#FFF',
    fontWeight: '700',
    fontFamily,
  },

  mainInputMobile: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },

  journeyButton: {
    minWidth: 220,
    backgroundColor: '#B71C1C',
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#7F1010',
  },

  journeyButtonFull: {
    width: '100%',
    backgroundColor: '#B71C1C',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#7F1010',
  },

  journeyButtonMobile: {
    height: 50,
  },

  journeyButtonDisabled: {
    opacity: 0.65,
  },

  journeyButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    fontFamily,
  },

  journeyButtonTextMobile: {
    fontSize: 13,
  },

  centeredResultWrapper: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
    elevation: 0,
  },

  reportCard: {
    width: '100%',
    maxWidth: 1020,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E4E4E4',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: 'center',
    zIndex: 1,
    elevation: 0,
  },

  reportCardLarge: {
    paddingHorizontal: 24,
  },

  mobileReportCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    overflow: 'hidden',
  },

  uniHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },

  webHeaderWrap: {
    alignSelf: 'center',
  },

  headerImage: {
    width: '100%',
  },

  headerImageMobile: {
    height: 78,
    width: '100%',
  },

  headerImageWeb: {
    width: '100%',
    height: 150,
  },

  reportTitleBlock: {
    alignSelf: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1DC',
    paddingBottom: 12,
  },

  reportTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily,
  },

  reportSubtitle: {
    color: '#5E5650',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    fontFamily,
  },

  studentInfoPanel: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E8E1DA',
    borderRadius: 12,
    backgroundColor: '#FFFDF9',
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },

  studentInfoPanelLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  studentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  studentInfoRowLarge: {
    width: '48%',
  },

  studentInfoLabel: {
    color: '#655B54',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily,
  },

  studentInfoValue: {
    color: '#111',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
    fontFamily,
  },

  gwaValue: {
    color: '#B71C1C',
  },

  tableScroll: {
    width: '100%',
  },

  tableScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  table: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFF',
    borderRadius: 8,
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#B71C1C',
    borderBottomWidth: 1,
    borderBottomColor: '#BDBDBD',
  },

  tableRow: {
    flexDirection: 'row',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
  },

  tableRowWeb: {
    flexDirection: 'row',
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#DADADA',
  },

  lastTableRow: {
    borderBottomWidth: 0,
  },

  tableCell: {
    justifyContent: 'center',
  },

  tableHeaderCell: {
    backgroundColor: '#B71C1C',
  },

  tableBodyCell: {
    backgroundColor: '#FFF',
  },

  tableCellDivider: {
    borderRightWidth: 1,
    borderRightColor: '#DADADA',
  },

  tableCellLast: {
    borderRightWidth: 0,
  },

  tableCellCentered: {
    alignItems: 'center',
  },

  headerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily,
  },

  mobileHeaderText: {
    fontSize: 10,
    paddingHorizontal: 4,
  },

  cellText: {
    fontSize: 13,
    color: '#222',
    paddingVertical: 9,
    paddingHorizontal: 8,
    fontFamily,
  },

  mobileCellText: {
    fontSize: 11,
    paddingHorizontal: 5,
  },

  centerText: {
    textAlign: 'center',
  },

  gradeText: {
    fontWeight: '900',
    color: '#111',
  },

});

export default Grades;
