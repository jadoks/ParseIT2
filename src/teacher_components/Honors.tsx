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
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const headerImage = require('../../assets/images/myjourney-header-template-1.png');

type Student = {
  name: string;
  id: string;
  unit: string;
  gpa: string;
  section: string;
  yearLevel: string;
};

type GeneratedSection = {
  yearLevel: string;
  sectionName: string;
  students: Student[];
};

type DropdownName = 'schoolYear' | 'semester';

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

  const academicYears = [
    'S.Y 2023 - 2024',
    'S.Y 2024 - 2025',
    'S.Y 2025 - 2026',
    'S.Y 2026 - 2027',
  ];

  const semesters = ['First Semester', 'Second Semester', 'Summer'];

  const [schoolYear, setSchoolYear] = useState('S.Y 2025 - 2026');
  const [semester, setSemester] = useState('First Semester');
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<GeneratedSection | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownName | null>(null);

  const adviser = 'Tristan Mondisico';

  const allStudents: Student[] = [
    { name: 'Alvarez, Tangal', id: '1', unit: '25', gpa: '1.500', section: '1A', yearLevel: 'First Year' },
    { name: 'Almonia, Emo Cyril', id: '2', unit: '24', gpa: '1.520', section: '1A', yearLevel: 'First Year' },
    { name: 'Rivera, Hannah', id: '3', unit: '23', gpa: '1.410', section: '1B', yearLevel: 'First Year' },
    { name: 'Dela Cruz, Joshua', id: '4', unit: '25', gpa: '1.780', section: '1B', yearLevel: 'First Year' },

    { name: 'Sarmiento, Jade Anne', id: '5', unit: '26', gpa: '1.430', section: '2A', yearLevel: 'Second Year' },
    { name: 'Reyes, Mark Daniel', id: '6', unit: '25', gpa: '1.610', section: '2A', yearLevel: 'Second Year' },
    { name: 'Torres, Angela Mae', id: '7', unit: '23', gpa: '1.720', section: '2B', yearLevel: 'Second Year' },
    { name: 'Lopez, Maria', id: '8', unit: '24', gpa: '1.400', section: '2B', yearLevel: 'Second Year' },

    { name: 'Santos, Kevin', id: '9', unit: '22', gpa: '1.300', section: '3A', yearLevel: 'Third Year' },
    { name: 'Garcia, Nina', id: '10', unit: '23', gpa: '1.650', section: '3A', yearLevel: 'Third Year' },
    { name: 'Fernandez, Carlo', id: '11', unit: '24', gpa: '1.890', section: '3B', yearLevel: 'Third Year' },
    { name: 'Mendoza, Claire', id: '12', unit: '25', gpa: '1.550', section: '3B', yearLevel: 'Third Year' },

    { name: 'Aquino, Paolo', id: '13', unit: '21', gpa: '1.600', section: '4A', yearLevel: 'Fourth Year' },
    { name: 'Gonzales, Bea', id: '14', unit: '24', gpa: '1.450', section: '4A', yearLevel: 'Fourth Year' },
    { name: 'Villanueva, Sean', id: '15', unit: '23', gpa: '1.700', section: '4B', yearLevel: 'Fourth Year' },
    { name: 'Navarro, Kate', id: '16', unit: '24', gpa: '1.320', section: '4B', yearLevel: 'Fourth Year' },
  ];

  const handleGenerateHonorRoll = () => {
    const groupedMap: Record<string, GeneratedSection> = {};

    allStudents
      .filter((student) => Number(student.gpa) <= 2.0)
      .forEach((student) => {
        const key = `${student.yearLevel}-${student.section}`;

        if (!groupedMap[key]) {
          groupedMap[key] = {
            yearLevel: student.yearLevel,
            sectionName: student.section,
            students: [],
          };
        }

        groupedMap[key].students.push(student);
      });

    const orderedYearLevels = [
      'First Year',
      'Second Year',
      'Third Year',
      'Fourth Year',
    ];

    const orderedSections = Object.values(groupedMap).sort((a, b) => {
      const yearCompare =
        orderedYearLevels.indexOf(a.yearLevel) - orderedYearLevels.indexOf(b.yearLevel);

      if (yearCompare !== 0) return yearCompare;

      return a.sectionName.localeCompare(b.sectionName);
    });

    setGeneratedSections(orderedSections);
    setSelectedSection(null);
    setPreviewVisible(false);
    setOpenDropdown(null);

    if (orderedSections.length === 0) {
      Alert.alert('No Results', 'No honor roll students found.');
    }
  };

  const handleOpenHonorList = (section: GeneratedSection) => {
    setSelectedSection(section);
    setPreviewVisible(true);
  };

  const handleDropdownToggle = (dropdownName: DropdownName) => {
    setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  const handleSchoolYearSelect = (value: string) => {
    setSchoolYear(value);
    setOpenDropdown(null);
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
          <Text style={styles.mainHeading}>Generate Honor Roll</Text>
          <Text style={styles.subHeadingText}>
            Automatically generate honor roll by section and year level
          </Text>
        </View>

        <View style={[styles.controlsCard, isMobile && styles.controlsCardMobile]}>
          <View style={[styles.controlsRow, isMobile && styles.controlsRowMobile]}>
            {isMobile ? (
              <View style={styles.mobileDropdownRow}>
                <View style={styles.mobileDropdownItem}>
                  <CustomDropdown
                    value={schoolYear}
                    options={academicYears}
                    onSelect={handleSchoolYearSelect}
                    visible={openDropdown === 'schoolYear'}
                    onToggle={() => handleDropdownToggle('schoolYear')}
                    isMobile={isMobile}
                  />
                </View>

                <View style={styles.mobileDropdownItem}>
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
                <View style={{ width: 170 }}>
                  <CustomDropdown
                    value={schoolYear}
                    options={academicYears}
                    onSelect={handleSchoolYearSelect}
                    visible={openDropdown === 'schoolYear'}
                    onToggle={() => handleDropdownToggle('schoolYear')}
                    isMobile={isMobile}
                  />
                </View>

                <View style={{ width: 160 }}>
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
              style={[styles.generateBtn, isMobile && styles.generateBtnMobile]}
              onPress={handleGenerateHonorRoll}
            >
              <Text style={styles.generateBtnText}>Generate Honor Roll</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 1.2 }]}>Year Level</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Section</Text>
            <Text style={[styles.headerCell, { flex: 1.2 }]}>Honor Students</Text>
            <Text style={[styles.headerCell, { width: 100, textAlign: 'center' }]}>
              Action
            </Text>
          </View>
        )}

        {generatedSections.length === 0 ? (
          <View style={[styles.emptyState, isMobile && styles.emptyStateMobile]}>
            <Text style={styles.emptyStateText}>
              Click Generate Honor Roll to display each level and section.
            </Text>
          </View>
        ) : isMobile ? (
          <View style={styles.mobileList}>
            {generatedSections.map((item, index) => (
              <View key={`${item.sectionName}-${index}`} style={styles.mobileCard}>
                <View style={styles.mobileCardTop}>
                  <View style={styles.mobileInfoWrap}>
                    <Text style={styles.mobileYearText}>{item.yearLevel}</Text>
                    <Text style={styles.mobileSectionText}>Section {item.sectionName}</Text>
                  </View>

                  <View style={styles.mobileCountWrap}>
                    <Text style={styles.mobileCountNumber}>{item.students.length}</Text>
                    <Text style={styles.mobileCountLabel}>Honors</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.mobileOpenBtn}
                  onPress={() => handleOpenHonorList(item)}
                >
                  <Text style={styles.mobileOpenBtnText}>Open Honor List</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          generatedSections.map((item, index) => (
            <View key={`${item.sectionName}-${index}`} style={styles.tableRow}>
              <Text style={[styles.cellText, { flex: 1.2 }]}>
                {item.yearLevel}
              </Text>
              <Text style={[styles.cellText, { flex: 1 }]}>
                {item.sectionName}
              </Text>
              <Text style={[styles.cellText, { flex: 1.2 }]}>
                {item.students.length}
              </Text>

              <View style={{ width: 100, alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => handleOpenHonorList(item)}
                >
                  <Text style={styles.openBtnText}>Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <HonorRollPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        adviser={adviser}
        generatedSections={selectedSection ? [selectedSection] : []}
        schoolYear={schoolYear}
        semester={semester}
        isMobile={isMobile}
      />
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
    zIndex: 3000,
    elevation: 0,
  },
  controlsCardMobile: {
    marginBottom: 18,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
    flexWrap: 'wrap',
    zIndex: 3000,
    elevation: 0,
  },
  controlsRowMobile: {
    flexDirection: 'column',
    gap: 12,
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

  dropdownContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 4000,
    elevation: 0,
  },
  dropdownContainerMobile: {},

  dropdownButton: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
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
    fontSize: 12,
    color: '#000',
    flexShrink: 1,
    marginRight: 8,
  },

  inlineDropdownMenu: {
    position: 'absolute',
    top: 44,
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
    minWidth: 190,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtnMobile: {
    width: '100%',
    minWidth: 0,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
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
});