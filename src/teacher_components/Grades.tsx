import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS } from '../theme/typography';

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

// The grade report can be looked up two ways: by the student's exact ID, or
// by last name — which can legitimately match several students (siblings,
// common surnames), so the lookup keeps a list and lets the user switch
// between the matches and pick which ones to export.
//
// There is a single "STUDENT ID / LAST NAME" input, so the lookup type is
// decided by the FIRST character typed:
//   - a digit  -> Student ID   (digits only, e.g. "20210123")
//   - a letter -> Last Name    (letters and spaces only, e.g. "Dela Cruz")
//   - anything else (space, symbol) as the first character is rejected.
// Once the first character picks the mode, characters that don't belong to
// that mode are dropped as the user types (or pastes).
type SearchMode = 'studentId' | 'lastName';

// Basic Latin + Latin-1 letters, so names such as "Muñoz" or "Ibañez" work.
const LETTER_CHAR = 'A-Za-zÀ-ÖØ-öø-ÿ';
const FIRST_LETTER_REGEX = new RegExp(`^[${LETTER_CHAR}]`);
const NON_LAST_NAME_CHARS_REGEX = new RegExp(`[^${LETTER_CHAR} ]`, 'g');

const sanitizeSearchInput = (value: string): string => {
  const first = value.charAt(0);

  if (/\d/.test(first)) {
    return value.replace(/\D/g, '');
  }

  if (FIRST_LETTER_REGEX.test(first)) {
    return value.replace(NON_LAST_NAME_CHARS_REGEX, '').replace(/ {2,}/g, ' ');
  }

  // Empty, or the first character is a space / special character.
  return '';
};

const detectSearchMode = (value: string): SearchMode =>
  /^\d/.test(value) ? 'studentId' : 'lastName';

type InlineDropdownProps = {
  options: string[];
  selectedValue: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  fullWidth?: boolean;
  width?: number;
  isPhone?: boolean;
  label?: string;
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
  label,
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

      {/* 🔥 Small screen: options open in a real top-level Modal (bottom
          sheet), same as Honors.tsx. The inline absolutely-positioned
          version sits inside the screen's ScrollView, which can clip/cover
          it on small screens so it isn't reliably tappable. A Modal renders
          above the entire app, so it's always on top and always tappable. */}
      {isPhone ? (
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={onToggle}
          statusBarTranslucent
        >
          <TouchableOpacity
            style={styles.dropdownModalOverlay}
            activeOpacity={1}
            onPress={onToggle}
          >
            {/* Swallow taps on the sheet itself so they don't close the modal */}
            <TouchableOpacity
              style={styles.dropdownModalSheet}
              activeOpacity={1}
              onPress={() => {}}
            >
              <View style={styles.dropdownModalHandle} />

              <View style={styles.dropdownModalHeader}>
                <Text style={styles.dropdownModalTitle}>
                  {label || 'Select an option'}
                </Text>
                <TouchableOpacity onPress={onToggle} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#3B332E" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.dropdownModalScroll}
                showsVerticalScrollIndicator={false}
              >
                {options.map((option) => {
                  const isSelected = option === selectedValue;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownModalItem,
                        isSelected && styles.dropdownModalItemSelected,
                      ]}
                      onPress={() => onSelect(option)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dropdownModalItemText,
                          isSelected && styles.dropdownModalItemTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color="#8B0000" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : (
        isOpen && (
          <View style={styles.dropdownMenu}>
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
        )
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
  // 🔥 NEW: on phone and tablet, the Student Info panel (Student ID, Student
  // Name, Total Units, GWA) should show 2 fields per row instead of one
  // full-width field per row.
  const isCompactInfoPanel = isPhone || isTablet;

  const contentHorizontalPadding = isPhone ? 16 : isTablet ? 28 : 150;
  const titleSize = isPhone ? 22 : isTablet ? 24 : 28;

  const mobileReportWidth = Math.max(320, width - 32);
  // 🔥 FIX: this used to be a hardcoded 940, so on any layout narrower than
  // that (e.g. now that the page content sits inside the padded gradesCard)
  // the header image, title block, student info panel, and table were all
  // forced wider than the reportCard actually had room for — cutting off
  // the right edge (the FINAL GRADE column, footer logos, etc.) with no way
  // to scroll to it. Measuring the reportCard's real rendered width via
  // onLayout and capping the ideal 940 to whatever space it actually has
  // keeps everything inside the visible card at every screen size.
  const [reportCardWidth, setReportCardWidth] = useState(0);
  const reportCardHorizontalPadding = isLargeScreen ? 24 : 20;
  const webTableWidth =
    reportCardWidth > 0
      ? Math.min(940, reportCardWidth - reportCardHorizontalPadding * 2)
      : 940;
  const mobileTableMinWidth = 640;

  // Single input for both lookups — see detectSearchMode().
  const [searchQuery, setSearchQuery] = useState('');
  const [startYear, setStartYear] = useState('2025');
  const [selectedSemester, setSelectedSemester] = useState('First Semester');
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [showGrades, setShowGrades] = useState(false);
  // A Student ID lookup yields exactly one record; a last-name lookup can
  // yield many. Both funnel into this list so the rest of the screen only
  // ever deals with "the records I loaded" + "the one I'm looking at".
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [activeRecordIndex, setActiveRecordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState('');

  // Excel export picker (only reachable when a last-name search returned
  // more than one student).
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const studentRecord = records[activeRecordIndex] || null;
  const hasMultipleRecords = records.length > 1;

  const schoolYear = useMemo(() => buildSchoolYear(startYear), [startYear]);

  const resetResults = () => {
    setShowGrades(false);
    setRecords([]);
    setActiveRecordIndex(0);
    setShowExportPicker(false);
    setSelectedExportIds([]);
  };

  const closeDropdowns = () => {
    if (openDropdown !== null) {
      setOpenDropdown(null);
    }
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(sanitizeSearchInput(value));
  };

  const handleStartYearChange = (value: string) => {
    setStartYear(value.replace(/[^0-9]/g, '').slice(0, 4));
  };

  // Shared shaping so an ID lookup and a last-name lookup produce identical
  // StudentRecord objects for the report/export code below.
  const buildStudentRecord = (
    rawSubjects: any[],
    fallbackId: string,
    fallbackName: string | null,
    normalizedStartYear: string,
    serverTotalUnits?: number,
    serverGwa?: number
  ): StudentRecord => {
    const gradeItems: GradeItem[] = (rawSubjects || []).map((item: any) => ({
      code: String(item.subjectCode || 'N/A'),
      desc: String(item.subjectTitle || 'Unknown Subject'),
      unit: Number(item.units || 0),
      grade: Number(item.grade || 0),
    }));

    gradeItems.sort((a, b) => a.code.localeCompare(b.code));

    const totalUnits =
      serverTotalUnits || gradeItems.reduce((sum, item) => sum + item.unit, 0);

    return {
      studentId: fallbackId,
      fullName: fallbackName || fallbackId,
      schoolYear: buildSchoolYear(normalizedStartYear),
      semester: selectedSemester,
      grades: gradeItems,
      totalUnits,
      gwa: serverGwa || 0,
    };
  };

  const loadStudentGradesFromDatabase = async () => {
    const trimmedQuery = searchQuery.trim();
    const trimmedId = trimmedQuery;
    const trimmedLastName = trimmedQuery;
    const isLastNameSearch = detectSearchMode(trimmedQuery) === 'lastName';
    const normalizedStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
    const parsedStartYear = Number(normalizedStartYear);

    if (!trimmedQuery) {
      Alert.alert(
        'Missing Student ID / Last Name',
        "Please enter the student's ID or last name."
      );
      resetResults();
      setNotFound(false);
      return;
    }

    if (!Number.isInteger(parsedStartYear) || normalizedStartYear.length !== 4) {
      Alert.alert('Invalid Start Year', 'Please enter a valid 4-digit academic start year. Example: 2025');
      resetResults();
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

      const endpoint = isLastNameSearch
        ? `${apiBaseUrl}/student-grade/parse-by-lastname/${encodeURIComponent(trimmedLastName)}?${params.toString()}`
        : `${apiBaseUrl}/student-grade/parse/${encodeURIComponent(trimmedId)}?${params.toString()}`;

      const response = await fetch(endpoint, { credentials: 'include' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load parsed grades.');
      }

      // ── Last name: zero, one, or many students ──────────────────────────
      if (isLastNameSearch) {
        const matchedStudents = Array.isArray(data.students) ? data.students : [];

        if (!data.success || matchedStudents.length === 0) {
          resetResults();
          setNotFoundMessage(
            data?.message ||
              `No uploaded/parsed grades found for students with the last name "${trimmedLastName}" in ${buildSchoolYear(normalizedStartYear)} - ${selectedSemester}.`
          );
          setNotFound(true);
          return;
        }

        const nextRecords = matchedStudents
          .map((student: any) =>
            buildStudentRecord(
              student.data,
              String(student.studentId || ''),
              student.studentName || null,
              normalizedStartYear,
              student.totalUnits,
              student.gwa
            )
          )
          .filter((record: StudentRecord) => record.grades.length > 0);

        if (nextRecords.length === 0) {
          resetResults();
          setNotFoundMessage(
            `No uploaded/parsed grades found for students with the last name "${trimmedLastName}" in ${buildSchoolYear(normalizedStartYear)} - ${selectedSemester}.`
          );
          setNotFound(true);
          return;
        }

        setRecords(nextRecords);
        setActiveRecordIndex(0);
        setSelectedExportIds(nextRecords.map((record: StudentRecord) => record.studentId));
        setNotFound(false);
        setShowGrades(true);
        return;
      }

      // ── Student ID: single record ───────────────────────────────────────
      if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
        resetResults();
        setNotFoundMessage(
          `No uploaded/parsed grades found for ${buildSchoolYear(normalizedStartYear)} - ${selectedSemester}.`
        );
        setNotFound(true);
        return;
      }

      const record = buildStudentRecord(
        data.data,
        trimmedId,
        data.studentName || null,
        normalizedStartYear,
        data.totalUnits,
        data.gwa
      );

      setRecords([record]);
      setActiveRecordIndex(0);
      setSelectedExportIds([record.studentId]);
      setNotFound(false);
      setShowGrades(true);
    } catch (error: any) {
      Alert.alert('Load Failed', error?.message || 'Unable to load student grades.');
      resetResults();
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

            .gwa { color: #8B0000; }

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
              background: #8B0000;
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

  // Excel sheet names are capped at 31 chars and must be unique inside a
  // workbook, so multi-student exports get a deduped, trimmed name per tab.
  const buildUniqueSheetName = (base: string, used: Set<string>) => {
    let candidate = (base || 'Sheet').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
      const tag = ` (${suffix})`;
      candidate = `${candidate.slice(0, 31 - tag.length)}${tag}`;
      suffix += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  };

  const buildGradeRows = (record: StudentRecord) =>
    record.grades.map((item, index) => ({
      No: index + 1,
      'Course Code': item.code,
      'Course Detail': item.desc,
      Units: Number(item.unit.toFixed(1)),
      'Final Grade': Number(formatGrade(item.grade)),
    }));

  const gradesSheetColumnWidths = [
    { wch: 6 },
    { wch: 16 },
    { wch: 48 },
    { wch: 10 },
    { wch: 14 },
  ];

  const exportRecordsToExcel = async (exportRecords: StudentRecord[]) => {
    if (!exportRecords.length) {
      Alert.alert('No Report', 'Please select at least one student to export.');
      return;
    }

    const isBatch = exportRecords.length > 1;
    const firstRecord = exportRecords[0];
    const safeSchoolYear = sanitizeFileName(firstRecord.schoolYear.replace(/S\.?Y\.?/gi, '').trim());
    const safeSemester = sanitizeFileName(firstRecord.semester);
    const fileName = isBatch
      ? `grade-reports-${sanitizeFileName(searchQuery.trim() || 'students')}-${exportRecords.length}-students-${safeSchoolYear}-${safeSemester}-${getExportTimestamp()}.xlsx`
      : `grade-report-${sanitizeFileName(firstRecord.studentId)}-${safeSchoolYear}-${safeSemester}-${getExportTimestamp()}.xlsx`;

    try {
      setIsExporting(true);
      const workbook = XLSX.utils.book_new();
      const usedSheetNames = new Set<string>();

      if (isBatch) {
        // One overview tab listing every exported student, then one detail
        // tab per student.
        const overviewRows = exportRecords.map((record, index) => ({
          No: index + 1,
          'Student ID': record.studentId,
          'Student Name': record.fullName,
          'Academic Year': record.schoolYear,
          Semester: record.semester,
          'Total Units': Number(record.totalUnits.toFixed(1)),
          GWA: Number(formatGrade(record.gwa)),
        }));

        const overviewSheet = XLSX.utils.json_to_sheet(overviewRows);
        overviewSheet['!cols'] = [
          { wch: 6 },
          { wch: 16 },
          { wch: 32 },
          { wch: 18 },
          { wch: 18 },
          { wch: 12 },
          { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(
          workbook,
          overviewSheet,
          buildUniqueSheetName('All Students', usedSheetNames)
        );

        exportRecords.forEach((record) => {
          const sheet = XLSX.utils.json_to_sheet(buildGradeRows(record));
          sheet['!cols'] = gradesSheetColumnWidths;
          XLSX.utils.book_append_sheet(
            workbook,
            sheet,
            buildUniqueSheetName(`${record.studentId} ${record.fullName}`, usedSheetNames)
          );
        });
      } else {
        const summaryRows = [
          ['Student ID', firstRecord.studentId],
          ['Student Name', firstRecord.fullName],
          ['Academic Year', firstRecord.schoolYear],
          ['Semester', firstRecord.semester],
          ['Total Units', Number(firstRecord.totalUnits.toFixed(1))],
          ['GWA', Number(formatGrade(firstRecord.gwa))],
          ['Exported At', new Date().toLocaleString()],
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        summarySheet['!cols'] = [{ wch: 18 }, { wch: 42 }];
        XLSX.utils.book_append_sheet(
          workbook,
          summarySheet,
          buildUniqueSheetName('Student Summary', usedSheetNames)
        );

        const gradesSheet = XLSX.utils.json_to_sheet(buildGradeRows(firstRecord));
        gradesSheet['!cols'] = gradesSheetColumnWidths;
        XLSX.utils.book_append_sheet(
          workbook,
          gradesSheet,
          buildUniqueSheetName('Grades', usedSheetNames)
        );
      }

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
    } finally {
      setIsExporting(false);
    }
  };

  // Single result → download straight away. Several results → let the user
  // pick which students go into the workbook first.
  const handleDownloadPress = () => {
    if (!records.length) {
      Alert.alert('No Report', 'Please view a grade report first.');
      return;
    }
    if (!hasMultipleRecords) {
      void exportRecordsToExcel(records);
      return;
    }
    setSelectedExportIds(
      selectedExportIds.length ? selectedExportIds : records.map((record) => record.studentId)
    );
    setShowExportPicker(true);
  };

  const toggleExportSelection = (id: string) => {
    setSelectedExportIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
    );
  };

  const allExportSelected = records.length > 0 && selectedExportIds.length === records.length;

  const toggleSelectAllExports = () => {
    setSelectedExportIds(allExportSelected ? [] : records.map((record) => record.studentId));
  };

  const confirmExportSelection = async () => {
    const chosen = records.filter((record) => selectedExportIds.includes(record.studentId));
    if (!chosen.length) {
      Alert.alert('Nothing Selected', 'Select at least one student to include in the Excel file.');
      return;
    }
    setShowExportPicker(false);
    await exportRecordsToExcel(chosen);
  };

  const exportCurrentRecordOnly = async () => {
    if (!studentRecord) return;
    setShowExportPicker(false);
    await exportRecordsToExcel([studentRecord]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.flexOne}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isPhone ? styles.scrollContentMobile : styles.scrollContentDesktop,
          ]}
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
            {/* 🔥 NEW: title/subtitle, the filter controls, and the results
                area (no-grade placeholder or the generated grade report) now
                all share one outer white card. */}
            <View style={styles.gradesCard}>
            <View style={[styles.headerBlock, isPhone && styles.headerBlockMobile]}>
              <Text style={[styles.mainTitle, { fontSize: titleSize }]}>Grades</Text>
              <Text style={styles.subTitle}>
                View the official academic grade report from uploaded records.
              </Text>
            </View>

            <View style={[styles.controlsCard, isPhone && styles.controlsCardMobile]}>
              <Text style={styles.controlsTitle}>Academic Record Lookup</Text>
              <Text style={styles.controlsSubtitle}>
                Enter a Student ID or last name, then set the academic start year and
                semester to retrieve grades.
              </Text>

              {isStackedLayout ? (
                <View style={styles.stackedControls}>
                  <View style={styles.academicFieldFull}>
                    <Text style={styles.academicLabel}>STUDENT ID / LAST NAME</Text>
                    <TextInput
                      placeholder="Enter Student ID or Last Name"
                      placeholderTextColor="#8A8A8A"
                      value={searchQuery}
                      onChangeText={handleSearchQueryChange}
                      style={[styles.mainInputFull, isPhone && styles.mainInputMobile]}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="search"
                      onSubmitEditing={handleShowJourney}
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
                      label="Select Semester"
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
                        View Grade Report
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.controlsGrid}>
                  <View style={[styles.controlsGridRow, styles.controlsGridRowTop]}>
                    <View style={styles.academicField}>
                      <Text style={styles.academicLabel}>STUDENT ID / LAST NAME</Text>
                      <TextInput
                        placeholder="Enter Student ID or Last Name"
                        placeholderTextColor="#8A8A8A"
                        value={searchQuery}
                        onChangeText={handleSearchQueryChange}
                        style={styles.mainInput}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={handleShowJourney}
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
                        isPhone={isPhone}
                        label="Select Semester"
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
                          View Grade Report
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {notFound && (
              <View style={styles.centeredResultWrapper}>
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

            {/* Several students share the searched last name — list them all
                and let the user flip between their reports. */}
            {showGrades && hasMultipleRecords && (
              <View style={styles.matchesPanel}>
                <View style={styles.matchesHeaderRow}>
                  <Ionicons name="people-outline" size={16} color="#6B0F1A" />
                  <Text style={styles.matchesTitle}>
                    {records.length} students matched "{searchQuery.trim()}"
                  </Text>
                </View>
                <Text style={styles.matchesSubtitle}>
                  Select a student to view their report. Download Excel lets you export one,
                  several, or all of them.
                </Text>
                <View style={styles.matchesList}>
                  {records.map((record, index) => {
                    const isActive = index === activeRecordIndex;
                    return (
                      <TouchableOpacity
                        key={record.studentId || `${record.fullName}-${index}`}
                        onPress={() => setActiveRecordIndex(index)}
                        style={[styles.matchCard, isActive && styles.matchCardActive]}
                        activeOpacity={0.85}
                      >
                        <View style={styles.matchCardTextBlock}>
                          <Text
                            style={[styles.matchCardName, isActive && styles.matchCardNameActive]}
                            numberOfLines={1}
                          >
                            {record.fullName}
                          </Text>
                          <Text
                            style={[styles.matchCardMeta, isActive && styles.matchCardMetaActive]}
                            numberOfLines={1}
                          >
                            ID {record.studentId} | GWA {formatGrade(record.gwa)}
                          </Text>
                        </View>
                        {isActive && (
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {showGrades && studentRecord && (
              <View style={styles.centeredResultWrapper}>
              <View
                style={[
                  isPhone
                    ? [styles.mobileReportCard, { width: mobileReportWidth }]
                    : [styles.reportCard, isLargeScreen && styles.reportCardLarge],
                ]}
                onLayout={(e) => setReportCardWidth(e.nativeEvent.layout.width)}
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
                    isCompactInfoPanel && styles.studentInfoPanelCompact,
                    isLargeScreen && styles.studentInfoPanelLarge,
                  ]}
                >
                  <View style={[
                    styles.studentInfoRow,
                    isPhone && styles.studentInfoRowMobile,
                    isCompactInfoPanel && styles.studentInfoRowCompact,
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
                    isCompactInfoPanel && styles.studentInfoRowCompact,
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
                    isCompactInfoPanel && styles.studentInfoRowCompact,
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
                    isCompactInfoPanel && styles.studentInfoRowCompact,
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
                  style={[
                    styles.downloadButton,
                    isPhone && styles.downloadButtonMobile,
                    isExporting && styles.downloadButtonDisabled,
                  ]}
                  onPress={handleDownloadPress}
                  disabled={isExporting}
                  activeOpacity={0.85}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.downloadButtonText}>
                    {isExporting
                      ? 'Preparing Excel...'
                      : hasMultipleRecords
                        ? 'Download Excel...'
                        : 'Download Excel'}
                  </Text>
                </TouchableOpacity>

              </View>
            </View>
            )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Excel export picker — only used when a last-name search returned
          more than one student. */}
      <Modal
        visible={showExportPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportPicker(false)}
      >
        <View style={styles.exportModalOverlay}>
          <View
            style={[
              styles.exportModalCard,
              isPhone ? styles.exportModalCardMobile : styles.exportModalCardWeb,
            ]}
          >
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalHeaderText}>
                <Text style={styles.exportModalTitle}>Download Excel</Text>
                <Text style={styles.exportModalSubtitle}>
                  Choose which students to include in the workbook.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowExportPicker(false)}
                style={styles.exportModalClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#4A4A4A" />
              </TouchableOpacity>
            </View>

            <View style={styles.exportQuickRow}>
              <TouchableOpacity
                onPress={toggleSelectAllExports}
                style={styles.exportQuickButton}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={allExportSelected ? 'remove-circle-outline' : 'checkmark-done-outline'}
                  size={15}
                  color="#6B0F1A"
                />
                <Text style={styles.exportQuickButtonText}>
                  {allExportSelected ? 'Clear All' : `Select All (${records.length})`}
                </Text>
              </TouchableOpacity>

              {!!studentRecord && (
                <TouchableOpacity
                  onPress={exportCurrentRecordOnly}
                  style={styles.exportQuickButton}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-outline" size={15} color="#6B0F1A" />
                  <Text style={styles.exportQuickButtonText}>Current Student Only</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.exportList} contentContainerStyle={styles.exportListContent}>
              {records.map((record, index) => {
                const isChecked = selectedExportIds.includes(record.studentId);
                return (
                  <TouchableOpacity
                    key={record.studentId || `${record.fullName}-${index}`}
                    onPress={() => toggleExportSelection(record.studentId)}
                    style={[styles.exportRow, isChecked && styles.exportRowChecked]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isChecked ? '#6B0F1A' : '#9A9A9A'}
                    />
                    <View style={styles.exportRowTextBlock}>
                      <Text style={styles.exportRowName} numberOfLines={1}>
                        {record.fullName}
                      </Text>
                      <Text style={styles.exportRowMeta} numberOfLines={1}>
                        ID {record.studentId} | {record.totalUnits.toFixed(1)} units | GWA{' '}
                        {formatGrade(record.gwa)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.exportFooter}>
              <Text style={styles.exportFooterCount}>
                {selectedExportIds.length} of {records.length} selected
              </Text>
              <View style={styles.exportFooterButtons}>
                <TouchableOpacity
                  onPress={() => setShowExportPicker(false)}
                  style={styles.exportCancelButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.exportCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmExportSelection}
                  style={[
                    styles.exportConfirmButton,
                    (!selectedExportIds.length || isExporting) && styles.exportConfirmButtonDisabled,
                  ]}
                  disabled={!selectedExportIds.length || isExporting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.exportConfirmButtonText}>
                    {selectedExportIds.length > 1
                      ? `Download ${selectedExportIds.length} Reports`
                      : 'Download Report'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexOne: { flex: 1 },

  // ── Last-name match list ──────────────────────────────────────────────────
  matchesPanel: {
    width: '100%',
    maxWidth: 980,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E5EA',
    backgroundColor: '#FAFBFC',
  },
  matchesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchesTitle: {
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#1A1A1A',
    fontFamily,
  },
  matchesSubtitle: {
    fontSize: 12.5,
    color: '#5A5A5A',
    marginTop: 4,
    lineHeight: 18,
    fontFamily,
  },
  matchesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 210,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E5EA',
    backgroundColor: '#FFFFFF',
  },
  matchCardActive: {
    backgroundColor: '#6B0F1A',
    borderColor: '#6B0F1A',
  },
  matchCardTextBlock: { flex: 1 },
  matchCardName: {
    fontSize: 13.5,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#1A1A1A',
    fontFamily,
  },
  matchCardNameActive: { color: '#FFFFFF' },
  matchCardMeta: {
    fontSize: 11.5,
    color: '#6A6A6A',
    marginTop: 2,
    fontFamily,
  },
  matchCardMetaActive: { color: '#F0DADD' },

  // ── Excel export picker modal ─────────────────────────────────────────────
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  exportModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    maxHeight: '85%',
  },
  exportModalCardWeb: { width: 520 },
  exportModalCardMobile: { width: '100%' },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  exportModalHeaderText: { flex: 1 },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#111',
    fontFamily,
  },
  exportModalSubtitle: {
    fontSize: 12.5,
    color: '#5A5A5A',
    marginTop: 3,
    lineHeight: 18,
    fontFamily,
  },
  exportModalClose: {
    padding: 4,
  },
  exportQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  exportQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E3C9CD',
    backgroundColor: '#FBF4F5',
  },
  exportQuickButtonText: {
    fontSize: 12,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#6B0F1A',
    fontFamily,
  },
  exportList: {
    marginTop: 12,
    maxHeight: 320,
  },
  exportListContent: {
    gap: 8,
    paddingVertical: 2,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E5EA',
    backgroundColor: '#FFFFFF',
  },
  exportRowChecked: {
    borderColor: '#D8B4BA',
    backgroundColor: '#FCF6F7',
  },
  exportRowTextBlock: { flex: 1 },
  exportRowName: {
    fontSize: 13.5,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#1A1A1A',
    fontFamily,
  },
  exportRowMeta: {
    fontSize: 11.5,
    color: '#6A6A6A',
    marginTop: 2,
    fontFamily,
  },
  exportFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
    gap: 10,
  },
  exportFooterCount: {
    fontSize: 12,
    color: '#6A6A6A',
    fontFamily,
  },
  exportFooterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  exportCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DADADA',
    backgroundColor: '#FFFFFF',
  },
  exportCancelButtonText: {
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#444',
    fontFamily,
  },
  exportConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#6B0F1A',
  },
  exportConfirmButtonDisabled: { opacity: 0.55 },
  exportConfirmButtonText: {
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#FFFFFF',
    fontFamily,
  },
  downloadButtonDisabled: { opacity: 0.6 },

  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  scrollContent: {
    paddingBottom: 60,
    flexGrow: 1,
  },

  // 🔥 NEW: top padding above the outer gradesCard, matching the page-level
  // paddingTop used in Honors.tsx's content/contentMobile styles.
  scrollContentDesktop: {
    paddingTop: 30,
  },
  scrollContentMobile: {
    paddingTop: 18,
  },

  leftAlignWrapper: {
    alignItems: 'flex-start',
    overflow: 'visible',
    zIndex: 5000,
  },

  // 🔥 NEW: outer white card wrapping the title/subtitle, the filter
  // controls, and the results area (no-grade placeholder or the generated
  // grade report) as one shared section.
  gradesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E5EA',
    borderRadius: 24,
    padding: 20,
    width: '100%',
  },

  headerBlock: {
    marginBottom: 26,
  },

  headerBlockMobile: {
    marginBottom: 18,
  },

  mainTitle: {
    fontWeight: WEIGHT_EMPHASIS,
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
    borderColor: '#E2E5EA',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
    fontWeight: WEIGHT_EMPHASIS,
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
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.4,
    marginBottom: 7,
    textTransform: 'uppercase',
    fontFamily,
  },

  schoolYearBadge: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  schoolYearBadgeMobile: {
    minHeight: 52,
    borderRadius: 16,
  },

  schoolYearBadgeLabel: {
    color: '#7A6E66',
    fontSize: 10,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.35,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontFamily,
  },

  schoolYearBadgeValue: {
    color: '#2D2926',
    fontSize: 14,
    fontWeight: WEIGHT_EMPHASIS,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE1E6',
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
    borderRadius: 16,
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

  // 🔥 NEW: Small-screen "Select Semester" bottom-sheet Modal — matches the
  // one in Honors.tsx. Rendered by RN's Modal component, so it always sits
  // above the screen's ScrollView / cards, fixing the dropdown being
  // un-tappable on small screens.
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  dropdownModalSheet: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },

  dropdownModalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD6CE',
    marginBottom: 12,
  },

  dropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE4',
  },

  dropdownModalTitle: {
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#3B332E',
    fontFamily,
  },

  dropdownModalScroll: {
    maxHeight: 320,
  },

  dropdownModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
  },

  dropdownModalItemSelected: {
    backgroundColor: '#F7EDED',
  },

  dropdownModalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    fontFamily,
  },

  dropdownModalItemTextSelected: {
    color: '#8B0000',
    fontWeight: WEIGHT_EMPHASIS,
  },

  mainInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#B8AFA7',
    borderRadius: 16,
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
    borderRadius: 16,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#FFF',
    fontWeight: '700',
    fontFamily,
  },

  mainInputMobile: { fontFamily: FONT_BODY,
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 15,
  },

  journeyButton: {
    minWidth: 220,
    backgroundColor: '#8B0000',
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#5A0000',
  },

  journeyButtonFull: {
    width: '100%',
    backgroundColor: '#8B0000',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#5A0000',
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
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    fontFamily,
  },

  journeyButtonTextMobile: { fontFamily: FONT_BODY,
    fontSize: 13,
  },

  centeredResultWrapper: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
    elevation: 0,
  },

  noGradeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E5EA',
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
    fontWeight: WEIGHT_EMPHASIS,
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
    borderBottomColor: '#E2E5EA',
    paddingBottom: 12,
  },

  reportTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: WEIGHT_EMPHASIS,
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
    borderColor: '#E2E5EA',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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

  // 🔥 NEW: phone + tablet layout — lays the 4 fields out 2-per-row instead
  // of one full-width field per row. Only rowGap is used (for spacing
  // between wrapped rows) — horizontal spacing comes from justifyContent:
  // 'space-between', since combining that with a horizontal gap plus
  // percentage widths can overflow by a few px on narrow screens (e.g.
  // 375px iPhone SE) and force an early wrap.
  studentInfoPanelCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  // 🔥 NEW: each field takes ~47% width (not 48%) so two sit side by side
  // per row with a safety margin — avoids rounding/overflow on narrow
  // screens that would otherwise push the second item to a new line.
  studentInfoRowCompact: {
    width: '47%',
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
    fontWeight: WEIGHT_EMPHASIS,
    textTransform: 'uppercase',
    fontFamily,
  },

  studentInfoValue: {
    color: '#111',
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    textAlign: 'right',
    flex: 1,
    fontFamily,
  },

  // NEW: Mobile-specific value styling (Left-aligned for vertical stack)
  studentInfoValueMobile: { fontFamily: FONT_BODY,
    textAlign: 'left',
    fontSize: 14,
    width: '100%',
    flex: 0, // Prevents vertical stretching in column layout
  },

  gwaValue: {
    color: '#8B0000',
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
    borderRadius: 14,
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B0000',
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
    backgroundColor: '#8B0000',
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
    fontWeight: WEIGHT_EMPHASIS,
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily,
  },

  mobileHeaderText: { fontFamily: FONT_TITLE,
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

  mobileCellText: { fontFamily: FONT_BODY,
    fontSize: 11,
    paddingHorizontal: 5,
  },

  centerText: {
    textAlign: 'center',
  },

  gradeText: {
    fontWeight: WEIGHT_EMPHASIS,
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
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
  },

  downloadButtonMobile: {
    width: '100%',
    height: 48,
    borderRadius: 16,
  },

  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    fontFamily,
  },
});

export default Grades;