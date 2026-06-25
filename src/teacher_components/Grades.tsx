import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
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
import * as XLSX from 'xlsx';

const JourneyHeader = require('../../assets/images/myjourney-header-template-1.png');
const FooterImage = require('../../assets/images/footer.png');

const semesters = ['First Semester', 'Second Semester'];

const buildSchoolYear = (startYear: string) => {
  const cleanStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
  const parsedStartYear = Number(cleanStartYear);

  if (!Number.isInteger(parsedStartYear) || cleanStartYear.length !== 4) {
    return '';
  }

  return `S.Y ${parsedStartYear} - ${parsedStartYear + 1}`;
};

const formatGrade = (value: number) => {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(3);
};

const escapeHtml = (value: string | number) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const sanitizeFileName = (value: string) => {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

const getExportTimestamp = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
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

type GradesProps = {
  apiBaseUrl: string;
};

const Grades = ({ apiBaseUrl }: GradesProps) => {
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
  const [notFound, setNotFound] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState('');

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
      setNotFound(false);
      return;
    }

    if (!Number.isInteger(parsedStartYear) || normalizedStartYear.length !== 4) {
      Alert.alert('Invalid Start Year', 'Please enter a valid 4-digit academic start year. Example: 2025');
      setShowGrades(false);
      setStudentRecord(null);
      setNotFound(false);
      return;
    }

    try {
      setIsLoading(true);
      setOpenDropdown(null);
      setNotFound(false);

      const targetSchoolYear = `${parsedStartYear}-${parsedStartYear + 1}`;

      const params = new URLSearchParams();
      if (targetSchoolYear) params.append('schoolYear', targetSchoolYear);
      if (selectedSemester) params.append('semester', selectedSemester);

      const response = await fetch(
        `${apiBaseUrl}/student-grade/parse/${encodeURIComponent(trimmedId)}?${params.toString()}`,
        { credentials: 'include' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load parsed grades.');
      }

      if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
        setShowGrades(false);
        setStudentRecord(null);
        setNotFoundMessage(
          `No uploaded/parsed grades found for ${buildSchoolYear(normalizedStartYear)} - ${selectedSemester}.`
        );
        setNotFound(true);
        return;
      }

      const gradeItems: GradeItem[] = data.data.map((item: any) => ({
        code: String(item.subjectCode || 'N/A'),
        desc: String(item.subjectTitle || 'Unknown Subject'),
        unit: Number(item.units || 0),
        grade: Number(item.grade || 0),
      }));

      gradeItems.sort((a, b) => a.code.localeCompare(b.code));

      const totalUnits = data.totalUnits || gradeItems.reduce((sum, item) => sum + item.unit, 0);
      const gwa = data.gwa || 0;

      setStudentRecord({
        studentId: trimmedId,
        fullName: data.studentName || trimmedId,
        schoolYear: buildSchoolYear(normalizedStartYear),
        semester: selectedSemester,
        grades: gradeItems,
        totalUnits,
        gwa,
      });
      setNotFound(false);
      setShowGrades(true);
    } catch (error: any) {
      Alert.alert('Load Failed', error?.message || 'Unable to load student grades.');
      setShowGrades(false);
      setStudentRecord(null);
      setNotFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowJourney = () => {
    loadStudentGradesFromDatabase();
  };

  const buildGradeReportHtml = (record: StudentRecord) => {
    const rows = record.grades
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.desc)}</td>
            <td class="center">${escapeHtml(item.unit.toFixed(1))}</td>
            <td class="center bold">${escapeHtml(formatGrade(item.grade))}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              size: A4;
              margin: 22mm 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
            }

            .report {
              width: 100%;
            }

            .school-header {
              text-align: center;
              margin-bottom: 24px;
              line-height: 1.25;
            }

            .republic { font-size: 12px; margin-bottom: 2px; }
            .school-name { font-size: 16px; font-weight: 800; letter-spacing: 0.4px; }
            .campus { font-size: 13px; font-weight: 700; }
            .address, .contact { font-size: 9px; }

            .title {
              text-align: center;
              font-size: 18px;
              font-weight: 900;
              letter-spacing: 1.5px;
              margin-top: 16px;
              margin-bottom: 6px;
            }

            .subtitle {
              text-align: center;
              font-size: 12px;
              font-weight: 700;
              margin-bottom: 14px;
            }

            .divider {
              border-top: 1px solid #ddd;
              margin: 12px 0 14px;
            }

            .student-panel {
              width: 100%;
              border: 1px solid #e2d8cf;
              border-radius: 9px;
              padding: 12px 14px;
              margin-bottom: 16px;
            }

            .student-grid {
              width: 100%;
              border-collapse: collapse;
            }

            .student-grid td {
              border: 0;
              padding: 4px 0;
              font-size: 12px;
            }

            .label {
              color: #5b514b;
              font-weight: 900;
              text-transform: uppercase;
              width: 19%;
            }

            .value {
              color: #000;
              font-weight: 900;
              width: 31%;
              text-align: right;
              padding-right: 24px;
            }

            .gwa { color: #b71c1c; }

            table.grades {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              border: 1px solid #cfcfcf;
              border-radius: 6px;
              overflow: hidden;
              font-size: 12px;
            }

            .grades th {
              background: #b71c1c;
              color: white;
              border-right: 1px solid #ffffff;
              padding: 10px 8px;
              text-align: center;
              text-transform: uppercase;
              font-weight: 900;
            }

            .grades th:last-child { border-right: 0; }

            .grades td {
              border-top: 1px solid #d9d9d9;
              border-right: 1px solid #d9d9d9;
              padding: 10px 8px;
              vertical-align: middle;
            }

            .grades td:last-child { border-right: 0; }

            .code { width: 13%; }
            .detail { width: 67%; }
            .units { width: 10%; }
            .grade { width: 10%; }

            .center { text-align: center; }
            .bold { font-weight: 900; }

            /* RESPONSIVE HTML FOR MOBILE BROWSERS */
            @media screen and (max-width: 600px) {
              .student-grid tr {
                display: block;
                margin-bottom: 10px;
              }
              .student-grid td {
                display: block;
                width: 100% !important;
                text-align: left !important;
                padding: 2px 0 !important;
              }
              .student-grid td.label {
                font-size: 10px;
                font-weight: 700;
              }
              .student-grid td.value {
                font-size: 13px;
                font-weight: 800;
              }

              table.grades {
                font-size: 10px;
              }
              .grades th, .grades td {
                padding: 6px 4px;
              }
            }
          </style>
        </head>

        <body>
          <main class="report">
            <section class="school-header">
              <div class="republic">Republic of the Philippines</div>
              <div class="school-name">CEBU TECHNOLOGICAL UNIVERSITY</div>
              <div class="campus">ARGAO CAMPUS</div>
              <div class="address">Ed Kintanar Street, Lamacan, Argao Cebu Philippines</div>
              <div class="contact">Website: http://www.argao.ctu.edu.ph &nbsp; E-mail: ctuargao@ctu.edu.ph</div>
            </section>

            <section>
              <div class="title">OFFICIAL GRADE REPORT</div>
              <div class="subtitle">Academic Year ${escapeHtml(record.schoolYear)} | ${escapeHtml(record.semester)}</div>
              <div class="divider"></div>
            </section>

            <section class="student-panel">
              <table class="student-grid">
                <tr>
                  <td class="label">Student ID</td>
                  <td class="value">${escapeHtml(record.studentId)}</td>
                  <td class="label">Student Name</td>
                  <td class="value">${escapeHtml(record.fullName)}</td>
                </tr>
                <tr>
                  <td class="label">Total Units</td>
                  <td class="value">${escapeHtml(record.totalUnits.toFixed(1))}</td>
                  <td class="label">GWA</td>
                  <td class="value gwa">${escapeHtml(formatGrade(record.gwa))}</td>
                </tr>
              </table>
            </section>

            <table class="grades">
              <thead>
                <tr>
                  <th class="code">Course<br />Code</th>
                  <th class="detail">Course Detail</th>
                  <th class="units">Units</th>
                  <th class="grade">Final Grade</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </main>
        </body>
      </html>
    `;
  };

  const downloadGradeReportExcel = async () => {
    if (!studentRecord) {
      Alert.alert('No Report', 'Please generate a grade report first.');
      return;
    }

    const safeSchoolYear = sanitizeFileName(studentRecord.schoolYear.replace(/S\.?Y\.?/gi, '').trim());
    const safeSemester = sanitizeFileName(studentRecord.semester);
    const fileName = `grade-report-${sanitizeFileName(studentRecord.studentId)}-${safeSchoolYear}-${safeSemester}-${getExportTimestamp()}.xlsx`;

    const summaryRows = [
      ['Student ID', studentRecord.studentId],
      ['Student Name', studentRecord.fullName],
      ['Academic Year', studentRecord.schoolYear],
      ['Semester', studentRecord.semester],
      ['Total Units', Number(studentRecord.totalUnits.toFixed(1))],
      ['GWA', Number(formatGrade(studentRecord.gwa))],
      ['Exported At', new Date().toLocaleString()],
    ];

    const gradeRows = studentRecord.grades.map((item, index) => ({
      No: index + 1,
      'Course Code': item.code,
      'Course Detail': item.desc,
      Units: Number(item.unit.toFixed(1)),
      'Final Grade': Number(formatGrade(item.grade)),
    }));

    try {
      const workbook = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet['!cols'] = [{ wch: 18 }, { wch: 42 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Student Summary');

      const gradesSheet = XLSX.utils.json_to_sheet(gradeRows);
      gradesSheet['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 48 },
        { wch: 10 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(workbook, gradesSheet, 'Grades');

      if (Platform.OS === 'web') {
        XLSX.writeFile(workbook, fileName);
        return;
      }

      const base64 = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
      });

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          Alert.alert('Cancelled', 'No folder selected.');
          return;
        }

        const savedFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        await FileSystem.writeAsStringAsync(savedFileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert('Downloaded', 'Grade report Excel file saved successfully.');
        return;
      }

      const savedUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(savedUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert('Downloaded', `Grade report Excel file saved successfully.\n${savedUri}`);
    } catch (error: any) {
      Alert.alert('Download Failed', error?.message || 'Unable to save the Excel file.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.flexOne}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
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
                Generate an official academic grade report from uploaded records.
              </Text>
            </View>

            <View style={[styles.controlsCard, isPhone && styles.controlsCardMobile]}>
              <Text style={styles.controlsTitle}>Academic Record Lookup</Text>
              <Text style={styles.controlsSubtitle}>
                Enter the student ID, academic start year, and semester to retrieve AI-parsed grades.
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
                    <Text style={styles.schoolYearBadgeLabel}>School Year</Text>
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
                      <Text style={styles.academicLabel}>School Year</Text>
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

          {notFound && (
            <View
              style={[
                styles.centeredResultWrapper,
                { paddingHorizontal: isPhone ? 16 : 20 },
              ]}
            >
              <View
                style={[
                  styles.noGradeCard,
                  isPhone ? { width: mobileReportWidth } : styles.noGradeCardWeb,
                ]}
              >
                <Ionicons name="document-text-outline" size={36} color="#B0A89E" />
                <Text style={styles.noGradeTitle}>No Grade Found</Text>
                <Text style={styles.noGradeMessage}>
                  {notFoundMessage ||
                    'No grades were found for the selected school year and semester.'}
                </Text>
              </View>
            </View>
          )}

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

                {/* RESPONSIVE STUDENT INFO CONTAINER */}
                <View
                  style={[
                    styles.studentInfoPanel,
                    !isPhone && { width: webTableWidth },
                    isLargeScreen && styles.studentInfoPanelLarge,
                  ]}
                >
                  <View style={[
                    styles.studentInfoRow,
                    isPhone && styles.studentInfoRowMobile,
                    isLargeScreen && styles.studentInfoRowLarge
                  ]}>
                    <Text style={styles.studentInfoLabel}>Student ID</Text>
                    <Text style={[
                      styles.studentInfoValue,
                      isPhone && styles.studentInfoValueMobile
                    ]}>
                      {studentRecord.studentId}
                    </Text>
                  </View>

                  <View style={[
                    styles.studentInfoRow,
                    isPhone && styles.studentInfoRowMobile,
                    isLargeScreen && styles.studentInfoRowLarge
                  ]}>
                    <Text style={styles.studentInfoLabel}>Student Name</Text>
                    <Text style={[
                      styles.studentInfoValue,
                      isPhone && styles.studentInfoValueMobile
                    ]}>
                      {studentRecord.fullName}
                    </Text>
                  </View>

                  <View style={[
                    styles.studentInfoRow,
                    isPhone && styles.studentInfoRowMobile,
                    isLargeScreen && styles.studentInfoRowLarge
                  ]}>
                    <Text style={styles.studentInfoLabel}>Total Units</Text>
                    <Text style={[
                      styles.studentInfoValue,
                      isPhone && styles.studentInfoValueMobile
                    ]}>
                      {studentRecord.totalUnits.toFixed(1)}
                    </Text>
                  </View>

                  <View style={[
                    styles.studentInfoRow,
                    isPhone && styles.studentInfoRowMobile,
                    isLargeScreen && styles.studentInfoRowLarge
                  ]}>
                    <Text style={styles.studentInfoLabel}>GWA</Text>
                    <Text style={[
                      styles.studentInfoValue,
                      styles.gwaValue,
                      isPhone && styles.studentInfoValueMobile
                    ]}>
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

                <View
                  style={[
                    styles.footerWrapper,
                    !isPhone && { width: webTableWidth },
                  ]}
                >
                  <Image
                    source={FooterImage}
                    style={[
                      styles.footerImage,
                      isPhone ? styles.footerImageMobile : styles.footerImageWeb,
                    ]}
                    resizeMode="contain"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.downloadButton, isPhone && styles.downloadButtonMobile]}
                  onPress={downloadGradeReportExcel}
                  activeOpacity={0.85}
                >
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.downloadButtonText}>Download Excel</Text>
                </TouchableOpacity>

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

  noGradeCard: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  noGradeCardWeb: {
    maxWidth: 640,
    width: '100%',
  },

  noGradeTitle: {
    color: '#3B332E',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    fontFamily,
  },

  noGradeMessage: {
    color: '#7A6E66',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 420,
    fontFamily,
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

  // UPDATED: Responsive Student Info Panel Styles
  studentInfoPanel: {
    alignSelf: 'center',
    width: '100%', // Ensures it stretches to full width on mobile
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
    alignItems: 'center',
    gap: 12,
    width: '100%', // Ensures each row stretches to full width
  },

  // NEW: Mobile-specific layout (Stacks label and value vertically)
  studentInfoRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 2,
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

  // NEW: Mobile-specific value styling (Left-aligned for vertical stack)
  studentInfoValueMobile: {
    textAlign: 'left',
    fontSize: 14,
    width: '100%',
    flex: 0, // Prevents vertical stretching in column layout
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

  footerWrapper: {
    alignItems: 'center',
    marginTop: 18,
  },

  footerImage: {
    width: '100%',
  },

  footerImageMobile: {
    height: 70,
  },

  footerImageWeb: {
    height: 120,
  },

  downloadButton: {
    marginTop: 18,
    backgroundColor: '#1F1F1F',
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
  },

  downloadButtonMobile: {
    width: '100%',
    height: 48,
    borderRadius: 12,
  },

  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    fontFamily,
  },
});

export default Grades;