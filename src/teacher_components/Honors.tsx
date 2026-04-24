import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
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
  useWindowDimensions,
} from 'react-native';

const headerImage = require('../../assets/images/myjourney-header-template-1.png');

const API_BASE_URL =
  Platform.OS === 'web' ? 'http://localhost:5000' : 'http://192.168.1.5:5000';

const buildSchoolYear = (startYear: string) => {
  const cleanStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
  const parsedStartYear = Number(cleanStartYear);

  if (!Number.isInteger(parsedStartYear) || cleanStartYear.length !== 4) {
    return '';
  }

  return `S.Y ${parsedStartYear} - ${parsedStartYear + 1}`;
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
};

function HonorRollPreviewModal({
  visible,
  onClose,
  adviser,
  generatedSections,
  schoolYear,
  semester,
  isMobile,
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
      Alert.alert('Link Generated', generatedLink);
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

export default function HonorsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const semesters = ['First Semester', 'Second Semester'];

  const [startYear, setStartYear] = useState('2025');
  const schoolYear = buildSchoolYear(startYear);
  const [semester, setSemester] = useState('First Semester');
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [openDropdown, setOpenDropdown] = useState<DropdownName | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const adviser = 'Tristan Mondisico';

  const handleGenerateHonorRoll = async () => {
    const normalizedStartYear = startYear.replace(/[^0-9]/g, '').slice(0, 4);
    const parsedStartYear = Number(normalizedStartYear);

    if (!Number.isInteger(parsedStartYear) || normalizedStartYear.length !== 4) {
      Alert.alert('Invalid Start Year', 'Please enter a valid 4-digit start year. Example: 2025');
      return;
    }

    try {
      setIsGenerating(true);

      const response = await fetch(
        `${API_BASE_URL}/honor-roll?startYear=${encodeURIComponent(
          normalizedStartYear
        )}&semester=${encodeURIComponent(semester)}`
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
        Alert.alert('No Results', `No honor roll students found for ${buildSchoolYear(normalizedStartYear)} - ${semester}.`);
      }
    } catch (error: any) {
      Alert.alert('Generate Failed', error?.message || 'Unable to generate honor roll.');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Honors</Text>
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
                  <Text style={styles.academicControlLabel}>Computed School Year</Text>
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

});