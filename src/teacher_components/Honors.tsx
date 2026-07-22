import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import * as XLSX from 'xlsx';

// ✅ Reuses the same Toast component used across the app (Admin/Teacher
// screens, Community, Dashboard, ClassesScreen, SignIn) instead of the
// bespoke ToastProvider/context that used to live here, so feedback looks
// and behaves consistently everywhere.
import Toast from '../Final_Admin_Components/Toast'; // adjust path if your folder layout differs

const headerImage = require('../../assets/images/myjourney-header-template-1.png');

// REMOVED: const API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5000' : 'http://192.168.1.5:5000';

const buildSchoolYear = (startYear: string) => {
  const cleanStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
  const parsedStartYear = Number(cleanStartYear);

  if (!Number.isInteger(parsedStartYear) || cleanStartYear.length !== 4) {
    return '';
  }

  return `S.Y ${parsedStartYear} - ${parsedStartYear + 1}`;
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
  return String(value || 'file')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file';
};

const getExportTimestamp = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
};

type Student = {
  name: string;
  id: string;
  unit: string;
  gpa: string;
  section: string;
  yearLevel: string;
  grades?: {
    classId: string;
    courseCode: string;
    courseName: string;
    units: number;
    grade: number;
  }[];
};

type GeneratedSection = {
  yearLevel: string;
  sectionName: string;
  students: Student[];
};

type DropdownName = 'semester';

type DropdownProps = {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  isMobile: boolean;
};

// ─── Toast type (shared shape with SignIn / Toast component) ────────────────
type ToastType = 'success' | 'error' | 'info';

function CustomDropdown({
  value,
  options,
  onSelect,
  visible,
  onToggle,
  isMobile,
}: DropdownProps) {
  return (
    <View
      style={[
        styles.dropdownContainer,
        isMobile && styles.dropdownContainerMobile,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          isMobile && styles.dropdownButtonMobile,
        ]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownButtonText} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons
          name={visible ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#000"
        />
      </TouchableOpacity>

      {visible ? (
        <View
          style={[
            styles.inlineDropdownMenu,
            isMobile && styles.inlineDropdownMenuMobile,
          ]}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={isMobile ? styles.dropdownScrollMobile : undefined}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownItem}
                onPress={() => onSelect(option)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

type PreviewProps = {
  visible: boolean;
  onClose: () => void;
  adviser: string;
  generatedSections: GeneratedSection[];
  schoolYear: string;
  semester: string;
  isMobile: boolean;
  // ✅ Replaces the old useToast() context call — the parent screen owns the
  // single Toast instance, so this just forwards feedback up to it.
  showFeedback: (type: ToastType, title: string, message: string) => void;
};

function HonorRollPreviewModal({
  visible,
  onClose,
  adviser,
  generatedSections,
  schoolYear,
  semester,
  isMobile,
  showFeedback,
}: PreviewProps) {
  const { height } = useWindowDimensions();

  const mobileCardMaxHeight = Math.min(height * 0.68, 760);
  const mobileContentMaxHeight = Math.min(height * 0.56, 620);

  const handleGetLink = async () => {
    const generatedLink = `https://honorroll.example.com/view?sy=${encodeURIComponent(
      schoolYear
    )}&semester=${encodeURIComponent(semester)}`;

    const supported = await Linking.canOpenURL(generatedLink);

    if (supported) {
      Linking.openURL(generatedLink);
    } else {
      showFeedback('info', 'Link Generated', generatedLink);
    }
  };

  return (
    <Modal
      animationType={isMobile ? 'slide' : 'fade'}
      transparent={!isMobile}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.modalOverlay, isMobile && styles.modalOverlayMobile]}>
        <View style={[styles.previewWrapper, isMobile && styles.previewWrapperMobile]}>
          <View style={[styles.previewTopBar, isMobile && styles.previewTopBarMobile]}>
            <Text style={[styles.previewTitle, isMobile && styles.previewTitleMobile]}>
              Honor List
            </Text>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.previewCloseBtn, isMobile && styles.previewCloseBtnMobile]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.previewCloseText,
                  isMobile && styles.previewCloseTextMobile,
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.previewScrollView}
            contentContainerStyle={[
              styles.previewScrollContent,
              isMobile && styles.previewScrollContentMobile,
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {generatedSections.length === 0 ? (
              <View style={styles.previewEmptyRow}>
                <Text style={styles.previewEmptyText}>
                  No generated honor list yet.
                </Text>
              </View>
            ) : (
              generatedSections.map((section, sectionIndex) => (
                <View
                  key={`${section.sectionName}-${sectionIndex}`}
                  style={[
                    styles.previewCard,
                    isMobile && styles.previewCardMobile,
                    isMobile && { maxHeight: mobileCardMaxHeight },
                  ]}
                >
                  <Image
                    source={headerImage}
                    style={[
                      styles.previewHeaderImage,
                      { height: isMobile ? 90 : 140 }
                    ]}
                  />

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    nestedScrollEnabled
                    contentContainerStyle={{ flexGrow: 1 }}
                    style={isMobile ? { maxHeight: mobileContentMaxHeight } : undefined}
                  >
                    <View style={[styles.previewBody, isMobile && styles.previewBodyMobile]}>
                      <Text
                        style={[
                          styles.previewCongrats,
                          isMobile && styles.previewCongratsMobile,
                        ]}
                      >
                        Congratulations
                      </Text>

                      <View style={styles.previewMetaBox}>
                        <Text style={styles.previewMetaText}>
                          Section: {section.sectionName}
                        </Text>
                        <Text style={styles.previewMetaText}>Adviser: {adviser}</Text>
                        <Text style={styles.previewMetaText}>
                          Academic Year: {schoolYear}
                        </Text>
                        <Text style={styles.previewMetaText}>
                          Semester: {semester}
                        </Text>
                        <Text style={styles.previewMetaText}>
                          Total No. of Honor Students: {section.students.length}
                        </Text>
                      </View>

                      <View style={styles.previewTable}>
                        <View style={styles.previewTableHeader}>
                          <Text style={[styles.previewHeaderCell, { width: 45 }]}>
                            NO.
                          </Text>
                          <Text style={[styles.previewHeaderCell, { flex: 1 }]}>
                            NAME OF STUDENT
                          </Text>
                          <Text style={[styles.previewHeaderCell, { width: 70 }]}>
                            GWA
                          </Text>
                        </View>

                        {section.students.map((student, index) => (
                          <View key={student.id} style={styles.previewTableRow}>
                            <Text style={[styles.previewRowCell, { width: 45 }]}>
                              {index + 1}
                            </Text>
                            <Text
                              style={[styles.previewRowCell, { flex: 1 }]}
                              numberOfLines={isMobile ? 2 : 1}
                            >
                              {student.name}
                            </Text>
                            <Text style={[styles.previewRowCell, { width: 70 }]}>
                              {student.gpa}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.previewBottomAccent} />
                  </ScrollView>
                </View>
              ))
            )}

            <TouchableOpacity style={styles.getLinkBtn} onPress={handleGetLink}>
              <Text style={styles.getLinkBtnText}>Get Link</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// UPDATED: Accept apiBaseUrl as a prop
export default function HonorsScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const semesters = [
    "1st Semester",
    "2nd Semester",
  ];

  const [startYear, setStartYear] = useState('2025');
  const schoolYear = buildSchoolYear(startYear);
  const [semester, setSemester] = useState('1st Semester');
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [openDropdown, setOpenDropdown] = useState<DropdownName | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // NEW: Loading state for Download Excel button
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // ✅ Toast state — same shape/usage as SignIn, Community, Dashboard,
  // ClassesScreen, so this screen's feedback looks and behaves identically.
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Thin wrapper so every existing call site below can keep passing a
  // title alongside the message — the toast just folds them into one line.
  const showFeedback = (type: ToastType, title: string, message: string) => {
    showToast(`${title}: ${message}`, type);
  };

  const adviser = 'Tristan Mondisico';

  const handleGenerateHonorRoll = async () => {
    const normalizedStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
    const parsedStartYear = Number(normalizedStartYear);

    if (!Number.isInteger(parsedStartYear) || normalizedStartYear.length !== 4) {
      showFeedback('error', 'Invalid Start Year', 'Please enter a valid 4-digit start year. Example: 2025');
      return;
    }

    try {
      setIsGenerating(true);

      // FIXED: Correctly format the school year and log the exact URL being fetched
      const computedSchoolYear = `${normalizedStartYear}-${Number(normalizedStartYear) + 1}`;
     

      // UPDATED: Use the dynamic apiBaseUrl prop instead of the hardcoded IP
      const response = await fetch(
        `${apiBaseUrl}/honor-roll?schoolYear=${encodeURIComponent(
          computedSchoolYear
        )}&semester=${encodeURIComponent(semester)}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate honor roll.');
      }

      const orderedYearLevels = [
        'First Year',
        'Second Year',
        'Third Year',
        'Fourth Year',
        '1st Year',
        '2nd Year',
        '3rd Year',
        '4th Year',
      ];

      const orderedSections = (Array.isArray(data?.data) ? data.data : []).sort(
        (a: GeneratedSection, b: GeneratedSection) => {
          const aIndex = orderedYearLevels.indexOf(a.yearLevel);
          const bIndex = orderedYearLevels.indexOf(b.yearLevel);

          const yearCompare =
            (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);

          if (yearCompare !== 0) return yearCompare;

          return String(a.sectionName).localeCompare(String(b.sectionName));
        }
      );

      const rankedSections = orderedSections.map((section: GeneratedSection) => ({
        ...section,
        students: [...section.students].sort((a, b) => {
          const aGwa = Number(a.gpa);
          const bGwa = Number(b.gpa);

          if (Number.isFinite(aGwa) && Number.isFinite(bGwa) && aGwa !== bGwa) {
            return aGwa - bGwa;
          }

          return String(a.name).localeCompare(String(b.name));
        }),
      }));

      setGeneratedSections(rankedSections);
      setOpenDropdown(null);

      if (rankedSections.length === 0) {
        showFeedback('info', 'No Results', `No honor roll students found for ${buildSchoolYear(normalizedStartYear)} - ${semester}.`);
      }
    } catch (error: any) {
      showFeedback('error', 'Generate Failed', error?.message || 'Unable to generate honor roll.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDropdownToggle = (dropdownName: DropdownName) => {
    setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  const handleSemesterSelect = (value: string) => {
    setSemester(value);
    setOpenDropdown(null);
  };

  const buildHonorReportHtml = () => {
    const sectionBlocks = generatedSections
      .map((section) => {
        const rows = section.students
          .map(
            (student, index) => `
              <tr>
                <td class="rank">${index + 1}</td>
                <td>${escapeHtml(student.name)}</td>
                <td class="center">${escapeHtml(student.gpa)}</td>
              </tr>
            `
          )
          .join('');

        return `
          <section class="honor-section">
            <div class="section-heading">
              <div>
                <h2>HONOR LIST</h2>
                <p>${escapeHtml(section.yearLevel)} - Section ${escapeHtml(section.sectionName)}</p>
                <p>Academic Year: ${escapeHtml(schoolYear || 'S.Y ---- - ----')} | Semester: ${escapeHtml(semester)}</p>
              </div>
              <div class="count-box">
                <strong>${section.students.length}</strong>
                <span>Students</span>
              </div>
            </div>

            <div class="meta-box">
              <div><strong>Section:</strong> ${escapeHtml(section.sectionName)}</div>
              <div><strong>Adviser:</strong> ${escapeHtml(adviser)}</div>
              <div><strong>Academic Year:</strong> ${escapeHtml(schoolYear || 'S.Y ---- - ----')}</div>
              <div><strong>Semester:</strong> ${escapeHtml(semester)}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="rank">Rank</th>
                  <th>Student Name</th>
                  <th class="center">GWA</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 18mm 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              background: #fff;
            }

            .school-header {
              text-align: center;
              margin-bottom: 22px;
              line-height: 1.25;
            }

            .republic {
              font-size: 12px;
            }

            .school-name {
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }

            .campus {
              font-size: 13px;
              font-weight: 800;
            }

            .address,
            .contact {
              font-size: 9px;
            }

            .main-title {
              text-align: center;
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 1.2px;
              margin: 18px 0 4px;
            }

            .main-subtitle {
              text-align: center;
              font-size: 12px;
              font-weight: 700;
              color: #5e5650;
              margin-bottom: 16px;
            }

            .honor-section {
              page-break-inside: avoid;
              margin-bottom: 26px;
              border: 1px solid #e6e1dc;
              border-radius: 10px;
              overflow: hidden;
            }

            .section-heading {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #b71c1c;
              color: #fff;
              padding: 14px 16px;
            }

            .section-heading h2 {
              margin: 0 0 4px;
              font-size: 16px;
              letter-spacing: 0.8px;
            }

            .section-heading p {
              margin: 2px 0;
              font-size: 11px;
              font-weight: 700;
            }

            .count-box {
              width: 78px;
              min-height: 62px;
              border: 1px solid rgba(255, 255, 255, 0.65);
              border-radius: 8px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }

            .count-box strong {
              font-size: 22px;
              line-height: 1;
            }

            .count-box span {
              margin-top: 3px;
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 800;
            }

            .meta-box {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px 18px;
              padding: 12px 16px;
              background: #fffdf9;
              border-bottom: 1px solid #e6e1dc;
              font-size: 11px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th {
              background: #1f1f1f;
              color: #fff;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              padding: 10px 8px;
              border-right: 1px solid #fff;
            }

            th:last-child {
              border-right: 0;
            }

            td {
              padding: 9px 8px;
              border-top: 1px solid #dadada;
              border-right: 1px solid #dadada;
              vertical-align: middle;
            }

            td:last-child {
              border-right: 0;
            }

            .rank {
              width: 70px;
              text-align: center;
            }

            .center {
              width: 90px;
              text-align: center;
              font-weight: 900;
            }
          </style>
        </head>
        <body>
          <section class="school-header">
            <div class="republic">Republic of the Philippines</div>
            <div class="school-name">CEBU TECHNOLOGICAL UNIVERSITY</div>
            <div class="campus">ARGAO CAMPUS</div>
            <div class="address">Ed Kintanar Street, Lamacan, Argao Cebu Philippines</div>
            <div class="contact">Website: http://www.argao.ctu.edu.ph &nbsp; E-mail: ctuargao@ctu.edu.ph</div>
          </section>

          <div class="main-title">OFFICIAL HONOR LIST</div>
          <div class="main-subtitle">Academic Year ${escapeHtml(schoolYear || 'S.Y ---- - ----')} | ${escapeHtml(semester)}</div>

          ${sectionBlocks}
        </body>
      </html>
    `;
  };

  const downloadHonorPdfOnWeb = async (fileName: string) => {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const tableWidth = pageWidth - margin * 2;
    let y = 46;

    const addHeader = () => {
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Republic of the Philippines', pageWidth / 2, y, { align: 'center' });

      y += 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('CEBU TECHNOLOGICAL UNIVERSITY', pageWidth / 2, y, { align: 'center' });

      y += 13;
      doc.setFontSize(11);
      doc.text('ARGAO CAMPUS', pageWidth / 2, y, { align: 'center' });

      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Ed Kintanar Street, Lamacan, Argao Cebu Philippines', pageWidth / 2, y, { align: 'center' });

      y += 36;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('OFFICIAL HONOR LIST', pageWidth / 2, y, { align: 'center' });

      y += 16;
      doc.setFontSize(10);
      doc.text(`Academic Year ${schoolYear || 'S.Y ---- - ----'} | ${semester}`, pageWidth / 2, y, { align: 'center' });

      y += 16;
      doc.line(margin, y, pageWidth - margin, y);
      y += 24;
    };

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight <= pageHeight - 40) return;
      doc.addPage();
      y = 46;
      addHeader();
    };

    addHeader();

    generatedSections.forEach((section) => {
      ensureSpace(120);

      doc.setFillColor(183, 28, 28);
      doc.roundedRect(margin, y, tableWidth, 58, 8, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('HONOR LIST', margin + 14, y + 21);

      doc.setFontSize(9);
      doc.text(`${section.yearLevel} - Section ${section.sectionName}`, margin + 14, y + 37);
      doc.text(`Academic Year: ${schoolYear || 'S.Y ---- - ----'} | Semester: ${semester}`, margin + 14, y + 50);

      doc.setDrawColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 78, y + 10, 62, 38, 6, 6);
      doc.setFontSize(16);
      doc.text(String(section.students.length), pageWidth - margin - 47, y + 27, { align: 'center' });
      doc.setFontSize(7);
      doc.text('STUDENTS', pageWidth - margin - 47, y + 39, { align: 'center' });

      y += 72;
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(230, 225, 220);
      doc.roundedRect(margin, y - 4, tableWidth, 42, 6, 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Section:', margin + 10, y + 10);
      doc.text('Adviser:', margin + tableWidth / 2, y + 10);
      doc.text('Academic Year:', margin + 10, y + 28);
      doc.text('Semester:', margin + tableWidth / 2, y + 28);

      doc.setFont('helvetica', 'normal');
      doc.text(String(section.sectionName), margin + 62, y + 10);
      doc.text(adviser, margin + tableWidth / 2 + 54, y + 10);
      doc.text(schoolYear || 'S.Y ---- - ----', margin + 90, y + 28);
      doc.text(semester, margin + tableWidth / 2 + 62, y + 28);

      y += 54;

      const colWidths = [70, tableWidth - 70 - 90, 90];
      const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];

      const drawTableHeader = () => {
        doc.setFillColor(31, 31, 31);
        doc.rect(margin, y, tableWidth, 32, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('RANK', colX[0] + colWidths[0] / 2, y + 20, { align: 'center' });
        doc.text('STUDENT NAME', colX[1] + colWidths[1] / 2, y + 20, { align: 'center' });
        doc.text('GWA', colX[2] + colWidths[2] / 2, y + 20, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 32;
      };

      drawTableHeader();

      section.students.forEach((student, index) => {
        const nameLines = doc.splitTextToSize(student.name, colWidths[1] - 16);
        const rowHeight = Math.max(30, nameLines.length * 11 + 14);

        if (y + rowHeight > pageHeight - 40) {
          doc.addPage();
          y = 46;
          addHeader();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text(`${section.yearLevel} - Section ${section.sectionName} (continued)`, margin, y);
          y += 16;
          drawTableHeader();
        }

        doc.setDrawColor(217, 217, 217);
        doc.rect(margin, y, tableWidth, rowHeight);
        doc.line(colX[1], y, colX[1], y + rowHeight);
        doc.line(colX[2], y, colX[2], y + rowHeight);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(String(index + 1), colX[0] + colWidths[0] / 2, y + 19, { align: 'center' });
        doc.text(nameLines, colX[1] + 8, y + 19);

        doc.setFont('helvetica', 'bold');
        doc.text(String(student.gpa), colX[2] + colWidths[2] / 2, y + 19, { align: 'center' });

        y += rowHeight;
      });

      y += 26;
    });

    doc.save(fileName);
  };

  const downloadHonorPdf = async () => {
    if (generatedSections.length === 0) {
      showFeedback('error', 'No Honor List', 'Please generate the honor list first.');
      return;
    }

    const safeSchoolYear = sanitizeFileName(schoolYear.replace(/S\.?Y\.?/gi, '').trim());
    const safeSemester = sanitizeFileName(semester);
    const fileName = `honor-list-${safeSchoolYear}-${safeSemester}.pdf`;
    const html = buildHonorReportHtml();

    try {
      if (Platform.OS === 'web') {
        await downloadHonorPdfOnWeb(fileName);
        return;
      }

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          showFeedback('info', 'Cancelled', 'No folder selected.');
          return;
        }

        const base64Pdf = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const savedFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'application/pdf'
        );

        await FileSystem.writeAsStringAsync(savedFileUri, base64Pdf, {
          encoding: FileSystem.EncodingType.Base64,
        });

        showFeedback('success', 'Downloaded', 'Honor list PDF saved successfully.');
        return;
      }

      const savedUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: savedUri,
      });

      showFeedback('success', 'Downloaded', `Honor list PDF saved successfully.\n${savedUri}`);
    } catch (error: any) {
      showFeedback('error', 'Download Failed', error?.message || 'Unable to save the PDF file.');
    }
  };

  const downloadHonorExcel = async () => {
    if (generatedSections.length === 0) {
      showFeedback('error', 'No Honor List', 'Please generate the honor list first.');
      return;
    }

    setIsExportingExcel(true);
    try {
      const safeSchoolYear = sanitizeFileName(schoolYear.replace(/S\.?Y\.?/gi, '').trim());
      const safeSemester = sanitizeFileName(semester);
      const fileName = `honor-list-${safeSchoolYear}-${safeSemester}-${getExportTimestamp()}.xlsx`;

      const workbook = XLSX.utils.book_new();

      const infoRows = [
        ['Report', 'Honor List'],
        ['Academic Year', schoolYear || 'S.Y ---- - ----'],
        ['Semester', semester],
        ['Total Sections', generatedSections.length],
        [
          'Total Honor Students',
          generatedSections.reduce((total, section) => total + section.students.length, 0),
        ],
        ['Exported At', new Date().toLocaleString()],
      ];

      const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);
      infoSheet['!cols'] = [{ wch: 22 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'Honor Info');

      const summaryRows = generatedSections.map((section, index) => ({
        No: index + 1,
        'Year Level': section.yearLevel,
        Section: section.sectionName,
        'Honor Students': section.students.length,
        'Academic Year': schoolYear || 'S.Y ---- - ----',
        Semester: semester,
      }));

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Section Summary');

      const honorRows = generatedSections.flatMap((section) =>
        section.students.map((student, index) => ({
          Rank: index + 1,
          'Student ID': student.id,
          'Student Name': student.name,
          GWA: student.gpa,
          Section: section.sectionName,
          'Year Level': section.yearLevel,
          'Academic Year': schoolYear || 'S.Y ---- - ----',
          Semester: semester,
        }))
      );

      const honorSheet = XLSX.utils.json_to_sheet(honorRows);
      honorSheet['!cols'] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 32 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(workbook, honorSheet, 'Honor List');

      const courseGradeRows: any[] = generatedSections.flatMap((section) =>
        section.students.flatMap((student) => {
          if (Array.isArray(student.grades) && student.grades.length > 0) {
            return student.grades.map((grade) => ({
              'Student ID': student.id,
              'Student Name': student.name,
              GWA: student.gpa,
              Section: section.sectionName,
              'Year Level': section.yearLevel,
              'Course Code': grade.courseCode,
              'Course Name': grade.courseName,
              Units: Number(grade.units || 0),
              Grade: Number(grade.grade || 0),
            }));
          }

          return [
            {
              'Student ID': student.id,
              'Student Name': student.name,
              GWA: student.gpa,
              Section: section.sectionName,
              'Year Level': section.yearLevel,
              'Course Code': '',
              'Course Name': '',
              Units: 0,
              Grade: 0,
            },
          ];
        })
      );

      const courseGradeSheet = XLSX.utils.json_to_sheet(courseGradeRows);
      courseGradeSheet['!cols'] = [
        { wch: 18 },
        { wch: 32 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 34 },
        { wch: 10 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(workbook, courseGradeSheet, 'Course Grades');

      generatedSections.forEach((section, sectionIndex) => {
        const sectionRows = section.students.map((student, index) => ({
          Rank: index + 1,
          'Student ID': student.id,
          'Student Name': student.name,
          GWA: student.gpa,
          Section: section.sectionName,
          'Year Level': section.yearLevel,
        }));

        const sectionSheet = XLSX.utils.json_to_sheet(sectionRows);
        sectionSheet['!cols'] = [
          { wch: 8 },
          { wch: 18 },
          { wch: 32 },
          { wch: 10 },
          { wch: 18 },
          { wch: 18 },
        ];

        const safeSheetName = sanitizeFileName(
          `${section.yearLevel}-${section.sectionName}`
        ).slice(0, 24) || `Section-${sectionIndex + 1}`;

        XLSX.utils.book_append_sheet(
          workbook,
          sectionSheet,
          safeSheetName || `Section-${sectionIndex + 1}`
        );
      });

      if (Platform.OS === 'web') {
        XLSX.writeFile(workbook, fileName);
        showFeedback('success', 'Downloaded', 'Honor list Excel file downloaded successfully.');
        return;
      }

      const base64 = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
      });

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          showFeedback('info', 'Cancelled', 'No folder selected.');
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

        showFeedback('success', 'Downloaded', 'Honor list Excel file saved successfully.');
        return;
      }

      const savedUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(savedUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      showFeedback('success', 'Downloaded', `Honor list Excel file saved successfully.\n${savedUri}`);
    } catch (error: any) {
      showFeedback('error', 'Download Failed', error?.message || 'Unable to save the Excel file.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Honors</Text>

          <TouchableOpacity
            style={[
              styles.exportHonorBtn,
              isMobile && styles.exportHonorBtnMobile,
              (generatedSections.length === 0 || isExportingExcel) && styles.exportHonorBtnDisabled,
            ]}
            onPress={downloadHonorExcel}
            disabled={generatedSections.length === 0 || isExportingExcel}
            activeOpacity={0.85}
          >
            {isExportingExcel ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.exportHonorBtnText}>
              {isExportingExcel ? 'Exporting...' : 'Download Excel'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.subHeader, isMobile && styles.subHeaderMobile]}>
          <Text style={styles.mainHeading}>Honor Roll Generation</Text>
          <Text style={styles.subHeadingText}>
            Provide the academic start year and semester to generate the official list of qualified honor students.
          </Text>
        </View>

        <View style={[styles.controlsCard, isMobile && styles.controlsCardMobile]}>
          <View style={[styles.controlsRow, isMobile && styles.controlsRowMobile]}>
            {isMobile ? (
              <View style={styles.mobileDropdownRow}>
                <View style={styles.mobileDropdownItem}>
                  <Text style={styles.academicControlLabel}>Academic Start Year</Text>
                  <TextInput
                    style={[styles.startYearInput, styles.startYearInputMobile]}
                    value={startYear}
                    onChangeText={(value) => setStartYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="e.g. 2025"
                    placeholderTextColor="#8A8A8A"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <View style={[styles.schoolYearBadge, styles.schoolYearBadgeMobile]}>
                    <Text style={styles.schoolYearBadgeLabel}>Computed School Year</Text>
                    <Text style={styles.schoolYearBadgeValue}>{schoolYear || 'S.Y ---- - ----'}</Text>
                  </View>
                </View>

                <View style={styles.mobileDropdownItem}>
                  <Text style={styles.academicControlLabel}>Semester</Text>
                  <CustomDropdown
                    value={semester}
                    options={semesters}
                    onSelect={handleSemesterSelect}
                    visible={openDropdown === 'semester'}
                    onToggle={() => handleDropdownToggle('semester')}
                    isMobile={isMobile}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.academicInputGroup}>
                  <Text style={styles.academicControlLabel}>Academic Start Year</Text>
                  <TextInput
                    style={styles.startYearInput}
                    value={startYear}
                    onChangeText={(value) => setStartYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="e.g. 2025"
                    placeholderTextColor="#8A8A8A"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                <View style={styles.academicSchoolYearGroup}>
                  <Text style={styles.academicControlLabel}>School Year</Text>
                  <View style={styles.schoolYearBadge}>
                    <Text style={styles.schoolYearBadgeValue}>{schoolYear || 'S.Y ---- - ----'}</Text>
                  </View>
                </View>

                <View style={styles.academicSemesterGroup}>
                  <Text style={styles.academicControlLabel}>Semester</Text>
                  <CustomDropdown
                    value={semester}
                    options={semesters}
                    onSelect={handleSemesterSelect}
                    visible={openDropdown === 'semester'}
                    onToggle={() => handleDropdownToggle('semester')}
                    isMobile={isMobile}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.generateBtn,
                isMobile && styles.generateBtnMobile,
                isGenerating && styles.generateBtnDisabled,
              ]}
              onPress={handleGenerateHonorRoll}
              disabled={isGenerating}
            >
              <Text style={styles.generateBtnText}>
                {isGenerating ? 'Generating Honor List...' : 'Generate Honor List'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {generatedSections.length === 0 ? (
          <View style={[styles.emptyState, isMobile && styles.emptyStateMobile]}>
            <Text style={styles.emptyStateText}>
              Click Generate Honor Roll to display qualified honor students.
            </Text>
          </View>
        ) : (
          <View style={styles.honorTablesWrap}>
            {generatedSections.map((section, sectionIndex) => (
              <View
                key={`${section.yearLevel}-${section.sectionName}-${sectionIndex}`}
                style={[styles.honorSectionCard, isMobile && styles.honorSectionCardMobile]}
              >
                <View style={[styles.honorAcademicHeader, isMobile && styles.honorAcademicHeaderMobile]}>
                  <View style={styles.honorAcademicTitleWrap}>
                    <Text style={[styles.honorAcademicTitle, isMobile && styles.honorAcademicTitleMobile]}>
                      HONOR LIST
                    </Text>
                    <Text style={[styles.honorAcademicSubtitle, isMobile && styles.honorAcademicSubtitleMobile]}>
                      {section.yearLevel} — Section {section.sectionName}
                    </Text>
                    <Text style={[styles.honorAcademicMeta, isMobile && styles.honorAcademicMetaMobile]}>
                      Academic Year: {schoolYear || 'S.Y ---- - ----'} | Semester: {semester}
                    </Text>
                  </View>

                  <View style={[styles.honorCountBadge, isMobile && styles.honorCountBadgeMobile]}>
                    <Text style={styles.honorCountNumber}>{section.students.length}</Text>
                    <Text style={styles.honorCountLabel}>Students</Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={isMobile}
                  contentContainerStyle={styles.honorTableHorizontal}
                  style={styles.honorTableScroll}
                >
                  <View style={[styles.honorTable, isMobile && styles.honorTableMobile]}>
                    <View style={styles.honorTableHeader}>
                      <Text style={[styles.honorHeaderCell, { width: isMobile ? 64 : 80 }]}>Rank</Text>
                      <Text style={[styles.honorHeaderCell, styles.honorStudentNameColumn]}>
                        Student Name
                      </Text>
                      <Text style={[styles.honorHeaderCell, { width: isMobile ? 90 : 110 }]}>GWA</Text>
                    </View>

                    {section.students.map((student, index) => (
                      <View key={`${student.id}-${index}`} style={styles.honorTableRow}>
                        <Text style={[styles.honorRankCell, { width: isMobile ? 64 : 80 }]}>
                          {index + 1}
                        </Text>
                        <Text
                          style={[styles.honorNameCell, styles.honorStudentNameColumn]}
                          numberOfLines={isMobile ? 2 : 1}
                        >
                          {student.name}
                        </Text>
                        <Text style={[styles.honorGwaCell, { width: isMobile ? 90 : 110 }]}>
                          {student.gpa}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Toast — portal-based, matches SignIn/Community/Dashboard/ClassesScreen
          so feedback here looks and behaves the same as everywhere else. */}
      <Modal
        visible={toast.visible}
        transparent
        animationType="fade"
        onRequestClose={hideToast}
        statusBarTranslucent
      >
        <View style={styles.toastPortal} pointerEvents="box-none">
          <Toast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onHide={hideToast}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 40,
  },
  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
  },
  exportHonorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
  },
  exportHonorBtnMobile: {
    minHeight: 40,
    paddingHorizontal: 12,
  },
  exportHonorBtnDisabled: {
    opacity: 0.45,
  },
  exportHonorBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },
  infoIcon: {
    color: '#B71C1C',
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },

  subHeader: {
    marginTop: 15,
    marginBottom: 30,
  },
  subHeaderMobile: {
    marginTop: 12,
    marginBottom: 18,
  },
  mainHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  subHeadingText: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
    lineHeight: 20,
  },

  controlsCard: {
    marginBottom: 25,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    borderRadius: 16,
    backgroundColor: '#FFFDF9',
    zIndex: 3000,
    elevation: 0,
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  controlsCardMobile: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    flexWrap: 'wrap',
    zIndex: 3000,
    elevation: 0,
  },
  controlsRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },

  mobileDropdownRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  mobileDropdownItem: {
    flex: 1,
  },

  academicInputGroup: {
    width: 190,
  },
  academicSchoolYearGroup: {
    width: 220,
  },
  academicSemesterGroup: {
    width: 190,
    zIndex: 5000,
    elevation: 0,
  },
  academicControlLabel: {
    color: '#3B332E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 7,
    textTransform: 'uppercase',
  },

  startYearInput: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderColor: '#B8AFA7',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },
  startYearInputMobile: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  schoolYearHint: {
    marginTop: 4,
    color: '#666',
    fontSize: 11,
    lineHeight: 14,
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
    marginTop: 10,
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
  },
  schoolYearBadgeValue: {
    color: '#2D2926',
    fontSize: 14,
    fontWeight: '800',
  },

  dropdownContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 4000,
    elevation: 0,
  },
  dropdownContainerMobile: {},

  dropdownButton: {
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
  dropdownButtonMobile: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 8,
  },

  inlineDropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    overflow: 'hidden',
    zIndex: 5000,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  inlineDropdownMenuMobile: {
    top: 52,
    left: 0,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownScrollMobile: {
    maxHeight: 220,
    backgroundColor: '#FFFFFF',
  },

  dropdownItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#000',
  },

  generateBtn: {
    backgroundColor: '#B71C1C',
    minWidth: 210,
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#7F1010',
  },
  generateBtnMobile: {
    width: '100%',
    minWidth: 0,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  generateBtnDisabled: {
    opacity: 0.65,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },

  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    elevation: 0,
  },
  headerCell: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    zIndex: 1,
    elevation: 0,
  },
  cellText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '400',
  },

  openBtn: {
    backgroundColor: '#B71C1C',
    minWidth: 70,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  mobileList: {
    gap: 12,
    marginTop: 8,
  },
  mobileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mobileCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 14,
    gap: 12,
  },
  mobileInfoWrap: {
    flex: 1,
    paddingRight: 8,
  },
  mobileYearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  mobileSectionText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  mobileCountWrap: {
    minWidth: 72,
    borderRadius: 14,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  mobileCountNumber: {
    color: '#B71C1C',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  mobileCountLabel: {
    color: '#B71C1C',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  mobileOpenBtn: {
    backgroundColor: '#B71C1C',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileOpenBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    elevation: 0,
  },
  emptyStateMobile: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlayMobile: {
    backgroundColor: '#FFFFFF',
    padding: 0,
  },

  previewWrapper: {
    width: '100%',
    maxWidth: 800,
    maxHeight: '92%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewWrapperMobile: {
    flex: 1,
    maxWidth: '100%',
    maxHeight: '100%',
    height: '100%',
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
  },

  previewTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  previewTopBarMobile: {
    minHeight: 102,
    paddingTop: 70,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9E9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  previewTitleMobile: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
  },

  previewCloseBtn: {
    backgroundColor: '#B71C1C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewCloseBtnMobile: {
    minWidth: 88,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C81414',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  previewCloseText: {
    color: '#FFF',
    fontWeight: '700',
  },
  previewCloseTextMobile: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  previewScrollView: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? ({
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as any)
      : {}),
  },

  previewScrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  previewScrollContentMobile: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'stretch',
  },

  previewCard: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#E8DBC4',
    borderWidth: 3,
    borderColor: '#F0D98A',
    overflow: 'hidden',
    marginBottom: 20,
    borderRadius: 14,
    paddingTop: 10,
  },
  previewCardMobile: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 12,
  },

  previewHeaderImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
    marginTop: 20,
  },

  previewBody: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },
  previewBodyMobile: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 20,
  },

  previewCongrats: {
    textAlign: 'center',
    color: '#6b2f2f',
    fontSize: 34,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 16,
  },
  previewCongratsMobile: {
    fontSize: 28,
    marginBottom: 14,
  },

  previewMetaBox: {
    marginBottom: 12,
  },
  previewMetaText: {
    color: '#5c3a34',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },

  previewTable: {
    marginTop: 10,
  },
  previewTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e61c23',
    borderWidth: 1,
    borderColor: '#fff',
  },
  previewHeaderCell: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#fff',
    fontSize: 12,
  },
  previewTableRow: {
    flexDirection: 'row',
    backgroundColor: '#e61c23',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#fff',
  },
  previewRowCell: {
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#fff',
    fontSize: 12,
  },

  previewEmptyRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
  },
  previewEmptyText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 12,
  },

  previewBottomAccent: {
    height: 70,
    backgroundColor: '#E8DBC4',
  },

  getLinkBtn: {
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#B71C1C',
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  getLinkBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  honorTablesWrap: {
    gap: 18,
    marginTop: 8,
    paddingBottom: 30,
    width: '100%',
  },
  honorSectionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  honorSectionCardMobile: {
    padding: 14,
    borderRadius: 16,
  },
  honorAcademicHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  honorAcademicHeaderMobile: {
    alignItems: 'flex-start',
  },
  honorAcademicTitleWrap: {
    flex: 1,
  },
  honorAcademicTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  honorAcademicTitleMobile: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  honorAcademicSubtitle: {
    color: '#333',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  honorAcademicSubtitleMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  honorAcademicMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 3,
  },
  honorAcademicMetaMobile: {
    fontSize: 11,
    lineHeight: 16,
  },
  honorCountBadge: {
    minWidth: 76,
    borderRadius: 14,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  honorCountBadgeMobile: {
    minWidth: 66,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  honorCountNumber: {
    color: '#B71C1C',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  honorCountLabel: {
    color: '#B71C1C',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  honorTableScroll: {
    width: '100%',
  },
  honorTableHorizontal: {
    flexGrow: 1,
  },
  honorTable: {
    width: '100%',
    minWidth: 520,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  honorTableMobile: {
    minWidth: 360,
  },
  honorTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F3',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E7E7',
  },
  honorHeaderCell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#555',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  honorStudentNameColumn: {
    flex: 1,
    textAlign: 'center',
  },
  honorTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  honorRankCell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#B71C1C',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  honorNameCell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#111',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  honorRowCell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#111',
    fontSize: 13,
  },
  honorGwaCell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#111',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  // ✅ Toast portal — matches SignIn/Community/Dashboard/ClassesScreen; lets
  // touches pass through to whatever's behind, except the toast itself.
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
  },
});